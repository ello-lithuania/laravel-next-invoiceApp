# Invoice Frontend (Next.js)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy .env.example to .env.local:
```bash
cp .env.example .env.local
```

3. Update API URL in .env.local if needed:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

4. Run development server:
```bash
npm run dev
```

## Build for production

```bash
npm run build
```

This creates static files in `out/` folder that can be deployed to any hosting.

## Deployment to shared hosting

1. Run `npm run build`
2. Upload contents of `out/` folder to your hosting
3. Add .htaccess for routing:

```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

## Features

- User registration/login
- Profile management (seller details)
- Client management (CRUD)
- Invoice management (CRUD)
- PDF export
