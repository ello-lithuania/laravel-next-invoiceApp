<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StopTimeEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'duration_minutes' => 'nullable|numeric|min:0',
        ];
    }
}
