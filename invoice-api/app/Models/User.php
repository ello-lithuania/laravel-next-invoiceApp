<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;

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
    ];

    protected $hidden = [
        'password',
    ];

    public function clients()
    {
        return $this->hasMany(Client::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }
}
