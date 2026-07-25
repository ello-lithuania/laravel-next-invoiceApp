<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // The hottest queries filter by user_id + invoice_date range/sort
            // WITHOUT a status (dashboard chart, year summary, invoice list,
            // months/available-years). The existing (user_id, status,
            // invoice_date) index can't serve those because status sits in the
            // middle — this composite lets MySQL use the date range + order.
            $table->index(['user_id', 'invoice_date'], 'invoices_user_date_idx');
        });

        Schema::table('time_entries', function (Blueprint $table) {
            // index() default ordering + buildYearData filter by user + created_at.
            $table->index(['user_id', 'created_at'], 'time_entries_user_created_idx');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropIndex('invoices_user_date_idx');
        });

        Schema::table('time_entries', function (Blueprint $table) {
            $table->dropIndex('time_entries_user_created_idx');
        });
    }
};
