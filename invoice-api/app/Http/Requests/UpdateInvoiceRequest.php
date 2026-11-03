<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\RespondsNotFound;

class UpdateInvoiceRequest extends StoreInvoiceRequest
{
    use RespondsNotFound;

    public function authorize(): bool
    {
        return $this->route('invoice')->user_id === $this->user()->id;
    }
}
