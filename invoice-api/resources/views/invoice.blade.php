<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->series }} {{ $invoice->number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; line-height: 1.4; padding: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 24px; text-decoration: underline; margin-bottom: 10px; }
        .header .invoice-number { font-size: 14px; margin-bottom: 5px; }
        .header .invoice-date { font-size: 12px; }
        .parties { display: table; width: 100%; margin-bottom: 30px; border: 1px solid #000; }
        .party { display: table-cell; width: 50%; padding: 15px; vertical-align: top; }
        .party:first-child { border-right: 1px solid #000; }
        .party h3 { font-size: 14px; margin-bottom: 10px; text-align: center; }
        .party p { margin-bottom: 5px; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table.items th, table.items td { border: 1px solid #000; padding: 8px; text-align: left; }
        table.items th { background: #f0f0f0; }
        table.items .number { width: 50px; text-align: center; }
        table.items .unit { width: 60px; text-align: center; }
        table.items .qty { width: 60px; text-align: center; }
        table.items .price { width: 80px; text-align: right; }
        table.items .total { width: 80px; text-align: right; }
        .grand-total { text-align: right; font-size: 14px; font-weight: bold; margin-bottom: 30px; }
        .notes { margin-bottom: 30px; }
        .signatures { margin-top: 50px; }
        .signature-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>SĄSKAITA FAKTŪRA</h1>
        <div class="invoice-number">Serija {{ $invoice->series }} Nr. {{ str_pad($invoice->number, 7, '0', STR_PAD_LEFT) }}</div>
        <div class="invoice-date">{{ $invoice->invoice_date->format('Y') }} m. {{ $invoice->invoice_date->translatedFormat('F') }} {{ $invoice->invoice_date->format('d') }} d.</div>
    </div>

    <div class="parties">
        <div class="party">
            <h3>Pardavėjo rekvizitai</h3>
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
                <p>Telefonas: {{ $invoice->user->phone }}</p>
            @endif
            @if($invoice->user->email)
                <p>El. paštas: {{ $invoice->user->email }}</p>
            @endif
            @if($invoice->user->website)
                <p>Svetainė: {{ $invoice->user->website }}</p>
            @endif
            @if($invoice->user->bank_name)
                <p>{{ $invoice->user->bank_name }}</p>
            @endif
            @if($invoice->user->bank_account)
                <p>A/s: {{ $invoice->user->bank_account }}</p>
            @endif
        </div>
        <div class="party">
            <h3>Pirkėjo rekvizitai</h3>
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
                <p>Telefonas: {{ $invoice->client->phone }}</p>
            @endif
            @if($invoice->client->email)
                <p>El. paštas: {{ $invoice->client->email }}</p>
            @endif
        </div>
    </div>

    <table class="items">
        <thead>
            <tr>
                <th class="number">Eil. Nr.</th>
                <th>Prekės ar paslaugos pavadinimas</th>
                <th class="unit">Mato vnt.</th>
                <th class="qty">Kiekis</th>
                <th class="price">Kaina, EUR</th>
                <th class="total">Suma, EUR</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $index => $item)
            <tr>
                <td class="number">{{ $index + 1 }}.</td>
                <td>{{ $item->description }}</td>
                <td class="unit">{{ $item->unit }}</td>
                <td class="qty">{{ $item->quantity }}</td>
                <td class="price">{{ number_format($item->price, 2) }}</td>
                <td class="total">{{ number_format($item->total, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="grand-total">
        Iš viso: {{ number_format($invoice->total, 2) }} EUR
    </div>

    <div class="notes">
        <p>Sąskaitą apmokėti iki: {{ $invoice->due_date->format('Y') }} {{ $invoice->due_date->translatedFormat('F') }} {{ $invoice->due_date->format('d') }} d.</p>
        @if($invoice->notes)
            <p>Papildoma informacija: {{ $invoice->notes }}</p>
        @endif
    </div>

    <div class="signatures">
        <div class="signature-line">
            Sąskaitą išrašė: {{ $invoice->user->name }}
        </div>
        <div class="signature-line">
            Sąskaitą priėmė: _______________________________________________
        </div>
    </div>
</body>
</html>
