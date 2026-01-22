<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->series }} {{ $invoice->number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; line-height: 1.4; }
        .page { padding: 0; position: relative; }
        .header-decoration {
            width: 100%;
            height: 100px;
        }
        .footer-decoration {
            width: 100%;
            height: 80px;
            position: fixed;
            bottom: 0;
            left: 0;
        }
        .content { padding: 20px 40px; }
        .header { margin-bottom: 25px; }
        .header h1 { font-size: 26px; color: #1e40af; font-weight: bold; }
        .invoice-info { display: table; width: 100%; margin-bottom: 25px; }
        .invoice-info-left { display: table-cell; width: 50%; vertical-align: top; }
        .invoice-info-right { display: table-cell; width: 50%; text-align: right; vertical-align: top; }
        .invoice-number { font-size: 14px; color: #1e40af; font-weight: bold; }
        .invoice-date { font-size: 12px; color: #64748b; margin-top: 5px; }
        .parties { display: table; width: 100%; margin-bottom: 25px; }
        .party { display: table-cell; width: 50%; padding: 15px; vertical-align: top; background: #f1f5f9; }
        .party:first-child { border-right: 3px solid #3b82f6; }
        .party h3 { font-size: 11px; margin-bottom: 10px; color: #3b82f6; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
        .party p { margin-bottom: 4px; color: #334155; }
        .party strong { color: #0f172a; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table.items th { background: #1e40af; color: #fff; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        table.items td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; color: #334155; }
        table.items tr.even td { background: #f8fafc; }
        table.items .number { width: 50px; text-align: center; }
        table.items .unit { width: 60px; text-align: center; }
        table.items .qty { width: 60px; text-align: center; }
        table.items .price { width: 80px; text-align: right; }
        table.items .total { width: 80px; text-align: right; }
        .totals { text-align: right; margin-bottom: 25px; }
        .totals-box { display: inline-block; background: #eff6ff; padding: 15px 25px; border-left: 4px solid #3b82f6; }
        .grand-total { font-size: 16px; font-weight: bold; color: #1e40af; }
        .notes { margin-bottom: 25px; padding: 15px; background: #eff6ff; border-left: 4px solid #3b82f6; }
        .notes p { color: #334155; margin-bottom: 5px; }
        .notes p:last-child { margin-bottom: 0; }
        .notes strong { color: #1e40af; }
        .signatures { margin-top: 40px; }
        .signature-row { margin-bottom: 15px; }
        .signature-label { color: #334155; }
        .signature-line { display: inline-block; border-bottom: 1px solid #000; min-width: 350px; position: relative; height: 30px; vertical-align: bottom; }
        .signature-name { display: inline-block; padding: 0 10px; vertical-align: bottom; }
        .signature-image { position: absolute; bottom: 0; left: 150px; max-height: 40px; max-width: 150px; }
    </style>
</head>
<body>
    <div class="page">
        <div class="header-decoration">
            <svg width="100%" height="100" viewBox="0 0 600 100" preserveAspectRatio="none">
                <polygon points="0,0 600,0 600,50 400,80 200,50 0,80" fill="#cbd5e1"/>
                <polygon points="0,0 600,0 600,30 450,60 300,40 150,70 0,50" fill="#1e40af"/>
                <polygon points="0,0 250,0 200,40 100,25 0,45" fill="#3b82f6"/>
                <polygon points="600,0 600,35 500,20 400,45 350,25" fill="#3b82f6"/>
            </svg>
        </div>

        <div class="content">
            <div class="header">
                <h1>SĄSKAITA FAKTŪRA</h1>
            </div>

            <div class="invoice-info">
                <div class="invoice-info-left">
                    <div class="invoice-number">Serija {{ $invoice->series }} Nr. {{ str_pad($invoice->number, 7, '0', STR_PAD_LEFT) }}</div>
                </div>
                <div class="invoice-info-right">
                    @php
                        $months = ['sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio', 'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio'];
                        $invoiceMonth = $months[$invoice->invoice_date->format('n') - 1];
                        $dueMonth = $months[$invoice->due_date->format('n') - 1];
                    @endphp
                    <div class="invoice-date">{{ $invoice->invoice_date->format('Y') }} m. {{ $invoiceMonth }} {{ $invoice->invoice_date->format('d') }} d.</div>
                </div>
            </div>

            <div class="parties">
                <div class="party">
                    <h3>Pardavėjas</h3>
                    <p><strong>{{ $invoice->user->name }}</strong></p>
                    @if($invoice->user->company_code)
                        <p>Įmonės kodas / IV pažyma: {{ $invoice->user->company_code }}</p>
                    @endif
                    @if($invoice->user->vat_code)
                        <p>PVM kodas: {{ $invoice->user->vat_code }}</p>
                    @endif
                    @if($invoice->user->address)
                        <p>Adresas: {{ $invoice->user->address }}</p>
                    @endif
                    @if($invoice->user->phone)
                        <p>Tel.: {{ $invoice->user->phone }}</p>
                    @endif
                    @if($invoice->user->email)
                        <p>El. paštas: {{ $invoice->user->email }}</p>
                    @endif
                    @if($invoice->user->bank_name)
                        <p>{{ $invoice->user->bank_name }}</p>
                    @endif
                    @if($invoice->user->bank_account)
                        <p>A/s: {{ $invoice->user->bank_account }}</p>
                    @endif
                </div>
                <div class="party">
                    <h3>Pirkėjas</h3>
                    <p><strong>{{ $invoice->client->name }}</strong></p>
                    @if($invoice->client->company_code)
                        <p>Įmonės kodas / Asmens kodas: {{ $invoice->client->company_code }}</p>
                    @endif
                    @if($invoice->client->vat_code)
                        <p>PVM kodas: {{ $invoice->client->vat_code }}</p>
                    @endif
                    @if($invoice->client->address)
                        <p>Adresas: {{ $invoice->client->address }}</p>
                    @endif
                    @if($invoice->client->phone)
                        <p>Tel.: {{ $invoice->client->phone }}</p>
                    @endif
                    @if($invoice->client->email)
                        <p>El. paštas: {{ $invoice->client->email }}</p>
                    @endif
                </div>
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
                    <tr class="{{ $index % 2 == 1 ? 'even' : '' }}">
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
                <div class="totals-box">
                    <div class="grand-total">Iš viso: {{ number_format($invoice->total, 2) }} €</div>
                </div>
            </div>

            <div class="notes">
                <p><strong>Apmokėti iki:</strong> {{ $invoice->due_date->format('Y') }} m. {{ $dueMonth }} {{ $invoice->due_date->format('d') }} d.</p>
                @if($invoice->notes)
                    <p><strong>Pastabos:</strong> {{ $invoice->notes }}</p>
                @endif
            </div>

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

        <div class="footer-decoration">
            <svg width="100%" height="80" viewBox="0 0 600 80" preserveAspectRatio="none">
                <polygon points="0,30 150,10 300,40 450,5 600,25 600,80 0,80" fill="#cbd5e1"/>
                <polygon points="0,50 200,30 350,55 500,25 600,45 600,80 0,80" fill="#1e40af"/>
                <polygon points="500,50 550,35 600,55 600,80 450,80" fill="#3b82f6"/>
                <polygon points="0,60 50,45 100,65 0,80" fill="#3b82f6"/>
            </svg>
        </div>
    </div>
</body>
</html>
