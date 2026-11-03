<?php

namespace App\Http\Requests;

class BulkUpdateTimeEntryGroupRequest extends BulkTimeEntryIdsRequest
{
    public function rules(): array
    {
        return parent::rules() + [
            'group_name' => 'nullable|string|max:255',
        ];
    }
}
