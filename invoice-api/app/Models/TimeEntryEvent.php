<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TimeEntryEvent extends Model
{
    protected $fillable = [
        'time_entry_id',
        'user_id',
        'seconds_delta',
        'total_seconds',
        'source',
    ];

    protected $casts = [
        'seconds_delta' => 'integer',
        'total_seconds' => 'integer',
    ];

    public function timeEntry()
    {
        return $this->belongsTo(TimeEntry::class);
    }
}
