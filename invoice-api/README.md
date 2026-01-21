# Invoice API (Laravel)

## Installation

1. Copy files to your Laravel project or run:
```bash
composer create-project laravel/laravel invoice-api
```

2. Copy the following folders/files:
- `app/Models/` 
- `app/Http/Controllers/`
- `database/migrations/`
- `routes/api.php`
- `resources/views/invoice.blade.php`
- `config/cors.php`

3. Install dependencies:
```bash
composer require laravel/sanctum barryvdh/laravel-dompdf
```

4. Setup .env:
```
DB_DATABASE=invoice_db
SANCTUM_STATEFUL_DOMAINS=localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

5. Run migrations:
```bash
php artisan migrate
```

6. Start server:
```bash
php artisan serve
```

## API Endpoints

- POST /api/register
- POST /api/login
- POST /api/logout
- GET /api/user
- GET/PUT /api/profile
- GET/POST /api/clients
- GET/PUT/DELETE /api/clients/{id}
- GET/POST /api/invoices
- GET/PUT/DELETE /api/invoices/{id}
- GET /api/invoices/{id}/pdf
