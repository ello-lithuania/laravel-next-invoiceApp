<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Carbon\Carbon;

class PasswordController extends Controller
{
    public function update(Request $request)
    {
        $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = $request->user();

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        $user->tokens()->delete();

        $token = $user->createToken('auth_token', ['*'], Carbon::now()->addDays(7))->plainTextToken;

        return response()->json([
            'message' => 'Password changed successfully. All other sessions have been logged out.',
            'token' => $token,
        ]);
    }
}
