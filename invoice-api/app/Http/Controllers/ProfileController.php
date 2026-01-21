<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        return response()->json($request->user());
    }

    public function update(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'company_code' => 'nullable|string|max:255',
            'vat_code' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'website' => 'nullable|string|max:255',
            'bank_name' => 'nullable|string|max:255',
            'bank_account' => 'nullable|string|max:255',
            'invoice_series' => 'nullable|string|max:50',
        ]);

        $request->user()->update($request->only([
            'name',
            'company_code',
            'vat_code',
            'address',
            'phone',
            'website',
            'bank_name',
            'bank_account',
            'invoice_series',
        ]));

        return response()->json($request->user());
    }
}
