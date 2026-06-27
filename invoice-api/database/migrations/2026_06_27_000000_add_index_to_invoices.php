<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // Speeds up dashboard queries that filter by user + status and
            // sort/range by invoice_date (quickStats, clientBreakdown, stats).
            $table->index(['user_id', 'status', 'invoice_date'], 'invoices_user_status_date_idx');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex('invoices_user_status_date_idx');
        });
    }
};
