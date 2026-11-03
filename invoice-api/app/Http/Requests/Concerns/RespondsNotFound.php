<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Ownership failures answer with the same 404 JSON the controllers always
 * returned (not the default 403), so the API response format stays unchanged.
 */
trait RespondsNotFound
{
    protected function failedAuthorization()
    {
        throw new HttpResponseException(response()->json(['message' => 'Not found'], 404));
    }
}
