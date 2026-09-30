<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('time_entry_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('time_entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->integer('seconds_delta');
            $table->integer('total_seconds');
            $table->string('source', 20);
            $table->timestamps();

            $table->index(['time_entry_id', 'created_at']);
        });

        // Seed one event per existing entry so old entries still have a start
        // point on the timeline — the individual top-ups were never recorded.
        DB::table('time_entries')->orderBy('id')->chunk(200, function ($entries) {
            $rows = [];
            foreach ($entries as $entry) {
                $rows[] = [
                    'time_entry_id' => $entry->id,
                    'user_id' => $entry->user_id,
                    'seconds_delta' => $entry->duration_seconds,
                    'total_seconds' => $entry->duration_seconds,
                    'source' => 'backfill',
                    'created_at' => $entry->created_at,
                    'updated_at' => $entry->created_at,
                ];
            }
            if ($rows) DB::table('time_entry_events')->insert($rows);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('time_entry_events');
    }
};
