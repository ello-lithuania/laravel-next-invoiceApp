<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\RespondsNotFound;

class UpdateClientRequest extends StoreClientRequest
{
    use RespondsNotFound;

    public function authorize(): bool
    {
        // Same ownership check the controller performs, evaluated before
        // validation so a foreign client still answers 404 (not 422).
        return $this->route('client')->user_id === $this->user()->id;
    }
}
