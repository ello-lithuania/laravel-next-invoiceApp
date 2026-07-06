<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Year Summary {{ $year }}</title>
    <style>
        @page { margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-size: 10px; line-height: 1.4; color: #333; font-family: 'Dejavu sans', sans-serif; }
        .header-bar { background: #0054ac; color: #fff; padding: 18px 32px; }
        .header-title { font-size: 18px; font-weight: bold; letter-spacing: 2px; }
        .header-sub { font-size: 11px; margin-top: 4px; opacity: 0.9; }
        .content { padding: 20px 32px; }

        /* Key metric tiles */
        .stats-grid { display: table; width: 100%; border-spacing: 6px; margin: -6px -6px 10px -6px; }
        .stat-row { display: table-row; }
        .stat-box { display: table-cell; width: 33.33%; vertical-align: top; }
        .stat-inner { background: #f5f7fa; border-radius: 5px; padding: 10px 12px; border-left: 3px solid #0054ac; }
        .stat-value { font-size: 16px; font-weight: bold; color: #0054ac; }
        .stat-value.dark { color: #222; }
        .stat-label { font-size: 8px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

        .cols { display: table; width: 100%; border-spacing: 12px 0; margin: 0 -12px; }
        .col { display: table-cell; width: 50%; vertical-align: top; }

        .section-title { font-size: 11px; font-weight: bold; color: #0054ac; border-bottom: 1.5px solid #0054ac; padding-bottom: 4px; margin: 14px 0 8px; text-transform: uppercase; letter-spacing: 1px; }

        table.data { width: 100%; border-collapse: collapse; }
        table.data th { background: #0054ac; color: #fff; padding: 5px 8px; text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        table.data th.right { text-align: right; }
        table.data td { border-bottom: 1px solid #ececec; padding: 4px 8px; color: #333; font-size: 9.5px; }
        table.data td.right { text-align: right; }
        table.data td.bold { font-weight: bold; }
        table.data tr:nth-child(even) td { background: #fafafa; }
        table.data tr.hl td { background: #eef4ff; font-weight: bold; }
        table.data tfoot td { border-top: 1.5px solid #0054ac; font-weight: bold; }

        .hi { background: #f5f7fa; border-left: 3px solid #0054ac; border-radius: 4px; padding: 10px 12px; }
        .hi-row { margin-bottom: 5px; }
        .hi-row:last-child { margin-bottom: 0; }
        .hi-label { color: #666; font-size: 9px; }
        .hi-val { font-weight: bold; color: #222; font-size: 9.5px; }

        .footer-text { text-align: center; color: #999; font-size: 8px; margin-top: 18px; }
    </style>
</head>
<body>
    @php
        $monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        // Only months that actually had invoices — no empty future rows.
        $activeMonths = array_values(array_filter($data['months'], fn ($m) => $m['invoice_count'] > 0));
        $topClients = array_slice($data['clients'], 0, 8);
        $moreClients = max(0, count($data['clients']) - count($topClients));
    @endphp

    <div class="header-bar">
        <div class="header-title">YEAR SUMMARY {{ $year }}</div>
        <div class="header-sub">{{ $user->name }}</div>
    </div>

    <div class="content">
        {{-- Key indicators: what was earned + hours worked, up top --}}
        <div class="stats-grid">
            <div class="stat-row">
                <div class="stat-box"><div class="stat-inner">
                    <div class="stat-value">{{ number_format($data['total_revenue'], 2) }} €</div>
                    <div class="stat-label">Total Earned</div>
                </div></div>
                <div class="stat-box"><div class="stat-inner">
                    <div class="stat-value dark" style="color:#1a8f4c;">{{ number_format($data['paid_revenue'], 2) }} €</div>
                    <div class="stat-label">Paid</div>
                </div></div>
                <div class="stat-box"><div class="stat-inner">
                    <div class="stat-value dark" style="color:#c98a00;">{{ number_format($data['unpaid_revenue'], 2) }} €</div>
                    <div class="stat-label">Unpaid</div>
                </div></div>
            </div>
        </div>
        <div class="stats-grid">
            <div class="stat-row">
                <div class="stat-box"><div class="stat-inner">
                    <div class="stat-value dark">{{ $data['total_invoices'] }}</div>
                    <div class="stat-label">Invoices · {{ $data['total_clients'] }} clients</div>
                </div></div>
                <div class="stat-box"><div class="stat-inner">
                    <div class="stat-value dark">{{ $data['total_hours'] > 0 ? number_format($data['total_hours'], 1) . ' h' : '—' }}</div>
                    <div class="stat-label">Hours Worked</div>
                </div></div>
                <div class="stat-box"><div class="stat-inner">
                    <div class="stat-value dark">{{ number_format($data['avg_monthly'], 2) }} €</div>
                    <div class="stat-label">Avg. / Month</div>
                </div></div>
            </div>
        </div>

        <div class="cols">
            {{-- Monthly breakdown — active months only --}}
            <div class="col">
                <div class="section-title">Monthly Breakdown</div>
                <table class="data">
                    <thead>
                        <tr><th>Month</th><th class="right">Inv.</th><th class="right">Amount</th></tr>
                    </thead>
                    <tbody>
                        @foreach($activeMonths as $month)
                            <tr class="{{ $month['is_best'] ? 'hl' : '' }}">
                                <td class="bold">
                                    {{ $monthNames[$month['month'] - 1] }}
                                    @if($month['is_best']) ★ @endif
                                    @if($month['is_worst']) ▽ @endif
                                </td>
                                <td class="right">{{ $month['invoice_count'] }}</td>
                                <td class="right bold">{{ number_format($month['total'], 2) }} €</td>
                            </tr>
                        @endforeach
                    </tbody>
                    <tfoot>
                        <tr>
                            <td>TOTAL</td>
                            <td class="right">{{ $data['total_invoices'] }}</td>
                            <td class="right" style="color:#0054ac;">{{ number_format($data['total_revenue'], 2) }} €</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {{-- Top clients — no per-client hours, just who earned what --}}
            <div class="col">
                <div class="section-title">Top Clients</div>
                <table class="data">
                    <thead>
                        <tr><th>Client</th><th class="right">Inv.</th><th class="right">Amount</th><th class="right">%</th></tr>
                    </thead>
                    <tbody>
                        @foreach($topClients as $client)
                            <tr>
                                <td class="bold">{{ $client['name'] }}</td>
                                <td class="right">{{ $client['invoice_count'] }}</td>
                                <td class="right bold">{{ number_format($client['total'], 2) }} €</td>
                                <td class="right">{{ $data['total_revenue'] > 0 ? number_format($client['total'] / $data['total_revenue'] * 100, 1) : 0 }}%</td>
                            </tr>
                        @endforeach
                        @if($moreClients > 0)
                            <tr><td colspan="4" style="color:#888; font-style:italic;">+ {{ $moreClients }} more client{{ $moreClients === 1 ? '' : 's' }}</td></tr>
                        @endif
                    </tbody>
                </table>
            </div>
        </div>

        {{-- Highlights --}}
        <div class="section-title">Highlights</div>
        <div class="hi">
            <div class="hi-row">
                <span class="hi-label">Best Month: </span>
                <span class="hi-val">@if($data['best_month']){{ $monthNames[$data['best_month']['month'] - 1] }} — {{ number_format($data['best_month']['total'], 2) }} €@else—@endif</span>
                &nbsp;·&nbsp;
                <span class="hi-label">Worst Month: </span>
                <span class="hi-val">@if($data['worst_month']){{ $monthNames[$data['worst_month']['month'] - 1] }} — {{ number_format($data['worst_month']['total'], 2) }} €@else—@endif</span>
            </div>
            <div class="hi-row">
                <span class="hi-label">Largest Invoice: </span>
                <span class="hi-val">@if($data['largest_invoice']){{ $data['largest_invoice']['series'] }} {{ $data['largest_invoice']['number'] }} — {{ number_format($data['largest_invoice']['total'], 2) }} € ({{ $data['largest_invoice']['client'] }})@else—@endif</span>
            </div>
            @if($data['total_hours'] > 0)
            <div class="hi-row">
                <span class="hi-label">Time Tracking: </span>
                <span class="hi-val">{{ number_format($data['total_hours'], 1) }} h · avg. {{ number_format($data['avg_hourly_rate'], 2) }} €/h · {{ number_format($data['time_tracking_revenue'], 2) }} €</span>
            </div>
            @endif
        </div>

        <div class="footer-text">Generated {{ now()->format('Y-m-d H:i') }} · {{ $user->name }}</div>
    </div>
</body>
</html>
