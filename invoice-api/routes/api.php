<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PasswordController;
use App\Http\Controllers\ActivityController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\TimeEntryController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Hash;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::post('/forgot-password', function (Request $request) {
    $request->validate(['email' => 'required|email']);

    $status = Password::sendResetLink($request->only('email'));

    if ($status === Password::RESET_LINK_SENT) {
        return response()->json(['message' => 'Password reset link sent.']);
    }

    throw ValidationException::withMessages(['email' => [__($status)]]);
})->middleware('throttle:password-reset');

Route::post('/reset-password', function (Request $request) {
    $request->validate([
        'token' => 'required',
        'email' => 'required|email',
        'password' => 'required|min:8|confirmed',
    ]);

    $status = Password::reset(
        $request->only('email', 'password', 'password_confirmation', 'token'),
        function ($user, $password) {
            $user->forceFill([
                'password' => Hash::make($password)
            ])->setRememberToken(Str::random(60));
            $user->save();
            event(new PasswordReset($user));
        }
    );

    if ($status === Password::PASSWORD_RESET) {
        return response()->json(['message' => 'Password has been reset.']);
    }

    throw ValidationException::withMessages(['email' => [__($status)]]);
})->middleware('throttle:password-reset');

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/logout-all', [AuthController::class, 'logoutAll']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::get('/sessions', [AuthController::class, 'sessions']);
    Route::delete('/sessions/{id}', [AuthController::class, 'destroySession']);

    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/signature', [ProfileController::class, 'uploadSignature']);
    Route::delete('/profile/signature', [ProfileController::class, 'deleteSignature']);

    Route::apiResource('clients', ClientController::class);

    Route::get('/stats', [StatsController::class, 'index']);
    Route::get('/stats/clients', [StatsController::class, 'clientBreakdown']);
    Route::get('/stats/quick', [StatsController::class, 'quickStats']);
    Route::get('/stats/year-summary', [StatsController::class, 'yearSummary']);
    Route::get('/stats/available-years', [StatsController::class, 'availableYears']);

    Route::put('/password', [PasswordController::class, 'update']);
    Route::get('/activity', [ActivityController::class, 'index']);

    Route::get('/invoices/months', [InvoiceController::class, 'months']);
    Route::get('/invoices/unpaid', [InvoiceController::class, 'unpaid']);
    Route::get('/invoices/trackable', [InvoiceController::class, 'trackable']);
    Route::post('/invoices/bulk-delete', [InvoiceController::class, 'bulkDelete']);
    Route::post('/invoices/bulk-status', [InvoiceController::class, 'bulkUpdateStatus']);
    Route::apiResource('invoices', InvoiceController::class);
    Route::post('/invoices/{invoice}/status', [InvoiceController::class, 'updateStatus']);
    Route::post('/invoices/{invoice}/duplicate', [InvoiceController::class, 'duplicate']);

    Route::get('/time-entries/running', [TimeEntryController::class, 'running']);
    Route::post('/time-entries/{timeEntry}/start', [TimeEntryController::class, 'start']);
    Route::post('/time-entries/{timeEntry}/stop', [TimeEntryController::class, 'stop']);
    Route::post('/time-entries/{timeEntry}/add-time', [TimeEntryController::class, 'addTime']);
    Route::post('/time-entries/convert-to-invoice', [TimeEntryController::class, 'convertToInvoice']);
    Route::post('/time-entries/bulk-delete', [TimeEntryController::class, 'bulkDelete']);
    Route::apiResource('time-entries', TimeEntryController::class)->except(['show']);
});

Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'pdf']);
Route::get('/sample-invoice-pdf', [InvoiceController::class, 'samplePdf']);
Route::get('/stats/year-summary/pdf', [StatsController::class, 'yearSummaryPdf']);
