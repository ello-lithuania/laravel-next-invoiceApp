<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesOwnedClient;
use Illuminate\Foundation\Http\FormRequest;

class StoreInvoiceRequest extends FormRequest
{
    use ValidatesOwnedClient;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'client_id' => $this->clientIdRules(),
            'invoice_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:invoice_date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string|max:500',
            'items.*.unit' => 'required|string|max:20',
            'items.*.quantity' => 'required|numeric|min:0.01|max:999999',
            'items.*.price' => 'required|numeric|min:0|max:999999',
        ];
    }
}
