<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->series }} {{ $invoice->number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-size: 10px; line-height: 1.5; color: #333; font-family: 'Dejavu sans', sans-serif; background: #fff; }

        .sidebar-bg { position: fixed; top: 0; left: 0; bottom: 0; width: 200px; background: #1a1a2e; }

        .sidebar { position: fixed; top: 0; left: 0; width: 200px; padding: 40px 25px; color: #fff; }
        .sidebar-title { font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #7c5bf5; margin-bottom: 30px; }
        .sidebar-section { margin-bottom: 25px; }
        .sidebar-label { font-size: 7px; text-transform: uppercase; letter-spacing: 1.5px; color: #7c5bf5; margin-bottom: 8px; }
        .sidebar-name { font-size: 11px; font-weight: bold; color: #fff; margin-bottom: 4px; }
        .sidebar-text { font-size: 8px; color: #aaa; line-height: 1.6; margin-bottom: 1px; }
        .sidebar-divider { height: 1px; background: #333; margin: 20px 0; }
        .sidebar-total-label { font-size: 7px; text-transform: uppercase; letter-spacing: 1.5px; color: #7c5bf5; margin-bottom: 5px; }
        .sidebar-total { font-size: 22px; font-weight: bold; color: #fff; }

        .main { margin-left: 200px; padding: 40px 35px; }

        .header { margin-bottom: 35px; }
        .doc-label { font-size: 7px; text-transform: uppercase; letter-spacing: 2px; color: #999; }
        .doc-title { font-size: 22px; font-weight: bold; color: #1a1a2e; margin-top: 5px; }
        .doc-meta { margin-top: 8px; }
        .doc-meta-row { display: table; width: 100%; margin-bottom: 3px; }
        .doc-meta-label { display: table-cell; width: 100px; color: #999; font-size: 9px; }
        .doc-meta-value { display: table-cell; color: #333; font-size: 9px; font-weight: bold; }

        .buyer { margin-bottom: 30px; padding: 15px; background: #f8f8fc; border-radius: 4px; border-left: 3px solid #7c5bf5; }
        .buyer-label { font-size: 7px; text-transform: uppercase; letter-spacing: 1.5px; color: #7c5bf5; margin-bottom: 8px; }
        .buyer-name { font-size: 12px; font-weight: bold; color: #1a1a2e; margin-bottom: 4px; }
        .buyer p { color: #666; font-size: 9px; margin-bottom: 1px; }

        table.items { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        table.items th { padding: 10px 8px; text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; border-bottom: 2px solid #7c5bf5; }
        table.items td { padding: 10px 8px; color: #333; font-size: 10px; border-bottom: 1px solid #f0f0f0; }
        table.items .number { width: 30px; text-align: center; }
        table.items .unit { width: 40px; text-align: center; }
        table.items .qty { width: 50px; text-align: center; }
        table.items .price { width: 70px; text-align: right; }
        table.items .total { width: 80px; text-align: right; font-weight: bold; color: #1a1a2e; }
        table.items th.unit, table.items th.qty { text-align: center; }
        table.items th.price, table.items th.total { text-align: right; }

        .totals { text-align: right; margin-bottom: 30px; padding-top: 10px; }
        .grand-total { font-size: 16px; font-weight: bold; color: #7c5bf5; padding-top: 8px; border-top: 2px solid #7c5bf5; display: inline-block; margin-top: 5px; }

        .notes { margin-bottom: 30px; padding: 12px 15px; background: #f8f8fc; border-left: 3px solid #7c5bf5; border-radius: 4px; }
        .notes p { color: #555; font-size: 9px; margin-bottom: 2px; }
        .notes strong { color: #1a1a2e; }

        .signatures { margin-top: 40px; }
        .signature-row { margin-bottom: 15px; display: table; width: 100%; }
        .signature-label { color: #999; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; display: table-cell; width: 110px; vertical-align: bottom; }
        .signature-line { display: table-cell; border-bottom: 1px solid #ddd; position: relative; height: 30px; vertical-align: bottom; }
        .signature-name { position: absolute; bottom: 5px; left: 10px; color: #333; font-size: 9px; }
        .signature-image { position: absolute; bottom: -5px; left: 110px; max-height: 35px; max-width: 120px; }
    </style>
</head>
<body>
    @php
        $months = ['sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio', 'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio'];
        $invoiceMonth = $months[$invoice->invoice_date->format('n') - 1];
        $dueMonth = $months[$invoice->due_date->format('n') - 1];
    @endphp

    <div class="sidebar-bg"></div>

    <div class="sidebar">
        <div class="sidebar-title">Sąskaita</div>

        <div class="sidebar-section">
            <div class="sidebar-label">Pardavėjas</div>
            <div class="sidebar-name">{{ $invoice->user->name }}</div>
            @if($invoice->user->company_code)<div class="sidebar-text">{{ $invoice->user->company_code }}</div>@endif
            @if($invoice->user->vat_code)<div class="sidebar-text">PVM: {{ $invoice->user->vat_code }}</div>@endif
            @if($invoice->user->address)<div class="sidebar-text">{{ $invoice->user->address }}</div>@endif
            @if($invoice->user->phone)<div class="sidebar-text">{{ $invoice->user->phone }}</div>@endif
        </div>

        <div class="sidebar-divider"></div>

        @if($invoice->user->bank_name || $invoice->user->bank_account)
        <div class="sidebar-section">
            <div class="sidebar-label">Bankas</div>
            @if($invoice->user->bank_name)<div class="sidebar-text">{{ $invoice->user->bank_name }}</div>@endif
            @if($invoice->user->bank_account)<div class="sidebar-text" style="color:#fff; font-size:9px;">{{ $invoice->user->bank_account }}</div>@endif
        </div>

        <div class="sidebar-divider"></div>
        @endif

        <div class="sidebar-section">
            <div class="sidebar-total-label">Iš viso</div>
            <div class="sidebar-total">{{ number_format($invoice->total, 2) }} €</div>
        </div>

        <div class="sidebar-divider"></div>

        <div class="sidebar-section">
            <div class="sidebar-label">Apmokėti iki</div>
            <div class="sidebar-text" style="color:#fff; font-size:10px;">{{ $invoice->due_date->format('Y-m-d') }}</div>
        </div>
    </div>

    <div class="main">
        <div class="header">
            <div class="doc-label">Sąskaita faktūra</div>
            <div class="doc-title">{{ $invoice->series }} {{ str_pad($invoice->number, 7, '0', STR_PAD_LEFT) }}</div>
            <div class="doc-meta">
                <div class="doc-meta-row">
                    <span class="doc-meta-label">Data:</span>
                    <span class="doc-meta-value">{{ $invoice->invoice_date->format('Y') }} m. {{ $invoiceMonth }} {{ $invoice->invoice_date->format('d') }} d.</span>
                </div>
                <div class="doc-meta-row">
                    <span class="doc-meta-label">Mokėti iki:</span>
                    <span class="doc-meta-value">{{ $invoice->due_date->format('Y') }} m. {{ $dueMonth }} {{ $invoice->due_date->format('d') }} d.</span>
                </div>
            </div>
        </div>

        <div class="buyer">
            <div class="buyer-label">Pirkėjas</div>
            <div class="buyer-name">{{ $invoice->client->name }}</div>
            @if($invoice->client->company_code)<p>Įmonės kodas: {{ $invoice->client->company_code }}</p>@endif
            @if($invoice->client->vat_code)<p>PVM kodas: {{ $invoice->client->vat_code }}</p>@endif
            @if($invoice->client->address)<p>{{ $invoice->client->address }}</p>@endif
            @if($invoice->client->phone)<p>Tel.: {{ $invoice->client->phone }}</p>@endif
        </div>

        <table class="items">
            <thead>
                <tr>
                    <th class="number">Nr.</th>
                    <th>Pavadinimas</th>
                    <th class="unit">Vnt.</th>
                    <th class="qty">Kiekis</th>
                    <th class="price">Kaina</th>
                    <th class="total">Suma</th>
                </tr>
            </thead>
            <tbody>
                @foreach($invoice->items as $index => $item)
                <tr>
                    <td class="number">{{ $index + 1 }}</td>
                    <td>{{ $item->description }}</td>
                    <td class="unit">{{ $item->unit }}</td>
                    <td class="qty">{{ $item->quantity }}</td>
                    <td class="price">{{ number_format($item->price, 2) }} €</td>
                    <td class="total">{{ number_format($item->total, 2) }} €</td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <div class="totals">
            <div class="grand-total">Iš viso: {{ number_format($invoice->total, 2) }} €</div>
        </div>

        @if($invoice->notes)
        <div class="notes">
            <p><strong>Pastabos:</strong> {{ $invoice->notes }}</p>
        </div>
        @endif

        <div class="signatures">
            <div class="signature-row">
                <span class="signature-label">Sąskaitą išrašė:</span>
                <span class="signature-line">
                    <span class="signature-name">{{ $invoice->user->name }}</span>
                    @if($invoice->user->signature)
                        @php
                            $signaturePath = storage_path('app/public/signatures/' . $invoice->user->signature);
                            $signatureData = '';
                            if (file_exists($signaturePath)) {
                                $signatureData = base64_encode(file_get_contents($signaturePath));
                            }
                        @endphp
                        @if($signatureData)
                            <img src="data:image/png;base64,{{ $signatureData }}" class="signature-image" alt="Parašas">
                        @endif
                    @endif
                </span>
            </div>
            <div class="signature-row">
                <span class="signature-label">Sąskaitą priėmė:</span>
                <span class="signature-line"></span>
            </div>
        </div>
    </div>
</body>
</html>
