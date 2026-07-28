<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // New "uncollectible" status = a client who won't pay (written off).
        // Kept separate from "overdue" (late but still expected to pay).
        DB::statement("ALTER TABLE invoices MODIFY COLUMN status ENUM('draft','sent','paid','overdue','uncollectible') NOT NULL DEFAULT 'draft'");
    }

    public function down(): void
    {
        // Revert stragglers so the enum can shrink back safely.
        DB::table('invoices')->where('status', 'uncollectible')->update(['status' => 'overdue']);
        DB::statement("ALTER TABLE invoices MODIFY COLUMN status ENUM('draft','sent','paid','overdue') NOT NULL DEFAULT 'draft'");
    }
};
