<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
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
        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'invoice_date' => 'required|date',
            'due_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.unit' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0',
            'items.*.price' => 'required|numeric|min:0',
        ]);

        $lastInvoice = $request->user()->invoices()->orderBy('number', 'desc')->first();
        $nextNumber = $lastInvoice ? $lastInvoice->number + 1 : 1;

        $invoice = $request->user()->invoices()->create([
            'series' => 'INV',
            'number' => $nextNumber,
            'client_id' => $request->client_id,
            'invoice_date' => $request->invoice_date,
            'due_date' => $request->due_date,
            'notes' => $request->notes,
            'total' => 0,
        ]);

        $total = 0;
        foreach ($request->items as $item) {
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
    }

    public function show(Request $request, Invoice $invoice)
    {
        $this->authorize('view', $invoice);
        return $invoice->load('client', 'items');
    }

    public function update(Request $request, Invoice $invoice)
    {
        $this->authorize('update', $invoice);

        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'invoice_date' => 'required|date',
            'due_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.unit' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0',
            'items.*.price' => 'required|numeric|min:0',
        ]);

        $invoice->update([
            'client_id' => $request->client_id,
            'invoice_date' => $request->invoice_date,
            'due_date' => $request->due_date,
            'notes' => $request->notes,
        ]);

        $invoice->items()->delete();

        $total = 0;
        foreach ($request->items as $item) {
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
    }

    public function destroy(Request $request, Invoice $invoice)
    {
        $this->authorize('delete', $invoice);

        $invoice->items()->delete();
        $invoice->delete();

        return response()->json(['message' => 'Invoice deleted']);
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

        $pdf = Pdf::loadView('invoice', ['invoice' => $invoice]);

        return $pdf->download("invoice-{$invoice->series}-{$invoice->number}.pdf");
    }
}
