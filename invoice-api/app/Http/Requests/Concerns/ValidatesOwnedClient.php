<?php

namespace App\Http\Requests\Concerns;

trait ValidatesOwnedClient
{
    /**
     * client_id must exist and belong to the authenticated user.
     */
    protected function clientIdRules(): array
    {
        $user = $this->user();

        return [
            'required',
            'exists:clients,id',
            function ($attribute, $value, $fail) use ($user) {
                if (! $user->clients()->where('id', $value)->exists()) {
                    $fail('Invalid client.');
                }
            },
        ];
    }
}
