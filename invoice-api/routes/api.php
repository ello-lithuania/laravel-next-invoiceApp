<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PasswordController;
use App\Http\Controllers\ActivityController;
use App\Http\Controllers\StatsController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/signature', [ProfileController::class, 'uploadSignature']);
    Route::delete('/profile/signature', [ProfileController::class, 'deleteSignature']);

    Route::apiResource('clients', ClientController::class);

    Route::get('/stats', [StatsController::class, 'index']);
    Route::get('/stats/clients', [StatsController::class, 'clientBreakdown']);

    Route::put('/password', [PasswordController::class, 'update']);
    Route::get('/activity', [ActivityController::class, 'index']);

    Route::get('/invoices/months', [InvoiceController::class, 'months']);
    Route::apiResource('invoices', InvoiceController::class);
    Route::post('/invoices/{invoice}/status', [InvoiceController::class, 'updateStatus']);
});

Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'pdf']);
