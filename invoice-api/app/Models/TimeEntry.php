<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TimeEntry extends Model
{
    protected $fillable = [
        'user_id',
        'client_id',
        'group_name',
        'description',
        'hourly_rate',
        'started_at',
        'ended_at',
        'duration_seconds',
        'is_running',
        'is_invoiced',
        'is_prepaid',
        'invoice_id',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'is_running' => 'boolean',
        'is_invoiced' => 'boolean',
        'is_prepaid' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }
}
