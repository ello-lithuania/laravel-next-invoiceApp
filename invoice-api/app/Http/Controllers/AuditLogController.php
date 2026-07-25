<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $query = $request->user()->auditLogs()->latest();

        $category = $request->get('category');
        $allowed = ['invoice', 'client', 'auth', 'security'];
        if ($category && in_array($category, $allowed, true)) {
            $query->where('category', $category);
        }

        $perPage = min(max((int) $request->get('per_page', 25), 1), 100);

        return $query->paginate($perPage);
    }
}
