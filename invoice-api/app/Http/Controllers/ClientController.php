<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Support\Audit;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        // has_uncollectible flags clients with a written-off invoice so the UI
        // can mark them red ("won't pay — don't bother chasing").
        $query = $request->user()->clients()
            ->withExists(['invoices as has_uncollectible' => fn ($q) => $q->where('status', 'uncollectible')])
            ->orderBy('name');

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('company_code', 'like', "%{$search}%")
                  ->orWhere('vat_code', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Paginated mode (when per_page is provided) — used by clients page
        if ($request->has('per_page')) {
            $perPage = (int) $request->get('per_page', 10);
            return $query->paginate($perPage);
        }

        // Legacy: return all clients (used by invoice/time-tracking dropdowns)
        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_code' => 'nullable|string|max:255',
            'vat_code' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'notes' => 'nullable|string',
        ]);

        $client = $request->user()->clients()->create($validated);

        Audit::log('client.created', [
            'subject' => $client,
            'description' => "Created client {$client->name}",
        ]);

        return response()->json($client, 201);
    }

    public function show(Request $request, Client $client)
    {
        if ($client->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $client->load(['invoices' => function ($q) {
            $q->orderBy('invoice_date', 'desc');
        }]);

        $client->invoices_total = $client->invoices->sum('total');
        $client->invoices_paid = $client->invoices->where('status', 'paid')->sum('total');
        $client->invoices_count = $client->invoices->count();

        return response()->json($client);
    }

    public function update(Request $request, Client $client)
    {
        if ($client->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_code' => 'nullable|string|max:255',
            'vat_code' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'notes' => 'nullable|string',
        ]);

        $client->update($validated);

        Audit::log('client.updated', [
            'subject' => $client,
            'description' => "Updated client {$client->name}",
        ]);

        return response()->json($client);
    }

    public function destroy(Request $request, Client $client)
    {
        if ($client->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        if ($client->invoices()->exists()) {
            return response()->json(['message' => 'Cannot delete client with invoices'], 400);
        }

        $clientName = $client->name;
        $clientId = $client->id;
        $client->delete();

        Audit::log('client.deleted', [
            'subject_type' => Client::class,
            'subject_id' => $clientId,
            'description' => "Deleted client {$clientName}",
        ]);

        return response()->json(['message' => 'Deleted']);
    }
}
