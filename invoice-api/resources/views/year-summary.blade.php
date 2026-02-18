<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Year Summary {{ $year }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-size: 11px; line-height: 1.5; color: #333; font-family: 'Dejavu sans', sans-serif; }
        .header-bar { background: #0054ac; color: #fff; padding: 30px 40px; text-align: center; }
        .header-title { font-size: 22px; font-weight: bold; letter-spacing: 2px; }
        .header-sub { font-size: 12px; margin-top: 8px; opacity: 0.9; }
        .content { padding: 30px 40px; }

        .stats-grid { display: table; width: 100%; margin-bottom: 30px; }
        .stat-row { display: table-row; }
        .stat-box { display: table-cell; width: 33.33%; padding: 8px; vertical-align: top; }
        .stat-inner { background: #f5f7fa; border-radius: 6px; padding: 15px; text-align: center; border-left: 3px solid #0054ac; }
        .stat-value { font-size: 20px; font-weight: bold; color: #0054ac; }
        .stat-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 3px; }

        .section { margin-bottom: 25px; }
        .section-title { font-size: 13px; font-weight: bold; color: #0054ac; border-bottom: 2px solid #0054ac; padding-bottom: 5px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }

        table.data { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        table.data th { background: #0054ac; color: #fff; padding: 8px 10px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
        table.data th.right { text-align: right; }
        table.data td { border-bottom: 1px solid #e5e5e5; padding: 7px 10px; color: #333; font-size: 10px; }
        table.data td.right { text-align: right; }
        table.data td.bold { font-weight: bold; }
        table.data tr:nth-child(even) td { background: #f9f9f9; }
        table.data tr.highlight td { background: #eef4ff; font-weight: bold; }

        .summary-box { background: #f5f7fa; padding: 15px; border-left: 3px solid #0054ac; margin-top: 20px; border-radius: 4px; }
        .summary-row { margin-bottom: 5px; }
        .summary-label { color: #666; font-size: 10px; }
        .summary-val { font-weight: bold; color: #333; }

        .footer-text { text-align: center; color: #999; font-size: 8px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="header-bar">
        <div class="header-title">YEAR SUMMARY</div>
        <div class="header-sub">{{ $user->name }} · {{ $year }}</div>
    </div>

    <div class="content">
        {{-- Key metrics --}}
        <div class="stats-grid">
            <div class="stat-row">
                <div class="stat-box">
                    <div class="stat-inner">
                        <div class="stat-value">{{ number_format($data['total_revenue'], 2) }} €</div>
                        <div class="stat-label">Total Revenue</div>
                    </div>
                </div>
                <div class="stat-box">
                    <div class="stat-inner">
                        <div class="stat-value">{{ number_format($data['paid_revenue'], 2) }} €</div>
                        <div class="stat-label">Paid</div>
                    </div>
                </div>
                <div class="stat-box">
                    <div class="stat-inner">
                        <div class="stat-value">{{ number_format($data['unpaid_revenue'], 2) }} €</div>
                        <div class="stat-label">Unpaid</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-row">
                <div class="stat-box">
                    <div class="stat-inner">
                        <div class="stat-value">{{ $data['total_invoices'] }}</div>
                        <div class="stat-label">Total Invoices</div>
                    </div>
                </div>
                <div class="stat-box">
                    <div class="stat-inner">
                        <div class="stat-value">{{ $data['total_clients'] }}</div>
                        <div class="stat-label">Clients</div>
                    </div>
                </div>
                <div class="stat-box">
                    <div class="stat-inner">
                        <div class="stat-value">{{ number_format($data['avg_invoice'], 2) }} €</div>
                        <div class="stat-label">Avg. Invoice Size</div>
                    </div>
                </div>
            </div>
        </div>

        {{-- Monthly breakdown --}}
        <div class="section">
            <div class="section-title">Monthly Breakdown</div>
            <table class="data">
                <thead>
                    <tr>
                        <th>Month</th>
                        <th class="right">Invoices</th>
                        <th class="right">Amount</th>
                        <th class="right">Hours</th>
                    </tr>
                </thead>
                <tbody>
                    @php
                        $monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    @endphp
                    @foreach($data['months'] as $month)
                        <tr class="{{ $month['is_best'] ? 'highlight' : '' }}">
                            <td class="bold">
                                {{ $monthNames[$month['month'] - 1] }}
                                @if($month['is_best']) ★ @endif
                                @if($month['is_worst']) ▽ @endif
                            </td>
                            <td class="right">{{ $month['invoice_count'] }}</td>
                            <td class="right bold">{{ number_format($month['total'], 2) }} €</td>
                            <td class="right">{{ $month['hours'] > 0 ? number_format($month['hours'], 1) . ' h' : '—' }}</td>
                        </tr>
                    @endforeach
                    <tr style="border-top: 2px solid #0054ac;">
                        <td class="bold">TOTAL</td>
                        <td class="right bold">{{ $data['total_invoices'] }}</td>
                        <td class="right bold" style="color: #0054ac;">{{ number_format($data['total_revenue'], 2) }} €</td>
                        <td class="right bold">{{ $data['total_hours'] > 0 ? number_format($data['total_hours'], 1) . ' h' : '—' }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        {{-- Client breakdown --}}
        <div class="section">
            <div class="section-title">Clients</div>
            <table class="data">
                <thead>
                    <tr>
                        <th>Client</th>
                        <th class="right">Invoices</th>
                        <th class="right">Amount</th>
                        <th class="right">Hours</th>
                        <th class="right">% of Total</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($data['clients'] as $client)
                        <tr>
                            <td class="bold">{{ $client['name'] }}</td>
                            <td class="right">{{ $client['invoice_count'] }}</td>
                            <td class="right bold">{{ number_format($client['total'], 2) }} €</td>
                            <td class="right">{{ $client['hours'] > 0 ? number_format($client['hours'], 1) . ' h' : '—' }}</td>
                            <td class="right">{{ $data['total_revenue'] > 0 ? number_format($client['total'] / $data['total_revenue'] * 100, 1) : 0 }}%</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        {{-- Time tracking summary --}}
        @if($data['total_hours'] > 0)
        <div class="section">
            <div class="section-title">Time Tracking</div>
            <div class="summary-box">
                <div class="summary-row">
                    <span class="summary-label">Total Hours: </span>
                    <span class="summary-val">{{ number_format($data['total_hours'], 1) }} h</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Average Hourly Rate: </span>
                    <span class="summary-val">{{ number_format($data['avg_hourly_rate'], 2) }} €/h</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Time Tracking Revenue: </span>
                    <span class="summary-val">{{ number_format($data['time_tracking_revenue'], 2) }} €</span>
                </div>
            </div>
        </div>
        @endif

        {{-- Highlights --}}
        <div class="section">
            <div class="section-title">Highlights</div>
            <div class="summary-box">
                <div class="summary-row">
                    <span class="summary-label">Best Month: </span>
                    <span class="summary-val">
                        @if($data['best_month'])
                            {{ $monthNames[$data['best_month']['month'] - 1] }} — {{ number_format($data['best_month']['total'], 2) }} € ({{ $data['best_month']['invoice_count'] }} inv.)
                        @else
                            —
                        @endif
                    </span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Worst Month: </span>
                    <span class="summary-val">
                        @if($data['worst_month'])
                            {{ $monthNames[$data['worst_month']['month'] - 1] }} — {{ number_format($data['worst_month']['total'], 2) }} € ({{ $data['worst_month']['invoice_count'] }} inv.)
                        @else
                            —
                        @endif
                    </span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Largest Invoice: </span>
                    <span class="summary-val">
                        @if($data['largest_invoice'])
                            {{ $data['largest_invoice']['series'] }} {{ $data['largest_invoice']['number'] }} — {{ number_format($data['largest_invoice']['total'], 2) }} € ({{ $data['largest_invoice']['client'] }})
                        @else
                            —
                        @endif
                    </span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Avg. per Month: </span>
                    <span class="summary-val">{{ number_format($data['avg_monthly'], 2) }} €</span>
                </div>
            </div>
        </div>

        <div class="footer-text">
            Generated {{ now()->format('Y-m-d H:i') }} · {{ $user->name }}
        </div>
    </div>
</body>
</html>
