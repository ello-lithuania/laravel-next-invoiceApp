<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Metinė suvestinė {{ $year }}</title>
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

        .months-grid { display: table; width: 100%; }
        .months-row { display: table-row; }
        .month-cell { display: table-cell; width: 8.33%; padding: 3px; text-align: center; vertical-align: top; }
        .month-inner { background: #f5f7fa; border-radius: 4px; padding: 8px 4px; }
        .month-name { font-size: 8px; color: #666; text-transform: uppercase; }
        .month-amount { font-size: 9px; font-weight: bold; color: #333; margin-top: 2px; }
        .month-count { font-size: 7px; color: #999; }
        .month-best .month-inner { background: #d4edda; border: 1px solid #28a745; }
        .month-worst .month-inner { background: #fff3cd; border: 1px solid #ffc107; }

        .summary-box { background: #f5f7fa; padding: 15px; border-left: 3px solid #0054ac; margin-top: 20px; border-radius: 4px; }
        .summary-row { margin-bottom: 5px; }
        .summary-label { color: #666; font-size: 10px; }
        .summary-val { font-weight: bold; color: #333; }

        .footer-bar { background: #0054ac; height: 30px; position: fixed; bottom: 0; left: 0; right: 0; }
        .footer-text { text-align: center; color: #999; font-size: 8px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="header-bar">
        <div class="header-title">METINĖ SUVESTINĖ</div>
        <div class="header-sub">{{ $user->name }} · {{ $year }} m.</div>
    </div>

    <div class="content">
        {{-- Key metrics --}}
        <div class="stats-grid">
            <div class="stat-row">
                <div class="stat-box">
                    <div class="stat-inner">
                        <div class="stat-value">{{ number_format($data['total_revenue'], 2) }} €</div>
                        <div class="stat-label">Visos pajamos</div>
                    </div>
                </div>
                <div class="stat-box">
                    <div class="stat-inner">
                        <div class="stat-value">{{ number_format($data['paid_revenue'], 2) }} €</div>
                        <div class="stat-label">Apmokėta</div>
                    </div>
                </div>
                <div class="stat-box">
                    <div class="stat-inner">
                        <div class="stat-value">{{ number_format($data['unpaid_revenue'], 2) }} €</div>
                        <div class="stat-label">Neapmokėta</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-row">
                <div class="stat-box">
                    <div class="stat-inner">
                        <div class="stat-value">{{ $data['total_invoices'] }}</div>
                        <div class="stat-label">Iš viso sąskaitų</div>
                    </div>
                </div>
                <div class="stat-box">
                    <div class="stat-inner">
                        <div class="stat-value">{{ $data['total_clients'] }}</div>
                        <div class="stat-label">Klientų</div>
                    </div>
                </div>
                <div class="stat-box">
                    <div class="stat-inner">
                        <div class="stat-value">{{ number_format($data['avg_invoice'], 2) }} €</div>
                        <div class="stat-label">Vid. sąskaitos dydis</div>
                    </div>
                </div>
            </div>
        </div>

        {{-- Monthly breakdown --}}
        <div class="section">
            <div class="section-title">Mėnesių suvestinė</div>
            <table class="data">
                <thead>
                    <tr>
                        <th>Mėnuo</th>
                        <th class="right">Sąskaitos</th>
                        <th class="right">Suma</th>
                        <th class="right">Valandos</th>
                    </tr>
                </thead>
                <tbody>
                    @php
                        $monthNames = ['Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis', 'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'];
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
                            <td class="right">{{ $month['hours'] > 0 ? number_format($month['hours'], 1) . ' val.' : '—' }}</td>
                        </tr>
                    @endforeach
                    <tr style="border-top: 2px solid #0054ac;">
                        <td class="bold">IŠ VISO</td>
                        <td class="right bold">{{ $data['total_invoices'] }}</td>
                        <td class="right bold" style="color: #0054ac;">{{ number_format($data['total_revenue'], 2) }} €</td>
                        <td class="right bold">{{ $data['total_hours'] > 0 ? number_format($data['total_hours'], 1) . ' val.' : '—' }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        {{-- Client breakdown --}}
        <div class="section">
            <div class="section-title">Klientai</div>
            <table class="data">
                <thead>
                    <tr>
                        <th>Klientas</th>
                        <th class="right">Sąskaitos</th>
                        <th class="right">Suma</th>
                        <th class="right">Valandos</th>
                        <th class="right">% nuo viso</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($data['clients'] as $client)
                        <tr>
                            <td class="bold">{{ $client['name'] }}</td>
                            <td class="right">{{ $client['invoice_count'] }}</td>
                            <td class="right bold">{{ number_format($client['total'], 2) }} €</td>
                            <td class="right">{{ $client['hours'] > 0 ? number_format($client['hours'], 1) . ' val.' : '—' }}</td>
                            <td class="right">{{ $data['total_revenue'] > 0 ? number_format($client['total'] / $data['total_revenue'] * 100, 1) : 0 }}%</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        {{-- Time tracking summary --}}
        @if($data['total_hours'] > 0)
        <div class="section">
            <div class="section-title">Laiko suvestinė</div>
            <div class="summary-box">
                <div class="summary-row">
                    <span class="summary-label">Iš viso valandų: </span>
                    <span class="summary-val">{{ number_format($data['total_hours'], 1) }} val.</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Vidutinis valandinis įkainis: </span>
                    <span class="summary-val">{{ number_format($data['avg_hourly_rate'], 2) }} €/val.</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Pajamos iš laiko sekimo: </span>
                    <span class="summary-val">{{ number_format($data['time_tracking_revenue'], 2) }} €</span>
                </div>
            </div>
        </div>
        @endif

        {{-- Highlights --}}
        <div class="section">
            <div class="section-title">Metų akcentai</div>
            <div class="summary-box">
                <div class="summary-row">
                    <span class="summary-label">Geriausias mėnuo: </span>
                    <span class="summary-val">
                        @if($data['best_month'])
                            {{ $monthNames[$data['best_month']['month'] - 1] }} — {{ number_format($data['best_month']['total'], 2) }} € ({{ $data['best_month']['invoice_count'] }} sąsk.)
                        @else
                            —
                        @endif
                    </span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Blogiausias mėnuo: </span>
                    <span class="summary-val">
                        @if($data['worst_month'])
                            {{ $monthNames[$data['worst_month']['month'] - 1] }} — {{ number_format($data['worst_month']['total'], 2) }} € ({{ $data['worst_month']['invoice_count'] }} sąsk.)
                        @else
                            —
                        @endif
                    </span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Didžiausia sąskaita: </span>
                    <span class="summary-val">
                        @if($data['largest_invoice'])
                            {{ $data['largest_invoice']['series'] }} {{ $data['largest_invoice']['number'] }} — {{ number_format($data['largest_invoice']['total'], 2) }} € ({{ $data['largest_invoice']['client'] }})
                        @else
                            —
                        @endif
                    </span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Vid. per mėnesį: </span>
                    <span class="summary-val">{{ number_format($data['avg_monthly'], 2) }} €</span>
                </div>
            </div>
        </div>

        <div class="footer-text">
            Sugeneruota {{ now()->format('Y-m-d H:i') }} · {{ $user->name }}
        </div>
    </div>

    <div class="footer-bar"></div>
</body>
</html>
