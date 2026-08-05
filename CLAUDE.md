# InvoiceApp — project guide

Invoice + time-tracking app for a solo Lithuanian freelancer (recurring clients, ~11–13 €/service, EUR).
Monorepo: **`invoice-api`** (Laravel 11 + Sanctum) and **`invoice-frontend`** (Next.js 16, static export).

## Build / verify
- Frontend: `cd invoice-frontend && npm run build` (static export → `out/`). This type-checks + builds; run it to verify FE changes.
- Backend: `php -l <file>` for syntax; local MySQL is on **port 3307** (often off — migrations then fail with "connection refused", that's expected).
- Don't re-read a file right after editing; Edit/Write already validate.

## Deploy (GitHub Actions → FTP to Hostinger; user deploys themselves)
- `deploy-frontend`: builds, uploads `invoice-frontend/out/` → API-less static host (`mediumspringgreen-…hostingersite.com`).
- `deploy-api`: uploads `invoice-api/` → `plum-viper-529383.hostingersite.com/public_html` (composer name `laravel/invoice-api`).
- Migrations run manually over SSH: `cd ~/domains/plum-viper-529383.hostingersite.com/public_html && php artisan migrate --force && php artisan optimize:clear`.
- **Deploy FE + BE together** — PDF auth uses the `Authorization` header (no `?token=` in URLs); deploying one side alone breaks PDFs.

## Frontend architecture (`invoice-frontend`)
- **Static export** (`next.config.js`: `output:'export'`, `trailingSlash:true`, `images.unoptimized`). `middleware.ts` is DEAD CODE under export — real auth is API-side. Dashboard HTML is public; data is gated by the token.
- **Auth**: Sanctum bearer token in a JS-readable cookie `token` (see `lib/api.ts` get/set/removeToken). 7-day expiry.
- **`lib/api.ts`** = the single API layer. `api()` sends `Authorization` header, `cache:'no-store'`, a **20s timeout (AbortController)** and **retries GETs 3× with backoff** (never retries POST/PUT/DELETE). 401 → clears token + redirects `/login`. `apiBlobUrl()` fetches PDFs as blobs (token in header, not URL); downloads use `triggerDownload()` from `lib/utils.ts`.
- **`lib/utils.ts`**: `formatCurrency` (lt-LT/EUR), `formatDate` ("1 Aug 2026"), `statusColors`/`statusLabels`, `triggerDownload`, and `STATS_REFRESH_EVENT` + `refreshStats()` (fire after any mutation touching totals so the global `StatsBar` refetches).
- **`lib/useRefetchOnReturn.ts`**: refetch a page's data when the tab returns to visible after >30s hidden. Wired on dashboard/invoices/time-tracking/clients/year-summary.
- **Theme system** (`app/globals.css`): dark-first, multiple color themes via `data-theme`/`data-mode` on `<html>` (set pre-hydration by a blocking script in `app/layout.tsx`). Style with the CSS vars — `--t-accent`, `--t-accent-soft`, `--t-bg-card`, `--t-bg-elevated`, `--t-border`, `--t-text`, `--t-text-muted` — and the `t-accent`/`t-text-muted`/`t-card` utilities. **Sharp look**: Tailwind `borderRadius` scale is overridden to 2–4px (pills stay `rounded-full`); `.prism-card` draws a 2px accent line along the card's TOP edge. Support light+dark.
- **Pages** (`app/(dashboard)/…`): dashboard, invoices (+ new/edit), time-tracking, clients (+ view/new/edit), year-summary, activity (audit log), profile, settings. Public landing: `app/(public)/page.tsx`. Fonts are self-hosted via `next/font` (Inter, `--font-inter`).
- Each list page has a desktop `<table>` + a `md:hidden` mobile card view, per-section skeletons, and filter-aware empty states.
- recharts is code-split via `next/dynamic({ssr:false})`.

## Backend architecture (`invoice-api`)
- Every controller scopes queries through `$request->user()->relation()` — keep it that way (IDOR safety). Route-model-bound actions re-check `->user_id`.
- **Statuses** (`invoices.status` DB **enum**): `draft, sent, paid, overdue`. New invoices are ALWAYS created `sent` (store/duplicate/convertToInvoice). **`overdue` = "Won't pay"** (client won't pay): red badge, EXCLUDED from the unpaid list + `unpaid_count`/`unpaid_total`, and clients with an overdue invoice are flagged red (`ClientController` exposes `has_uncollectible` via `withExists` on status=overdue). Adding an enum value needs an `ALTER TABLE … MODIFY … ENUM(…)` migration.
- **Audit log**: `App\Support\Audit::log($event, [...])` (never throws) writes to `audit_logs`; hooked into invoice/client/auth actions. Read via `GET /audit-logs`.
- **Security**: `App\Http\Middleware\SecurityHeaders` (headers + CSP) on the API group; frontend `public/.htaccess` sets headers/CSP for the static host. Rate limiters (`AppServiceProvider`): `login`,`register`,`password-reset`,`api` (60/min), `pdf` (10/min — DomPDF is heavy). API errors forced to JSON (`bootstrap/app.php`) so 500s don't leak HTML.
- **Money-touching writes** use `DB::transaction`; invoice numbering is row-locked (`User::allocateInvoiceNumber`) + a unique `(user_id,series,number)` constraint.
- Time entries: `group_name` (grouping in the time-tracking UI), `is_prepaid`+`invoice_id` (prepaid countdown), `duration_seconds`. PDFs via DomPDF Blade views (`resources/views/invoice*.blade.php`, `year-summary.blade.php`).
- Year-summary **"Hours"** are derived from invoice line items in hour units (`val., val, h, hr, hrs, hour, hours`), NOT from time entries.

## Conventions
- Reference code as `path:line`. Match the surrounding file's style. Use `tabular-nums` for figures.
- The user writes in Lithuanian and deploys/commits themselves ("pats") unless they say otherwise — don't commit/push unless asked.
- Persistent project state (uncommitted work, deploy coupling, migrations to run) lives in the auto-memory under `.claude/projects/…/memory/`.
