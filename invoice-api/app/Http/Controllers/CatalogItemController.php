<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCatalogItemRequest;
use App\Http\Requests\UpdateCatalogItemRequest;
use Illuminate\Http\Request;

class CatalogItemController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            $request->user()->catalogItems()->orderBy('description')->get()
        );
    }

    public function store(StoreCatalogItemRequest $request)
    {
        $data = $request->validated();

        // Avoid duplicates by description for this user
        $existing = $request->user()->catalogItems()
            ->where('description', $data['description'])
            ->first();
        if ($existing) {
            $existing->update([
                'unit' => $data['unit'] ?? $existing->unit,
                'price' => $data['price'] ?? $existing->price,
            ]);

            return response()->json($existing, 200);
        }

        $item = $request->user()->catalogItems()->create([
            'description' => $data['description'],
            'unit' => $data['unit'] ?? 'h',
            'price' => $data['price'] ?? 0,
        ]);

        return response()->json($item, 201);
    }

    public function update(UpdateCatalogItemRequest $request, $id)
    {
        $item = $request->user()->catalogItems()->findOrFail($id);
        $item->update($request->validated());

        return response()->json($item);
    }

    public function destroy(Request $request, $id)
    {
        $item = $request->user()->catalogItems()->findOrFail($id);
        $item->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
