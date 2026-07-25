<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'email',
        'password',
        'name',
        'company_code',
        'vat_code',
        'address',
        'phone',
        'website',
        'bank_name',
        'bank_account',
        'invoice_series',
        'next_invoice_number',
        'signature',
        'invoice_template',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    public function clients()
    {
        return $this->hasMany(Client::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function timeEntries()
    {
        return $this->hasMany(TimeEntry::class);
    }

    public function catalogItems()
    {
        return $this->hasMany(CatalogItem::class);
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class);
    }

    /**
     * Atomically reserve the next invoice number.
     *
     * MUST be called inside a DB transaction: it locks this user's row
     * (SELECT ... FOR UPDATE) so two concurrent invoice creations can't read
     * the same next_invoice_number and produce duplicate numbers.
     */
    public function allocateInvoiceNumber(): int
    {
        $locked = static::whereKey($this->getKey())->lockForUpdate()->first();
        $number = $locked->next_invoice_number ?? 1;
        $locked->update(['next_invoice_number' => $number + 1]);
        // Keep the in-memory instance in sync for any later reads this request.
        $this->next_invoice_number = $number + 1;

        return $number;
    }
}
