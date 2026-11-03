<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesOwnedClient;
use Illuminate\Foundation\Http\FormRequest;

class StoreTimeEntryRequest extends FormRequest
{
    use ValidatesOwnedClient;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $user = $this->user();

        return [
            'client_id' => $this->clientIdRules(),
            'group_name' => 'nullable|string|max:255',
            'description' => 'required|string|max:500',
            'hourly_rate' => 'required|numeric|min:0',
            'duration_seconds' => 'nullable|integer|min:0',
            'is_prepaid' => 'nullable|boolean',
            'invoice_id' => [
                'nullable',
                'integer',
                function ($attribute, $value, $fail) use ($user) {
                    if ($value && ! $user->invoices()->where('id', $value)->exists()) {
                        $fail('Invalid invoice.');
                    }
                },
            ],
        ];
    }
}
