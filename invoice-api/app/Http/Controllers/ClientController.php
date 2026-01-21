<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            $request->user()->clients()->orderBy('name')->get()
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'company_code' => 'nullable|string|max:255',
            'vat_code' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
        ]);

        $client = $request->user()->clients()->create($request->all());

        return response()->json($client, 201);
    }

    public function show(Request $request, Client $client)
    {
        if ($client->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        return response()->json($client);
    }

    public function update(Request $request, Client $client)
    {
        if ($client->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'company_code' => 'nullable|string|max:255',
            'vat_code' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
        ]);

        $client->update($request->all());

        return response()->json($client);
    }

    public function destroy(Request $request, Client $client)
    {
        if ($client->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $client->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
