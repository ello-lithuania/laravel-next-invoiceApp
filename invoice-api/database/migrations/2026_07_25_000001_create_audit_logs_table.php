<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            // Nullable so failed-login attempts (no authenticated user) can still
            // be recorded. nullOnDelete keeps the log row if the user is removed.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event');                 // e.g. invoice.created
            $table->string('category')->default('general'); // invoice | client | auth | security
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('description')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->json('meta')->nullable();
            // Immutable log rows — only a creation timestamp, no updated_at.
            $table->timestamp('created_at')->nullable();

            $table->index(['user_id', 'created_at']);
            $table->index(['category', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
