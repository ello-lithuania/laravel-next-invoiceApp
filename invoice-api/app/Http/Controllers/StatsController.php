<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;

class StatsController extends Controller
{
    public function index(Request $request)
    {
        $period = $request->get('period', '1m');

        // Start at the beginning of the month N-1 months back so each window
        // spans exactly N calendar months (e.g. "3 Months" = 3 bars, not 4).
        $startDate = match($period) {
            '1m' => Carbon::now()->startOfMonth(),
            '3m' => Carbon::now()->startOfMonth()->subMonths(2),
            '6m' => Carbon::now()->startOfMonth()->subMonths(5),
            '9m' => Carbon::now()->startOfMonth()->subMonths(8),
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

    public function clientBreakdown(Request $request)
    {
        $user = $request->user();
        $year = (int) ($request->get('year') ?? now()->year);

        $start = Carbon::create($year, 1, 1)->startOfDay();
        $end = Carbon::create($year, 12, 31)->endOfDay();

        // Total paid income for the year (basis for percentage)
        $yearTotal = (float) $user->invoices()
            ->where('status', 'paid')
            ->whereBetween('invoice_date', [$start, $end])
            ->sum('total');

        $rows = $user->invoices()
            ->join('clients', 'invoices.client_id', '=', 'clients.id')
            ->where('invoices.status', 'paid')
            ->whereBetween('invoices.invoice_date', [$start, $end])
            ->selectRaw('clients.name, SUM(invoices.total) as total, COUNT(*) as count')
            ->groupBy('clients.id', 'clients.name')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(function ($row) use ($yearTotal) {
                $total = (float) $row->total;
                return [
                    'name' => $row->name,
                    'total' => $total,
                    'count' => (int) $row->count,
                    'percentage' => $yearTotal > 0 ? round($total / $yearTotal * 100, 1) : 0,
                ];
            });

        return response()->json([
            'clients' => $rows,
            'year' => $year,
            'year_total' => $yearTotal,
        ]);
    }

    public function quickStats(Request $request)
    {
        $user = $request->user();

        $year = (int) now()->year;

        // Single aggregate pass over invoices instead of separate queries.
        $agg = $user->invoices()
            ->selectRaw("
                COUNT(*) as total_invoices,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END), 0) as paid_count,
                COALESCE(SUM(CASE WHEN status NOT IN ('paid', 'uncollectible') THEN 1 ELSE 0 END), 0) as unpaid_count,
                COALESCE(SUM(CASE WHEN status NOT IN ('paid', 'uncollectible') THEN total ELSE 0 END), 0) as unpaid_total,
                COALESCE(SUM(CASE WHEN status = 'paid' AND YEAR(invoice_date) = {$year} THEN total ELSE 0 END), 0) as year_revenue
            ")
            ->first();

        // Last 6 months of paid revenue (oldest → newest) for the sparkline,
        // plus this-month-vs-last-month trend. One grouped query.
        $since = Carbon::now()->startOfMonth()->subMonths(5);
        $monthly = $user->invoices()
            ->where('status', 'paid')
            ->where('invoice_date', '>=', $since)
            ->selectRaw("DATE_FORMAT(invoice_date, '%Y-%m') as ym, COALESCE(SUM(total), 0) as total")
            ->groupBy('ym')
            ->pluck('total', 'ym');

        $sparkline = [];
        for ($i = 5; $i >= 0; $i--) {
            $key = Carbon::now()->startOfMonth()->subMonths($i)->format('Y-m');
            $sparkline[] = round((float) ($monthly[$key] ?? 0), 2);
        }

        $thisMonth = $sparkline[5];
        $lastMonth = $sparkline[4];
        $revenueTrend = $lastMonth > 0
            ? round(($thisMonth - $lastMonth) / $lastMonth * 100, 1)
            : ($thisMonth > 0 ? 100.0 : 0.0);

        // Paid ratio per month over the last 6 months (paid invoices / all
        // invoices issued that month) — shows how collection trends over time.
        $monthlyCounts = $user->invoices()
            ->where('invoice_date', '>=', $since)
            ->selectRaw("DATE_FORMAT(invoice_date, '%Y-%m') as ym, COUNT(*) as total, SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid")
            ->groupBy('ym')
            ->get()
            ->keyBy('ym');

        $paidRatioSparkline = [];
        for ($i = 5; $i >= 0; $i--) {
            $key = Carbon::now()->startOfMonth()->subMonths($i)->format('Y-m');
            $row = $monthlyCounts[$key] ?? null;
            $paidRatioSparkline[] = $row && $row->total > 0 ? (int) round($row->paid / $row->total * 100) : 0;
        }

        return response()->json([
            'total_revenue' => (float) $agg->total_revenue,
            'year_revenue' => (float) $agg->year_revenue,
            'year' => $year,
            'total_clients' => $user->clients()->count(),
            'total_invoices' => (int) $agg->total_invoices,
            'paid_count' => (int) $agg->paid_count,
            'unpaid_count' => (int) $agg->unpaid_count,
            'unpaid_total' => (float) $agg->unpaid_total,
            'revenue_sparkline' => $sparkline,
            'revenue_trend' => $revenueTrend,
            'paid_ratio_sparkline' => $paidRatioSparkline,
        ]);
    }

    private function buildYearData($user, int $year): array
    {
        $startOfYear = Carbon::create($year, 1, 1)->startOfDay();
        $endOfYear = Carbon::create($year, 12, 31)->endOfDay();

        $invoices = $user->invoices()
            ->whereBetween('invoice_date', [$startOfYear, $endOfYear])
            ->with('client', 'items')
            ->get();

        // "Hours" is derived from invoice line items billed in hour units
        // (val./h/…), NOT from time-tracker entries. Only a fraction of work is
        // ever timed, so time entries badly under-counted real hours; billed
        // hour-items reconcile with the work invoiced (and with revenue).
        $hourUnits = ['val.', 'val', 'h', 'hr', 'hrs', 'hour', 'hours'];
        $isHourItem = fn ($it) => in_array(mb_strtolower(trim((string) $it->unit)), $hourUnits, true);
        $hoursOf = fn ($invoiceList) => (float) $invoiceList->sum(
            fn ($inv) => $inv->items->filter($isHourItem)->sum('quantity')
        );
        $hourRevenueOf = fn ($invoiceList) => (float) $invoiceList->sum(
            fn ($inv) => $inv->items->filter($isHourItem)->sum('total')
        );

        $totalRevenue = $invoices->sum('total');
        $paidRevenue = $invoices->where('status', 'paid')->sum('total');
        $unpaidRevenue = $totalRevenue - $paidRevenue;
        $totalInvoices = $invoices->count();
        $avgInvoice = $totalInvoices > 0 ? $totalRevenue / $totalInvoices : 0;

        $clientIds = $invoices->pluck('client_id')->unique();
        $totalClients = $clientIds->count();

        $totalHours = $hoursOf($invoices);
        $hourRevenue = $hourRevenueOf($invoices);
        // Effective average price per billed hour.
        $avgHourlyRate = $totalHours > 0 ? $hourRevenue / $totalHours : 0;
        $timeTrackingRevenue = $hourRevenue;

        $months = [];
        $monthsWithRevenue = [];
        for ($m = 1; $m <= 12; $m++) {
            $monthInvoices = $invoices->filter(fn ($i) => (int) $i->invoice_date->format('n') === $m);
            $monthTotal = $monthInvoices->sum('total');

            $months[] = [
                'month' => $m,
                'invoice_count' => $monthInvoices->count(),
                'total' => $monthTotal,
                'hours' => $hoursOf($monthInvoices),
                'is_best' => false,
                'is_worst' => false,
            ];

            if ($monthInvoices->count() > 0) {
                $monthsWithRevenue[] = $m;
            }
        }

        $bestMonth = null;
        $worstMonth = null;
        if (count($monthsWithRevenue) > 0) {
            // The current month (of the current year) is still in progress, so its
            // partial total shouldn't be eligible for "worst" — early in the month
            // it would always look like the lowest.
            $currentMonth = ($year === (int) now()->year) ? (int) now()->month : null;

            // Find the best/worst month by total among months that had invoices.
            // (array_keys() against a scalar can't match the array rows, so scan.)
            $bestIdx = null;
            $worstIdx = null;
            $bestVal = -INF;
            $worstVal = INF;
            foreach ($months as $idx => $m) {
                if ($m['invoice_count'] <= 0) {
                    continue;
                }
                if ($m['total'] > $bestVal) {
                    $bestVal = $m['total'];
                    $bestIdx = $idx;
                }
                $isCurrentIncomplete = $currentMonth !== null && ($idx + 1) === $currentMonth;
                if (!$isCurrentIncomplete && $m['total'] < $worstVal) {
                    $worstVal = $m['total'];
                    $worstIdx = $idx;
                }
            }
            if ($bestIdx !== null) {
                $months[$bestIdx]['is_best'] = true;
                $bestMonth = $months[$bestIdx];
            }
            if ($worstIdx !== null && $worstIdx !== $bestIdx) {
                $months[$worstIdx]['is_worst'] = true;
                $worstMonth = $months[$worstIdx];
            }
        }

        $clients = [];
        foreach ($clientIds as $clientId) {
            $clientInvoices = $invoices->where('client_id', $clientId);
            $client = $clientInvoices->first()->client;
            $clients[] = [
                'name' => $client->name ?? 'Unknown',
                'invoice_count' => $clientInvoices->count(),
                'total' => $clientInvoices->sum('total'),
                'hours' => $hoursOf($clientInvoices),
            ];
        }
        usort($clients, fn ($a, $b) => $b['total'] <=> $a['total']);

        $largest = $invoices->sortByDesc('total')->first();

        return [
            'total_revenue' => $totalRevenue,
            'paid_revenue' => $paidRevenue,
            'unpaid_revenue' => $unpaidRevenue,
            'total_invoices' => $totalInvoices,
            'total_clients' => $totalClients,
            'avg_invoice' => $avgInvoice,
            'avg_monthly' => $totalRevenue / 12,
            'total_hours' => $totalHours,
            'avg_hourly_rate' => $avgHourlyRate,
            'time_tracking_revenue' => $timeTrackingRevenue,
            'months' => $months,
            'clients' => $clients,
            'best_month' => $bestMonth,
            'worst_month' => $worstMonth,
            'largest_invoice' => $largest ? [
                'series' => $largest->series,
                'number' => $largest->number,
                'total' => $largest->total,
                'client' => $largest->client->name ?? '',
            ] : null,
        ];
    }

    public function availableYears(Request $request)
    {
        $years = $request->user()->invoices()
            ->selectRaw('YEAR(invoice_date) as year')
            ->groupBy('year')
            ->orderBy('year', 'desc')
            ->pluck('year')
            ->toArray();

        return response()->json($years);
    }

    public function yearSummary(Request $request)
    {
        $year = (int) $request->get('year', now()->year);
        $data = $this->buildYearData($request->user(), $year);

        return response()->json([
            'year' => $year,
            'data' => $data,
        ]);
    }

    public function yearSummaryPdf(Request $request)
    {
        $user = $request->user();
        $year = (int) $request->get('year', now()->year);
        $data = $this->buildYearData($user, $year);

        $pdf = Pdf::loadView('year-summary', [
            'user' => $user,
            'year' => $year,
            'data' => $data,
        ]);

        $pdf->setPaper('A4', 'portrait');

        $download = $request->boolean('download', false);
        $filename = "metine-suvestine-{$year}.pdf";

        if ($download) {
            return $pdf->download($filename);
        }

        return $pdf->stream($filename);
    }
}
