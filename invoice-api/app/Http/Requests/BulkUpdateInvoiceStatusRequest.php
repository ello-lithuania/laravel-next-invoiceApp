<?php

namespace App\Http\Requests;

use App\Models\Invoice;
use Illuminate\Validation\Rule;

class BulkUpdateInvoiceStatusRequest extends BulkInvoiceIdsRequest
{
    public function rules(): array
    {
        return parent::rules() + [
            'status' => ['required', Rule::in(Invoice::STATUSES)],
        ];
    }
}
