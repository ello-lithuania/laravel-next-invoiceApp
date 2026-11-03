<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\RespondsNotFound;

class UpdateTimeEntryRequest extends StoreTimeEntryRequest
{
    use RespondsNotFound;

    public function authorize(): bool
    {
        return $this->route('timeEntry')->user_id === $this->user()->id;
    }
}
