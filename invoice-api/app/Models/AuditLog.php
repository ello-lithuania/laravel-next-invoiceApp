<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    // Log rows are immutable — there is no updated_at column.
    const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'event',
        'category',
        'subject_type',
        'subject_id',
        'description',
        'ip_address',
        'user_agent',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
