<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ActivityController extends Controller
{
    public function index(Request $request)
    {
        $clients = $request->user()->clients()
            ->select('id', 'name', 'created_at')
            ->latest()
            ->take(10)
            ->get()
            ->map(fn($c) => [
                'type' => 'client',
                'id' => $c->id,
                'title' => $c->name,
                'date' => $c->created_at,
            ]);

        $invoices = $request->user()->invoices()
            ->with('client:id,name')
            ->select('id', 'series', 'number', 'total', 'client_id', 'created_at')
            ->latest()
            ->take(10)
            ->get()
            ->map(fn($i) => [
                'type' => 'invoice',
                'id' => $i->id,
                'title' => $i->series . ' ' . $i->number,
                'subtitle' => $i->client?->name,
                'total' => $i->total,
                'date' => $i->created_at,
            ]);

        $activity = $clients->concat($invoices)
            ->sortByDesc('date')
            ->take(10)
            ->values();

        return response()->json($activity);
    }
}
