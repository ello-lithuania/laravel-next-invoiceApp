<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->series }} {{ $invoice->number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-size: 11px; line-height: 1.5; color: #333; font-family: 'Dejavu sans', sans-serif; }
        .page { position: relative; min-height: 100%; }
        .header-bar { background: #0054ac; color: #fff; padding: 30px 40px; text-align: center; }
        .header-title { font-size: 24px; font-weight: bold; letter-spacing: 2px; }
        .header-info { font-size: 11px; margin-top: 10px; opacity: 0.9; }
        .content { padding: 40px 40px; }
        .parties { display: table; width: 100%; margin-bottom: 40px; }
        .party { display: table-cell; width: 50%; vertical-align: top; padding-right: 20px; }
        .party:last-child { padding-right: 0; padding-left: 20px; }
        .party-label { font-size: 10px; color: #333; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 2px solid #0054ac; display: inline-block; }
        .party-name { font-size: 13px; color: #000; font-weight: bold; margin-bottom: 5px; }
        .party p { margin-bottom: 2px; color: #555; font-size: 10px; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 35px; }
        table.items th { background: #0054ac; color: #fff; padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        table.items td { border-bottom: 1px solid #e5e5e5; padding: 10px 12px; color: #333; }
        table.items tr:nth-child(even) td { background: #f9f9f9; }
        table.items .number { width: 40px; text-align: center; }
        table.items .unit { width: 50px; text-align: center; }
        table.items .qty { width: 60px; text-align: center; }
        table.items .price { width: 80px; text-align: right; }
        table.items .total { width: 90px; text-align: right; }
        .totals { text-align: right; margin-bottom: 40px; }
        .totals-box { display: inline-block; text-align: right; }
        .grand-total { font-size: 14px; font-weight: bold; color: #0054ac; padding-top: 8px; border-top: 2px solid #0054ac; margin-top: 5px; }
        .notes { margin-bottom: 40px; padding: 12px 15px; background: #f5f7fa; border-left: 3px solid #0054ac; }
        .notes p { color: #555; margin-bottom: 3px; font-size: 10px; }
        .notes p:last-child { margin-bottom: 0; }
        .notes strong { color: #000; }
        .signatures { margin-top: 50px; }
        .signature-row { margin-bottom: 15px; display: table; width: 100%; }
        .signature-label { color: #666; font-size: 10px; display: table-cell; width: 120px; vertical-align: bottom; }
        .signature-line { display: table-cell; border-bottom: 1px solid #ccc; position: relative; height: 30px; vertical-align: bottom; }
        .signature-name { position: absolute; bottom: 5px; left: 10px; color: #333; font-size: 10px; }
        .signature-image { position: absolute; bottom: -5px; left: 120px; max-height: 35px; max-width: 120px; }
        .footer-bar { background: #0054ac; height: 40px; position: fixed; bottom: 0; left: 0; right: 0; }
    </style>
</head>
<body>
    <div class="page">
        @php
            $months = ['sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio', 'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio'];
            $invoiceMonth = $months[$invoice->invoice_date->format('n') - 1];
            $dueMonth = $months[$invoice->due_date->format('n') - 1];
        @endphp
        <div class="header-bar">
            <div class="header-title">SĄSKAITA FAKTŪRA</div>
            <div class="header-info">Serija {{ $invoice->series }} Nr. {{ str_pad($invoice->number, 7, '0', STR_PAD_LEFT) }} | {{ $invoice->invoice_date->format('Y') }} m. {{ $invoiceMonth }} {{ $invoice->invoice_date->format('d') }} d.</div>
        </div>

        <div class="content">
            <div class="parties">
                <div class="party">
                    <div class="party-label">Pardavėjas</div>
                    <div class="party-name">{{ $invoice->user->name }}</div>
                    @if($invoice->user->company_code)
                        <p>Įmonės kodas / IV pažyma: {{ $invoice->user->company_code }}</p>
                    @endif
                    @if($invoice->user->vat_code)
                        <p>PVM kodas: {{ $invoice->user->vat_code }}</p>
                    @endif
                    @if($invoice->user->address)
                        <p>{{ $invoice->user->address }}</p>
                    @endif
                    @if($invoice->user->phone)
                        <p>Tel.: {{ $invoice->user->phone }}</p>
                    @endif
                    @if($invoice->user->bank_name)
                        <p>{{ $invoice->user->bank_name }}</p>
                    @endif
                    @if($invoice->user->bank_account)
                        <p>{{ $invoice->user->bank_account }}</p>
                    @endif
                </div>
                <div class="party">
                    <div class="party-label">Pirkėjas</div>
                    <div class="party-name">{{ $invoice->client->name }}</div>
                    @if($invoice->client->company_code)
                        <p>Įmonės kodas / Asmens kodas: {{ $invoice->client->company_code }}</p>
                    @endif
                    @if($invoice->client->vat_code)
                        <p>PVM kodas: {{ $invoice->client->vat_code }}</p>
                    @endif
                    @if($invoice->client->address)
                        <p>{{ $invoice->client->address }}</p>
                    @endif
                    @if($invoice->client->phone)
                        <p>Tel.: {{ $invoice->client->phone }}</p>
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
                                <img src="data:image/png;base64,{{ $signatureData }}" class="signature-image" alt="Parasas">
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

        <div class="footer-bar"></div>
    </div>
</body>
</html>
