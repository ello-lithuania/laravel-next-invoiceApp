<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
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
            $date = Carbon::createFromFormat('Y-m', $request->month);
            $query->whereYear('invoice_date', $date->year)
                  ->whereMonth('invoice_date', $date->month);
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

        $sortBy = $request->get('sort_by', 'invoice_date');
        $sortDir = $request->get('sort_dir', 'desc');

        if ($sortBy === 'client_name') {
            $query->join('clients', 'invoices.client_id', '=', 'clients.id')
                  ->orderBy('clients.name', $sortDir)
                  ->select('invoices.*');
        } else {
            $query->orderBy($sortBy, $sortDir);
        }

        $perPage = $request->get('per_page', 10);

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
            $nextNumber = $user->next_invoice_number ?? 1;

            $invoice = $user->invoices()->create([
                'series' => $series,
                'number' => $nextNumber,
                'client_id' => $validated['client_id'],
                'invoice_date' => $validated['invoice_date'],
                'due_date' => $validated['due_date'],
                'notes' => $validated['notes'] ?? null,
                'total' => 0,
                'status' => 'draft',
            ]);

            $user->update(['next_invoice_number' => $nextNumber + 1]);

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

            return $invoice->load('client', 'items');
        });
    }

    public function destroy(Request $request, Invoice $invoice)
    {
        if ($invoice->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        DB::transaction(function () use ($invoice) {
            $invoice->items()->delete();
            $invoice->delete();
        });

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

        $invoice->update(['status' => $validated['status']]);

        return $invoice->load('client', 'items');
    }

    public function samplePdf(Request $request)
    {
        $token = $request->query('token');
        if (!$token) {
            return response()->json(['message' => 'Token required'], 401);
        }

        $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
        if (!$accessToken) {
            return response()->json(['message' => 'Invalid token'], 401);
        }

        $user = $accessToken->tokenable;
        $template = $request->query('template', $user->invoice_template ?? 'classic');

        // Build dummy invoice object
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
        $token = $request->query('token');
        if (!$token) {
            return response()->json(['message' => 'Token required'], 401);
        }

        $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
        if (!$accessToken) {
            return response()->json(['message' => 'Invalid token'], 401);
        }

        $user = $accessToken->tokenable;
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
            $nextNumber = $user->next_invoice_number ?? 1;

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

            $user->update(['next_invoice_number' => $nextNumber + 1]);

            foreach ($invoice->items as $item) {
                $newInvoice->items()->create([
                    'description' => $item->description,
                    'unit' => $item->unit,
                    'quantity' => $item->quantity,
                    'price' => $item->price,
                    'total' => $item->total,
                ]);
            }

            return $newInvoice->load('client', 'items');
        });
    }
}
