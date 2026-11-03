# InvoiceApp – invoicing and time tracking for freelancers

Invoices, clients and time tracking for a solo Lithuanian freelancer: recurring clients, EUR, PDF invoices,
prepaid hours and year summaries. Built AI-first with Claude Code.

| Part | Stack |
| --- | --- |
| [`invoice-api`](invoice-api) | Laravel 12, Sanctum (bearer tokens), MySQL, DomPDF |
| [`invoice-frontend`](invoice-frontend) | Next.js 16 static export, TypeScript, Tailwind, recharts |

## Features

- Clients with history; invoices with statuses (draft, sent, paid, won't pay), duplication and catalog items.
- Time tracking with groups and a prepaid-hours countdown that turns into an invoice.
- PDF invoices and a year summary, dashboard statistics, activity / audit log.
- Light and dark themes, mobile card views for every list.

## Engineering notes

- **Tenant safety:** every query is scoped to the signed-in user; route-model actions re-check ownership.
- **Money writes:** wrapped in DB transactions; invoice numbers are allocated under a row lock with a unique
  `(user_id, series, number)` constraint.
- **Abuse limits:** rate limiting for login, registration, password reset, the API (60/min) and PDFs (10/min).
- **API hardening:** security headers and CSP, JSON-only errors.
- **Frontend API layer:** bearer token, 20 s timeout, GET retries with backoff. PDFs are fetched as blobs,
  so the token never appears in a URL.
- **CI / CD:** GitHub Actions builds the static frontend and deploys both parts.

## Running locally

```bash
# API
cd invoice-api
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate
php artisan serve

# Frontend (NEXT_PUBLIC_API_URL points to the API)
cd invoice-frontend
npm install
npm run dev
```
