<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\RespondsNotFound;
use App\Models\Invoice;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateInvoiceStatusRequest extends FormRequest
{
    use RespondsNotFound;

    public function authorize(): bool
    {
        // The route segment is the raw id (the controller looks it up itself).
        $invoice = Invoice::find($this->route('invoice'));

        return $invoice !== null && $invoice->user_id === $this->user()->id;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(Invoice::STATUSES)],
        ];
    }
}
