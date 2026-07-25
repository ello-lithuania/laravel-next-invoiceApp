<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Database-level guarantee that a user can never end up with two
        // invoices sharing the same series+number (belt-and-braces on top of
        // the row-locked number allocation in the controllers). If this fails,
        // existing duplicate numbers must be resolved first.
        Schema::table('invoices', function (Blueprint $table) {
            $table->unique(['user_id', 'series', 'number'], 'invoices_user_series_number_unique');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropUnique('invoices_user_series_number_unique');
        });
    }
};
