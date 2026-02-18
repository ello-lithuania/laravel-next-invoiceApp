<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\TimeEntry;

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

    public function clientBreakdown(Request $request)
    {
        $data = $request->user()->invoices()
            ->join('clients', 'invoices.client_id', '=', 'clients.id')
            ->selectRaw('clients.name, SUM(invoices.total) as total, COUNT(*) as count')
            ->groupBy('clients.id', 'clients.name')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        return response()->json($data);
    }

    public function quickStats(Request $request)
    {
        $user = $request->user();

        $totalRevenue = $user->invoices()->where('status', 'paid')->sum('total');
        $totalClients = $user->clients()->count();
        $totalInvoices = $user->invoices()->count();
        $paidCount = $user->invoices()->where('status', 'paid')->count();
        $unpaidCount = $user->invoices()->where('status', '!=', 'paid')->count();

        return response()->json([
            'total_revenue' => $totalRevenue,
            'total_clients' => $totalClients,
            'total_invoices' => $totalInvoices,
            'paid_count' => $paidCount,
            'unpaid_count' => $unpaidCount,
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

        $timeEntries = TimeEntry::where('user_id', $user->id)
            ->where('is_running', false)
            ->where('duration_seconds', '>', 0)
            ->whereBetween('created_at', [$startOfYear, $endOfYear])
            ->get();

        // Totals
        $totalRevenue = $invoices->sum('total');
        $paidRevenue = $invoices->where('status', 'paid')->sum('total');
        $unpaidRevenue = $totalRevenue - $paidRevenue;
        $totalInvoices = $invoices->count();
        $avgInvoice = $totalInvoices > 0 ? $totalRevenue / $totalInvoices : 0;

        // Unique clients from invoices
        $clientIds = $invoices->pluck('client_id')->unique();
        $totalClients = $clientIds->count();

        // Time tracking
        $totalSeconds = $timeEntries->sum('duration_seconds');
        $totalHours = $totalSeconds / 3600;
        $avgHourlyRate = $totalHours > 0
            ? $timeEntries->sum(fn ($e) => ($e->duration_seconds / 3600) * $e->hourly_rate) / $totalHours
            : 0;
        $timeTrackingRevenue = $timeEntries->sum(fn ($e) => ($e->duration_seconds / 3600) * $e->hourly_rate);

        // Monthly breakdown
        $months = [];
        $monthsWithRevenue = [];
        for ($m = 1; $m <= 12; $m++) {
            $monthInvoices = $invoices->filter(fn ($i) => (int) $i->invoice_date->format('n') === $m);
            $monthTime = $timeEntries->filter(fn ($e) => (int) $e->created_at->format('n') === $m);
            $monthTotal = $monthInvoices->sum('total');

            $months[] = [
                'month' => $m,
                'invoice_count' => $monthInvoices->count(),
                'total' => $monthTotal,
                'hours' => $monthTime->sum('duration_seconds') / 3600,
                'is_best' => false,
                'is_worst' => false,
            ];

            if ($monthInvoices->count() > 0) {
                $monthsWithRevenue[] = $m;
            }
        }

        // Best/worst months (only months with invoices)
        $bestMonth = null;
        $worstMonth = null;
        if (count($monthsWithRevenue) > 0) {
            $activeMonths = array_filter($months, fn ($m) => in_array($m['month'], $monthsWithRevenue));
            $bestIdx = array_keys($activeMonths, max(array_column($activeMonths, 'total')))[0] ?? null;
            $worstIdx = array_keys($activeMonths, min(array_column($activeMonths, 'total')))[0] ?? null;
            if ($bestIdx !== null) {
                $months[$bestIdx]['is_best'] = true;
                $bestMonth = $months[$bestIdx];
            }
            if ($worstIdx !== null && $worstIdx !== $bestIdx) {
                $months[$worstIdx]['is_worst'] = true;
                $worstMonth = $months[$worstIdx];
            }
        }

        // Client breakdown
        $clients = [];
        foreach ($clientIds as $clientId) {
            $clientInvoices = $invoices->where('client_id', $clientId);
            $clientTime = $timeEntries->where('client_id', $clientId);
            $client = $clientInvoices->first()->client;
            $clients[] = [
                'name' => $client->name ?? 'Unknown',
                'invoice_count' => $clientInvoices->count(),
                'total' => $clientInvoices->sum('total'),
                'hours' => $clientTime->sum('duration_seconds') / 3600,
            ];
        }
        usort($clients, fn ($a, $b) => $b['total'] <=> $a['total']);

        // Largest invoice
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
        $token = $request->query('token');
        if (!$token) {
            return response()->json(['message' => 'Token required'], 401);
        }

        $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
        if (!$accessToken) {
            return response()->json(['message' => 'Invalid token'], 401);
        }

        $user = $accessToken->tokenable;
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
