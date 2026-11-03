<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateProfileRequest;
use App\Http\Requests\UploadSignatureRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProfileController extends Controller
{
    private function userWithSignatureUrl($user)
    {
        $data = $user->toArray();
        if ($user->signature) {
            $path = storage_path('app/public/signatures/'.$user->signature);
            if (file_exists($path)) {
                $data['signature_url'] = 'data:image/png;base64,'.base64_encode(file_get_contents($path));
            }
        }

        return $data;
    }

    public function show(Request $request)
    {
        return response()->json($this->userWithSignatureUrl($request->user()));
    }

    public function update(UpdateProfileRequest $request)
    {
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
            'invoice_template',
        ]));

        return response()->json($this->userWithSignatureUrl($request->user()));
    }

    public function uploadSignature(UploadSignatureRequest $request)
    {
        $user = $request->user();

        $signaturesPath = storage_path('app/public/signatures');
        if (! file_exists($signaturesPath)) {
            mkdir($signaturesPath, 0755, true);
        }

        if ($user->signature && file_exists($signaturesPath.'/'.$user->signature)) {
            unlink($signaturesPath.'/'.$user->signature);
        }

        // Random, unguessable filename. These files live under the public
        // storage symlink, so a predictable name (id + timestamp) would let
        // anyone enumerate and download other users' signature images.
        $filename = 'signature_'.$user->id.'_'.Str::random(32).'.png';
        $request->file('signature')->move($signaturesPath, $filename);

        $user->update(['signature' => $filename]);

        $base64 = 'data:image/png;base64,'.base64_encode(file_get_contents($signaturesPath.'/'.$filename));

        return response()->json([
            'message' => 'Signature uploaded',
            'signature' => $filename,
            'signature_url' => $base64,
        ]);
    }

    public function deleteSignature(Request $request)
    {
        $user = $request->user();
        $signaturesPath = storage_path('app/public/signatures');

        if ($user->signature && file_exists($signaturesPath.'/'.$user->signature)) {
            unlink($signaturesPath.'/'.$user->signature);
        }

        $user->update(['signature' => null]);

        return response()->json(['message' => 'Signature deleted']);
    }
}
