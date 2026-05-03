<?php

namespace App\Http\Controllers;

use App\Models\TimeEntry;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TimeEntryController extends Controller
{
    public function index(Request $request)
    {
        $query = $request->user()->timeEntries()->with('client', 'invoice');

        if ($request->has('client_id') && $request->client_id) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->has('invoiced')) {
            if ($request->invoiced === 'true') {
                $query->where('is_invoiced', true);
            } else {
                // "Not invoiced" view also shows prepaid (active SF) entries
                // because they're still being worked on
                $query->where(function ($q) {
                    $q->where('is_invoiced', false)
                      ->orWhere('is_prepaid', true);
                });
            }
        }

        if ($request->has('month') && $request->month) {
            $date = Carbon::createFromFormat('Y-m', $request->month);
            $query->whereYear('started_at', $date->year)
                  ->whereMonth('started_at', $date->month);
        }

        return response()->json(
            $query->orderBy('created_at', 'desc')->get()
        );
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
            'description' => 'required|string|max:500',
            'hourly_rate' => 'required|numeric|min:0',
            'duration_seconds' => 'nullable|integer|min:0',
            'is_prepaid' => 'nullable|boolean',
            'invoice_id' => [
                'nullable',
                'integer',
                function ($attribute, $value, $fail) use ($user) {
                    if ($value && !$user->invoices()->where('id', $value)->exists()) {
                        $fail('Invalid invoice.');
                    }
                },
            ],
        ]);

        $isPrepaid = !empty($validated['is_prepaid']) && !empty($validated['invoice_id']);
        $invoiceId = $isPrepaid ? $validated['invoice_id'] : null;

        $entry = $user->timeEntries()->create([
            'client_id' => $validated['client_id'],
            'description' => $validated['description'],
            'hourly_rate' => $validated['hourly_rate'],
            'duration_seconds' => $validated['duration_seconds'] ?? 0,
            'is_prepaid' => $isPrepaid,
            'is_invoiced' => $isPrepaid,
            'invoice_id' => $invoiceId,
        ]);

        return response()->json($entry->load('client', 'invoice'), 201);
    }

    public function update(Request $request, TimeEntry $timeEntry)
    {
        if ($timeEntry->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        // Don't allow editing converted (non-prepaid) invoiced entries
        if ($timeEntry->is_invoiced && !$timeEntry->is_prepaid) {
            return response()->json(['message' => 'Cannot edit converted entry'], 400);
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
            'description' => 'required|string|max:500',
            'hourly_rate' => 'required|numeric|min:0',
            'duration_seconds' => 'nullable|integer|min:0',
            'is_prepaid' => 'nullable|boolean',
            'invoice_id' => [
                'nullable',
                'integer',
                function ($attribute, $value, $fail) use ($user) {
                    if ($value && !$user->invoices()->where('id', $value)->exists()) {
                        $fail('Invalid invoice.');
                    }
                },
            ],
        ]);

        $isPrepaid = !empty($validated['is_prepaid']) && !empty($validated['invoice_id']);
        $invoiceId = $isPrepaid ? $validated['invoice_id'] : null;

        $timeEntry->update([
            'client_id' => $validated['client_id'],
            'description' => $validated['description'],
            'hourly_rate' => $validated['hourly_rate'],
            'duration_seconds' => $validated['duration_seconds'] ?? $timeEntry->duration_seconds,
            'is_prepaid' => $isPrepaid,
            'is_invoiced' => $isPrepaid,
            'invoice_id' => $invoiceId,
        ]);

        return response()->json($timeEntry->load('client', 'invoice'));
    }

    public function destroy(Request $request, TimeEntry $timeEntry)
    {
        if ($timeEntry->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $timeEntry->delete();

        return response()->json(['message' => 'Time entry deleted']);
    }

    public function addTime(Request $request, TimeEntry $timeEntry)
    {
        if ($timeEntry->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        if ($timeEntry->is_running) {
            return response()->json(['message' => 'Cannot add time to a running entry'], 400);
        }

        $validated = $request->validate([
            'minutes' => 'required|integer|min:1',
        ]);

        $timeEntry->update([
            'duration_seconds' => $timeEntry->duration_seconds + ($validated['minutes'] * 60),
        ]);

        return response()->json($timeEntry->load('client', 'invoice'));
    }

    public function start(Request $request, TimeEntry $timeEntry)
    {
        if ($timeEntry->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        // Stop any other running timers for this user
        $request->user()->timeEntries()
            ->where('is_running', true)
            ->where('id', '!=', $timeEntry->id)
            ->each(function ($entry) {
                $elapsed = (int) abs(now()->diffInSeconds($entry->started_at));
                $entry->update([
                    'is_running' => false,
                    'ended_at' => now(),
                    'duration_seconds' => $entry->duration_seconds + $elapsed,
                ]);
            });

        $timeEntry->update([
            'is_running' => true,
            'started_at' => now(),
        ]);

        return response()->json($timeEntry->load('client', 'invoice'));
    }

    public function stop(Request $request, TimeEntry $timeEntry)
    {
        if ($timeEntry->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        if (!$timeEntry->is_running) {
            return response()->json(['message' => 'Timer is not running'], 400);
        }

        $validated = $request->validate([
            'duration_minutes' => 'nullable|numeric|min:0',
        ]);

        if (isset($validated['duration_minutes'])) {
            $newDuration = $timeEntry->duration_seconds + (int) ceil($validated['duration_minutes'] * 60);
        } else {
            $elapsed = (int) abs(now()->diffInSeconds($timeEntry->started_at));
            $newDuration = $timeEntry->duration_seconds + $elapsed;
        }

        $timeEntry->update([
            'is_running' => false,
            'ended_at' => now(),
            'duration_seconds' => $newDuration,
        ]);

        return response()->json($timeEntry->load('client', 'invoice'));
    }

    public function running(Request $request)
    {
        $entry = $request->user()->timeEntries()
            ->with('client', 'invoice')
            ->where('is_running', true)
            ->first();

        return response()->json($entry);
    }

    public function convertToInvoice(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'time_entry_ids' => 'required|array|min:1',
            'time_entry_ids.*' => 'integer',
            'invoice_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:invoice_date',
            'notes' => 'nullable|string',
        ]);

        $entries = $user->timeEntries()
            ->whereIn('id', $validated['time_entry_ids'])
            ->where('is_invoiced', false)
            ->where('is_running', false)
            ->get();

        if ($entries->isEmpty()) {
            return response()->json(['message' => 'No valid time entries found'], 400);
        }

        $clientIds = $entries->pluck('client_id')->unique();
        if ($clientIds->count() > 1) {
            return response()->json(['message' => 'All time entries must belong to the same client'], 400);
        }

        $clientId = $clientIds->first();

        return DB::transaction(function () use ($user, $entries, $validated, $clientId) {
            $series = $user->invoice_series ?? 'INV';
            $nextNumber = $user->next_invoice_number ?? 1;

            $invoice = $user->invoices()->create([
                'series' => $series,
                'number' => $nextNumber,
                'client_id' => $clientId,
                'invoice_date' => $validated['invoice_date'],
                'due_date' => $validated['due_date'],
                'notes' => $validated['notes'] ?? null,
                'total' => 0,
                'status' => 'draft',
            ]);

            $user->update(['next_invoice_number' => $nextNumber + 1]);

            $total = 0;
            foreach ($entries as $entry) {
                $hours = round($entry->duration_seconds / 3600, 2);
                $itemTotal = $hours * $entry->hourly_rate;
                $total += $itemTotal;

                $invoice->items()->create([
                    'description' => $entry->description,
                    'unit' => 'val.',
                    'quantity' => $hours,
                    'price' => $entry->hourly_rate,
                    'total' => $itemTotal,
                ]);

                $entry->update([
                    'is_invoiced' => true,
                    'invoice_id' => $invoice->id,
                ]);
            }

            $invoice->update(['total' => $total]);

            return $invoice->load('client', 'items');
        });
    }

    public function bulkDelete(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        $deleted = $request->user()->timeEntries()
            ->whereIn('id', $validated['ids'])
            ->where('is_running', false)
            ->delete();

        return response()->json(['message' => $deleted . ' time entry(ies) deleted']);
    }
}
