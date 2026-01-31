<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('auth_token', ['*'], Carbon::now()->addDays(7))->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user->tokens()->where('created_at', '<', Carbon::now()->subDays(7))->delete();

        if ($user->tokens()->count() >= 5) {
            $user->tokens()->oldest()->first()->delete();
        }

        $token = $user->createToken('auth_token', ['*'], Carbon::now()->addDays(7))->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function logoutAll(Request $request)
    {
        $request->user()->tokens()->delete();

        return response()->json(['message' => 'Logged out from all devices']);
    }

    public function user(Request $request)
    {
        return response()->json($request->user());
    }

    public function sessions(Request $request)
    {
        $currentTokenId = $request->user()->currentAccessToken()->id;

        $sessions = $request->user()->tokens()
            ->select('id', 'name', 'last_used_at', 'created_at', 'expires_at')
            ->orderBy('last_used_at', 'desc')
            ->get()
            ->map(function ($token) use ($currentTokenId) {
                return [
                    'id' => $token->id,
                    'name' => $token->name,
                    'last_used_at' => $token->last_used_at,
                    'created_at' => $token->created_at,
                    'expires_at' => $token->expires_at,
                    'is_current' => $token->id === $currentTokenId,
                ];
            });

        return response()->json($sessions);
    }

    public function destroySession(Request $request, $id)
    {
        $token = $request->user()->tokens()->find($id);

        if (!$token) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        $currentTokenId = $request->user()->currentAccessToken()->id;
        if ($token->id === $currentTokenId) {
            return response()->json(['message' => 'Cannot delete current session. Use logout instead.'], 400);
        }

        $token->delete();

        return response()->json(['message' => 'Session revoked']);
    }
}
