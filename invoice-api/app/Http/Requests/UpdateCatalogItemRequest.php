<?php

namespace App\Http\Requests;

class UpdateCatalogItemRequest extends StoreCatalogItemRequest
{
    public function authorize(): bool
    {
        // findOrFail -> same 404 as before, evaluated before validation.
        $this->user()->catalogItems()->findOrFail($this->route('id'));

        return true;
    }
}
