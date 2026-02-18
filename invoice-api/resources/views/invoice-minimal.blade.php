<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->series }} {{ $invoice->number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-size: 10px; line-height: 1.6; color: #222; font-family: 'Dejavu sans', sans-serif; }
        .page { padding: 40px; }

        .header { display: table; width: 100%; margin-bottom: 35px; }
        .header-left { display: table-cell; vertical-align: top; width: 60%; }
        .header-right { display: table-cell; vertical-align: top; width: 40%; text-align: right; }
        .doc-title { font-size: 28px; font-weight: bold; color: #000; letter-spacing: -0.5px; }
        .doc-meta { margin-top: 8px; color: #666; font-size: 10px; }
        .doc-meta span { display: block; margin-bottom: 2px; }
        .seller-name { font-size: 11px; font-weight: bold; color: #000; }

        .parties { display: table; width: 100%; margin-bottom: 40px; }
        .party { display: table-cell; width: 50%; vertical-align: top; }
        .party:last-child { padding-left: 30px; }
        .party-label { font-size: 8px; text-transform: uppercase; letter-spacing: 2px; color: #999; margin-bottom: 10px; }
        .party-name { font-size: 12px; font-weight: bold; color: #000; margin-bottom: 6px; }
        .party p { color: #555; font-size: 9px; margin-bottom: 1px; }

        table.items { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        table.items th { border-bottom: 2px solid #000; padding: 8px 0; text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
        table.items td { border-bottom: 1px solid #eee; padding: 10px 0; color: #333; font-size: 10px; }
        table.items .number { width: 30px; }
        table.items .unit { width: 50px; text-align: center; }
        table.items .qty { width: 60px; text-align: center; }
        table.items .price { width: 80px; text-align: right; }
        table.items .total { width: 90px; text-align: right; font-weight: bold; }
        table.items th.unit, table.items th.qty { text-align: center; }
        table.items th.price, table.items th.total { text-align: right; }

        .totals { text-align: right; margin-bottom: 40px; }
        .grand-total { font-size: 18px; font-weight: bold; color: #000; padding-top: 10px; border-top: 2px solid #000; display: inline-block; }

        .notes { margin-bottom: 35px; padding: 12px 0; border-top: 1px solid #eee; }
        .notes p { color: #555; font-size: 9px; margin-bottom: 2px; }
        .notes strong { color: #000; }

        .signatures { margin-top: 50px; }
        .signature-row { margin-bottom: 15px; display: table; width: 100%; }
        .signature-label { color: #999; font-size: 8px; text-transform: uppercase; letter-spacing: 1px; display: table-cell; width: 120px; vertical-align: bottom; }
        .signature-line { display: table-cell; border-bottom: 1px solid #ddd; position: relative; height: 30px; vertical-align: bottom; }
        .signature-name { position: absolute; bottom: 5px; left: 10px; color: #333; font-size: 9px; }
        .signature-image { position: absolute; bottom: -5px; left: 120px; max-height: 35px; max-width: 120px; }

        .footer { height: 3px; background: #000; margin-top: 40px; }
    </style>
</head>
<body>
    <div class="page">
        @php
            $months = ['sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio', 'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio'];
            $invoiceMonth = $months[$invoice->invoice_date->format('n') - 1];
            $dueMonth = $months[$invoice->due_date->format('n') - 1];
        @endphp

        <div class="header">
            <div class="header-left">
                <div class="doc-title">SĄSKAITA FAKTŪRA</div>
                <div class="doc-meta">
                    <span>Serija {{ $invoice->series }} Nr. {{ str_pad($invoice->number, 7, '0', STR_PAD_LEFT) }}</span>
                    <span>{{ $invoice->invoice_date->format('Y') }} m. {{ $invoiceMonth }} {{ $invoice->invoice_date->format('d') }} d.</span>
                </div>
            </div>
            <div class="header-right">
                <div class="seller-name">{{ $invoice->user->name }}</div>
                @if($invoice->user->company_code)
                    <div class="doc-meta"><span>{{ $invoice->user->company_code }}</span></div>
                @endif
            </div>
        </div>

        <div class="parties">
            <div class="party">
                <div class="party-label">Pardavėjas</div>
                <div class="party-name">{{ $invoice->user->name }}</div>
                @if($invoice->user->company_code)<p>Įmonės kodas / IV pažyma: {{ $invoice->user->company_code }}</p>@endif
                @if($invoice->user->vat_code)<p>PVM kodas: {{ $invoice->user->vat_code }}</p>@endif
                @if($invoice->user->address)<p>{{ $invoice->user->address }}</p>@endif
                @if($invoice->user->phone)<p>Tel.: {{ $invoice->user->phone }}</p>@endif
                @if($invoice->user->bank_name)<p>{{ $invoice->user->bank_name }}</p>@endif
                @if($invoice->user->bank_account)<p>{{ $invoice->user->bank_account }}</p>@endif
            </div>
            <div class="party">
                <div class="party-label">Pirkėjas</div>
                <div class="party-name">{{ $invoice->client->name }}</div>
                @if($invoice->client->company_code)<p>Įmonės kodas / Asmens kodas: {{ $invoice->client->company_code }}</p>@endif
                @if($invoice->client->vat_code)<p>PVM kodas: {{ $invoice->client->vat_code }}</p>@endif
                @if($invoice->client->address)<p>{{ $invoice->client->address }}</p>@endif
                @if($invoice->client->phone)<p>Tel.: {{ $invoice->client->phone }}</p>@endif
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
            <div class="grand-total">Iš viso: {{ number_format($invoice->total, 2) }} €</div>
        </div>

        <div class="notes">
            <p><strong>Apmokėti iki:</strong> {{ $invoice->due_date->format('Y') }} m. {{ $dueMonth }} {{ $invoice->due_date->format('d') }} d.</p>
            @if($invoice->notes)
                <p><strong>Pastabos:</strong> {{ $invoice->notes }}</p>
            @endif
        </div>

        <div class="signatures">
            <div class="signature-row">
                <span class="signature-label">Sąskaitą išrašė</span>
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
                <span class="signature-label">Sąskaitą priėmė</span>
                <span class="signature-line"></span>
            </div>
        </div>
    </div>
    <div class="footer"></div>
</body>
</html>
