<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\TimeEntry;
use App\Support\Audit;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = $request->user()->invoices()->with('client');

        if ($request->has('month') && $request->month) {
            // Half-open range on the raw column so the (user_id, invoice_date)
            // index is usable — whereYear()/whereMonth() wrap the column in a
            // function and force a full scan + filesort.
            $date = Carbon::createFromFormat('Y-m', $request->month)->startOfMonth();
            $query->where('invoice_date', '>=', $date->toDateString())
                  ->where('invoice_date', '<', $date->copy()->addMonth()->toDateString());
        }

        if ($request->has('client_id') && $request->client_id) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('series', 'like', "%{$search}%")
                  ->orWhere('number', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%")
                  ->orWhereHas('client', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
            });
        }

        // Whitelist the sort column/direction — an arbitrary $sort_by would
        // throw a DB error (leaking schema when APP_DEBUG is on) and an invalid
        // direction would break the query.
        $sortBy = $request->get('sort_by', 'invoice_date');
        $allowedSorts = ['invoice_date', 'due_date', 'number', 'total', 'status', 'created_at', 'client_name'];
        if (!in_array($sortBy, $allowedSorts, true)) {
            $sortBy = 'invoice_date';
        }
        $sortDir = strtolower($request->get('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        if ($sortBy === 'client_name') {
            $query->join('clients', 'invoices.client_id', '=', 'clients.id')
                  ->orderBy('clients.name', $sortDir)
                  ->select('invoices.*');
        } else {
            $query->orderBy($sortBy, $sortDir);
        }

        // Clamp per_page so a request can't ask for an unbounded page size.
        $perPage = min(max((int) $request->get('per_page', 10), 1), 100);

        return $query->paginate($perPage);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'client_id' => [
                'required',
                'exists:clients,id',
                function ($attribute, $value, $fail) use ($user) {
                    if (!$user->clients()->where('id', $value)->exists()) {
                        $fail('Invalid client.');
                    }
                },
            ],
            'invoice_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:invoice_date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string|max:500',
            'items.*.unit' => 'required|string|max:20',
            'items.*.quantity' => 'required|numeric|min:0.01|max:999999',
            'items.*.price' => 'required|numeric|min:0|max:999999',
        ]);

        return DB::transaction(function () use ($user, $validated) {
            $series = $user->invoice_series ?? 'INV';
            // Row-locked allocation so concurrent creates can't reuse a number.
            $nextNumber = $user->allocateInvoiceNumber();

            $invoice = $user->invoices()->create([
                'series' => $series,
                'number' => $nextNumber,
                'client_id' => $validated['client_id'],
                'invoice_date' => $validated['invoice_date'],
                'due_date' => $validated['due_date'],
                'notes' => $validated['notes'] ?? null,
                'total' => 0,
                // New invoices default to "sent" — they're created to be issued.
                'status' => 'sent',
            ]);

            $total = 0;
            foreach ($validated['items'] as $item) {
                $itemTotal = $item['quantity'] * $item['price'];
                $total += $itemTotal;

                $invoice->items()->create([
                    'description' => $item['description'],
                    'unit' => $item['unit'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'total' => $itemTotal,
                ]);
            }

            $invoice->update(['total' => $total]);

            Audit::log('invoice.created', [
                'subject' => $invoice,
                'description' => "Created invoice {$series}-{$nextNumber}",
                'meta' => ['total' => $total, 'client_id' => $invoice->client_id],
            ]);

            return $invoice->load('client', 'items');
        });
    }

    public function show(Request $request, Invoice $invoice)
    {
        if ($invoice->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found'], 404);
        }
        return $invoice->load('client', 'items');
    }

    public function update(Request $request, Invoice $invoice)
    {
        if ($invoice->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $user = $request->user();

        $validated = $request->validate([
            'client_id' => [
                'required',
                'exists:clients,id',
                function ($attribute, $value, $fail) use ($user) {
                    if (!$user->clients()->where('id', $value)->exists()) {
                        $fail('Invalid client.');
                    }
                },
            ],
            'invoice_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:invoice_date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string|max:500',
            'items.*.unit' => 'required|string|max:20',
            'items.*.quantity' => 'required|numeric|min:0.01|max:999999',
            'items.*.price' => 'required|numeric|min:0|max:999999',
        ]);

        return DB::transaction(function () use ($invoice, $validated) {
            $invoice->update([
                'client_id' => $validated['client_id'],
                'invoice_date' => $validated['invoice_date'],
                'due_date' => $validated['due_date'],
                'notes' => $validated['notes'] ?? null,
            ]);

            $invoice->items()->delete();

            $total = 0;
            foreach ($validated['items'] as $item) {
                $itemTotal = $item['quantity'] * $item['price'];
                $total += $itemTotal;

                $invoice->items()->create([
                    'description' => $item['description'],
                    'unit' => $item['unit'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'total' => $itemTotal,
                ]);
            }

            $invoice->update(['total' => $total]);

            Audit::log('invoice.updated', [
                'subject' => $invoice,
                'description' => "Updated invoice {$invoice->series}-{$invoice->number}",
                'meta' => ['total' => $total],
            ]);

            return $invoice->load('client', 'items');
        });
    }

    public function destroy(Request $request, Invoice $invoice)
    {
        if ($invoice->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $label = "{$invoice->series}-{$invoice->number}";
        $invoiceId = $invoice->id;

        DB::transaction(function () use ($invoice) {
            $invoice->items()->delete();
            $invoice->delete();
        });

        Audit::log('invoice.deleted', [
            'subject_type' => Invoice::class,
            'subject_id' => $invoiceId,
            'description' => "Deleted invoice {$label}",
        ]);

        return response()->json(['message' => 'Invoice deleted']);
    }

    public function months(Request $request)
    {
        $months = $request->user()->invoices()
            ->selectRaw("DISTINCT DATE_FORMAT(invoice_date, '%Y-%m') as month")
            ->orderBy('month', 'desc')
            ->pluck('month');

        return response()->json($months);
    }

    public function updateStatus(Request $request, $id)
    {
        $invoice = Invoice::find($id);

        if (!$invoice || $invoice->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $validated = $request->validate([
            'status' => 'required|in:draft,sent,paid,overdue'
        ]);

        $oldStatus = $invoice->status;
        $invoice->update(['status' => $validated['status']]);

        Audit::log('invoice.status_changed', [
            'subject' => $invoice,
            'description' => "Invoice {$invoice->series}-{$invoice->number}: {$oldStatus} → {$validated['status']}",
            'meta' => ['from' => $oldStatus, 'to' => $validated['status']],
        ]);

        return $invoice->load('client', 'items');
    }

    public function samplePdf(Request $request)
    {
        $user = $request->user();
        $template = $request->query('template', $user->invoice_template ?? 'classic');

        $invoice = new \stdClass();
        $invoice->series = 'INV';
        $invoice->number = 1;
        $invoice->invoice_date = \Carbon\Carbon::now();
        $invoice->due_date = \Carbon\Carbon::now()->addDays(30);
        $invoice->total = 1850.00;
        $invoice->notes = 'Thank you for your business!';

        $invoice->user = new \stdClass();
        $invoice->user->name = $user->name ?: 'John Doe';
        $invoice->user->company_code = $user->company_code ?: 'IVP-123456';
        $invoice->user->vat_code = $user->vat_code ?: '';
        $invoice->user->address = $user->address ?: 'Vilnius, Lietuva';
        $invoice->user->phone = $user->phone ?: '+370 600 12345';
        $invoice->user->bank_name = $user->bank_name ?: 'Swedbank';
        $invoice->user->bank_account = $user->bank_account ?: 'LT12 7300 0101 2345 6789';
        $invoice->user->signature = $user->signature;

        $invoice->client = new \stdClass();
        $invoice->client->name = 'UAB "Sample Client"';
        $invoice->client->company_code = '301234567';
        $invoice->client->vat_code = 'LT100001234567';
        $invoice->client->address = 'Gedimino pr. 1, Vilnius';
        $invoice->client->phone = '+370 600 98765';

        $item1 = new \stdClass();
        $item1->description = 'Website development & design';
        $item1->unit = 'val.';
        $item1->quantity = 40;
        $item1->price = 35.00;
        $item1->total = 1400.00;

        $item2 = new \stdClass();
        $item2->description = 'SEO optimization';
        $item2->unit = 'vnt.';
        $item2->quantity = 1;
        $item2->price = 250.00;
        $item2->total = 250.00;

        $item3 = new \stdClass();
        $item3->description = 'Hosting setup & configuration';
        $item3->unit = 'vnt.';
        $item3->quantity = 1;
        $item3->price = 200.00;
        $item3->total = 200.00;

        $invoice->items = collect([$item1, $item2, $item3]);

        $viewName = match($template) {
            'minimal' => 'invoice-minimal',
            'modern' => 'invoice-modern',
            default => 'invoice',
        };

        $pdf = Pdf::loadView($viewName, ['invoice' => $invoice]);

        return $pdf->stream("sample-{$template}.pdf");
    }

    public function pdf(Request $request, Invoice $invoice)
    {
        $user = $request->user();
        if ($invoice->user_id !== $user->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $invoice->load(['user', 'client', 'items']);

        $template = $request->query('template', $user->invoice_template ?? 'classic');
        $viewName = match($template) {
            'minimal' => 'invoice-minimal',
            'modern' => 'invoice-modern',
            default => 'invoice',
        };

        $pdf = Pdf::loadView($viewName, ['invoice' => $invoice]);

        if ($request->query('download')) {
            return $pdf->download("invoice-{$invoice->series}-{$invoice->number}.pdf");
        }

        return $pdf->stream("invoice-{$invoice->series}-{$invoice->number}.pdf");
    }

    public function unpaid(Request $request)
    {
        $invoices = $request->user()->invoices()
            ->with('client')
            ->where('status', '!=', 'paid')
            ->orderBy('due_date', 'asc')
            ->get();

        return response()->json($invoices);
    }

    /**
     * Returns invoices that contain hour-based items (unit matches common hour notations),
     * with computed total/worked/remaining hours from linked time entries.
     * Used in time-tracking page when marking entry as "already invoiced".
     */
    public function trackable(Request $request)
    {
        $user = $request->user();
        $clientId = $request->get('client_id');

        $query = $user->invoices()->with(['client', 'items'])->orderBy('invoice_date', 'desc');
        if ($clientId) {
            $query->where('client_id', $clientId);
        }

        $invoices = $query->get();

        // Sum tracked seconds per invoice in one query
        $workedByInvoice = TimeEntry::whereIn('invoice_id', $invoices->pluck('id'))
            ->selectRaw('invoice_id, SUM(duration_seconds) as total_seconds')
            ->groupBy('invoice_id')
            ->pluck('total_seconds', 'invoice_id');

        // Match common hourly unit variants (Lithuanian and English forms)
        $hourUnits = ['val.', 'val', 'h', 'hr', 'hrs', 'hour', 'hours'];

        $result = $invoices->map(function ($invoice) use ($workedByInvoice, $hourUnits) {
            $totalHours = (float) $invoice->items
                ->filter(fn ($i) => in_array(strtolower($i->unit), $hourUnits, true))
                ->sum('quantity');
            if ($totalHours <= 0) {
                return null;
            }
            $workedSeconds = (int) ($workedByInvoice[$invoice->id] ?? 0);
            $workedHours = round($workedSeconds / 3600, 2);

            return [
                'id' => $invoice->id,
                'series' => $invoice->series,
                'number' => $invoice->number,
                'client_id' => $invoice->client_id,
                'client' => $invoice->client,
                'status' => $invoice->status,
                'invoice_date' => $invoice->invoice_date,
                'total_hours' => round($totalHours, 2),
                'worked_hours' => $workedHours,
                'remaining_hours' => round(max(0, $totalHours - $workedHours), 2),
            ];
        })->filter()->values();

        return response()->json($result);
    }

    /**
     * Per-client billing history for the invoice form: the distinct line items
     * this client has been billed before (with their most recent price, so the
     * 11 €/12 € difference between clients is preserved) plus a few recent
     * invoices. Lets the user pick from history instead of re-typing everything.
     */
    public function clientHistory(Request $request)
    {
        $user = $request->user();
        $clientId = (int) $request->get('client_id');

        if (!$clientId || !$user->clients()->where('id', $clientId)->exists()) {
            return response()->json(['message' => 'Invalid client.'], 422);
        }

        // Every line item ever billed to this client, newest invoice first.
        $rows = InvoiceItem::query()
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->where('invoices.user_id', $user->id)
            ->where('invoices.client_id', $clientId)
            ->orderBy('invoices.invoice_date', 'desc')
            ->orderBy('invoice_items.id', 'desc')
            ->get([
                'invoice_items.description',
                'invoice_items.unit',
                'invoice_items.price',
                'invoices.invoice_date',
            ]);

        // Collapse to distinct description+unit. Because rows are newest-first,
        // the first time we see a key its price is the most recent one used.
        $seen = [];
        foreach ($rows as $row) {
            $key = mb_strtolower(trim($row->description)) . '|' . mb_strtolower(trim($row->unit));
            if (!isset($seen[$key])) {
                $seen[$key] = [
                    'description' => $row->description,
                    'unit' => $row->unit,
                    'price' => (float) $row->price,
                    'last_used' => $row->invoice_date,
                    'count' => 0,
                ];
            }
            $seen[$key]['count']++;
        }

        $items = array_values($seen);
        // Most-used first, so the everyday service floats to the top.
        usort($items, fn ($a, $b) => $b['count'] <=> $a['count']);

        $recentInvoices = $user->invoices()
            ->where('client_id', $clientId)
            ->orderBy('invoice_date', 'desc')
            ->limit(5)
            ->get(['id', 'series', 'number', 'invoice_date', 'total', 'status']);

        return response()->json([
            'items' => $items,
            'invoices' => $recentInvoices,
        ]);
    }

    public function bulkDelete(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        $deleted = $request->user()->invoices()
            ->whereIn('id', $validated['ids'])
            ->get();

        DB::transaction(function () use ($deleted) {
            foreach ($deleted as $invoice) {
                $invoice->items()->delete();
                $invoice->delete();
            }
        });

        Audit::log('invoice.bulk_deleted', [
            'description' => $deleted->count() . ' invoice(s) deleted',
            'meta' => ['ids' => $deleted->pluck('id')->all()],
        ]);

        return response()->json(['message' => $deleted->count() . ' invoice(s) deleted']);
    }

    public function bulkUpdateStatus(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
            'status' => 'required|in:draft,sent,paid,overdue',
        ]);

        $updated = $request->user()->invoices()
            ->whereIn('id', $validated['ids'])
            ->update(['status' => $validated['status']]);

        Audit::log('invoice.bulk_status', [
            'description' => "{$updated} invoice(s) set to {$validated['status']}",
            'meta' => ['ids' => $validated['ids'], 'status' => $validated['status']],
        ]);

        return response()->json(['message' => $updated . ' invoice(s) updated']);
    }

    public function duplicate(Request $request, Invoice $invoice)
    {
        if ($invoice->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $user = $request->user();

        return DB::transaction(function () use ($user, $invoice) {
            $series = $user->invoice_series ?? 'INV';
            // Row-locked allocation so concurrent creates can't reuse a number.
            $nextNumber = $user->allocateInvoiceNumber();

            $newInvoice = $user->invoices()->create([
                'series' => $series,
                'number' => $nextNumber,
                'client_id' => $invoice->client_id,
                'invoice_date' => now()->toDateString(),
                'due_date' => now()->addDays(14)->toDateString(),
                'notes' => $invoice->notes,
                'total' => $invoice->total,
                'status' => 'draft',
            ]);

            foreach ($invoice->items as $item) {
                $newInvoice->items()->create([
                    'description' => $item->description,
                    'unit' => $item->unit,
                    'quantity' => $item->quantity,
                    'price' => $item->price,
                    'total' => $item->total,
                ]);
            }

            Audit::log('invoice.duplicated', [
                'subject' => $newInvoice,
                'description' => "Duplicated {$invoice->series}-{$invoice->number} → {$series}-{$nextNumber}",
                'meta' => ['source_id' => $invoice->id],
            ]);

            return $newInvoice->load('client', 'items');
        });
    }
}
