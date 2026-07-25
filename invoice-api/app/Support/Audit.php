<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

class Audit
{
    /**
     * Record an audit-trail entry.
     *
     * Never throws — an audit failure must not break the action that triggered
     * it. Category defaults to the part of the event name before the dot
     * (e.g. "invoice.created" → "invoice"); pass 'category' => 'security' for
     * security-sensitive events.
     *
     * @param  array{subject?:Model, user_id?:int|null, category?:string, description?:string, subject_type?:string, subject_id?:int, meta?:array}  $opts
     */
    public static function log(string $event, array $opts = []): void
    {
        try {
            $request = request();
            $subject = $opts['subject'] ?? null;

            AuditLog::create([
                'user_id' => array_key_exists('user_id', $opts)
                    ? $opts['user_id']
                    : optional($request?->user())->id,
                'event' => $event,
                'category' => $opts['category'] ?? explode('.', $event)[0],
                'subject_type' => $subject instanceof Model ? $subject->getMorphClass() : ($opts['subject_type'] ?? null),
                'subject_id' => $subject instanceof Model ? $subject->getKey() : ($opts['subject_id'] ?? null),
                'description' => $opts['description'] ?? null,
                'ip_address' => $request?->ip(),
                'user_agent' => $request ? substr((string) $request->userAgent(), 0, 500) : null,
                'meta' => $opts['meta'] ?? null,
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
