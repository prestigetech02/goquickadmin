# GoQuick Admin

Production admin for GoQuick. React SPA on Laravel `/api/v1/admin/*`. Host: `https://admin.goquickapp.com.ng`.

## Local setup

```bash
cd goquick-admin
npm install
```

`.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
VITE_LANDING_URL=https://goquickapp.com.ng
```

```bash
php artisan serve   # from backend/
npm run dev         # http://127.0.0.1:5175
```

## Production build

`VITE_*` is baked in at **build time**. Do not ship a dist built against localhost.

`.env.production`:

```env
VITE_API_BASE_URL=https://api.goquickapp.com.ng/api/v1
VITE_LANDING_URL=https://goquickapp.com.ng
```

```bash
npm ci
npm run build
```

Upload **contents of `dist/`** (the folder that contains `index.html`) to the aaPanel site root. Keep the previous folder as rollback, then switch **Site directory**.

Nginx SPA fallback:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Deploy matching **backend** changes first (`php artisan migrate --force` on the API host). CORS already allows `https://admin.goquickapp.com.ng`.

Do not upload `src/`, `node_modules/`, or a `.env` with `127.0.0.1`.

## Notes

- No admin self-signup; accounts are provisioned by a super admin
- Auth is Sanctum bearer tokens (`/admin/auth/login`, `/me`, `/logout`)
- Remaining product gaps: [`docs/GOQUICK_ADMIN_MISSING_BACKLOG.md`](../docs/GOQUICK_ADMIN_MISSING_BACKLOG.md)
