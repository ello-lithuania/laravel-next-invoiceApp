<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class StatsController extends Controller
{
    public function index(Request $request)
    {
        $period = $request->get('period', '1m');

        $startDate = match($period) {
            '1m' => Carbon::now()->startOfMonth(),
            '3m' => Carbon::now()->subMonths(3),
            '6m' => Carbon::now()->subMonths(6),
            '9m' => Carbon::now()->subMonths(9),
            '1y' => Carbon::now()->startOfYear(),
            default => Carbon::now()->startOfMonth(),
        };

        $dateFormat = $period === '1m' ? '%Y-%m-%d' : '%Y-%m';
        $groupKey = $period === '1m' ? 'date' : 'month';

        $invoices = $request->user()->invoices()
            ->where('invoice_date', '>=', $startDate)
            ->selectRaw("DATE_FORMAT(invoice_date, '$dateFormat') as $groupKey, COUNT(*) as count, SUM(total) as total")
            ->groupBy($groupKey)
            ->orderBy($groupKey)
            ->get();

        $summary = $request->user()->invoices()
            ->where('invoice_date', '>=', $startDate)
            ->selectRaw('COUNT(*) as total_invoices, COALESCE(SUM(total), 0) as total_amount')
            ->first();

        return response()->json([
            'chart' => $invoices,
            'summary' => [
                'total_invoices' => $summary->total_invoices ?? 0,
                'total_amount' => $summary->total_amount ?? 0,
            ],
            'period' => $period,
        ]);
    }
}
