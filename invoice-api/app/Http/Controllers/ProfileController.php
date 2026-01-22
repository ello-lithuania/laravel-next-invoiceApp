<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ProfileController extends Controller
{
    private function userWithSignatureUrl($user)
    {
        $data = $user->toArray();
        if ($user->signature) {
            $path = storage_path('app/public/signatures/' . $user->signature);
            if (file_exists($path)) {
                $data['signature_url'] = 'data:image/png;base64,' . base64_encode(file_get_contents($path));
            }
        }
        return $data;
    }

    public function show(Request $request)
    {
        return response()->json($this->userWithSignatureUrl($request->user()));
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
            'next_invoice_number' => 'nullable|integer|min:1',
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
            'next_invoice_number',
        ]));

        return response()->json($this->userWithSignatureUrl($request->user()));
    }

    public function uploadSignature(Request $request)
    {
        $request->validate([
            'signature' => 'required|image|mimes:png|max:2048',
        ]);

        $user = $request->user();

        $signaturesPath = storage_path('app/public/signatures');
        if (!file_exists($signaturesPath)) {
            mkdir($signaturesPath, 0755, true);
        }

        if ($user->signature && file_exists($signaturesPath . '/' . $user->signature)) {
            unlink($signaturesPath . '/' . $user->signature);
        }

        $filename = 'signature_' . $user->id . '_' . time() . '.png';
        $request->file('signature')->move($signaturesPath, $filename);

        $user->update(['signature' => $filename]);

        $base64 = 'data:image/png;base64,' . base64_encode(file_get_contents($signaturesPath . '/' . $filename));

        return response()->json([
            'message' => 'Signature uploaded',
            'signature' => $filename,
            'signature_url' => $base64
        ]);
    }

    public function deleteSignature(Request $request)
    {
        $user = $request->user();
        $signaturesPath = storage_path('app/public/signatures');

        if ($user->signature && file_exists($signaturesPath . '/' . $user->signature)) {
            unlink($signaturesPath . '/' . $user->signature);
        }

        $user->update(['signature' => null]);

        return response()->json(['message' => 'Signature deleted']);
    }
}
