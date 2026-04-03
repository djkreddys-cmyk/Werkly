# Werkly Railway Backend

This backend is designed to work with the existing Next.js frontend on Vercel.

## What it provides

- `POST /auth/login`
- `GET /jobs`
- `GET /jobs/:slug`
- `POST /admin/jobs`
- `PUT /admin/jobs/:id`
- `DELETE /admin/jobs/:id`

## 1. Install dependencies

```bash
npm install
```

## 2. Create the database table

Run the SQL in [schema.sql](./schema.sql) against your Railway PostgreSQL database.

## 3. Hash the admin password

For the credentials you asked for:

- email: `hr@werkly.in`
- password: `Werkly@7779`

Generate the password hash locally:

```bash
npm run hash-password -- Werkly@7779
```

Copy the output hash into `ADMIN_PASSWORD_HASH`.

## 4. Set Railway environment variables

```env
PORT=4000
DATABASE_URL=your_railway_postgres_url
ADMIN_EMAIL=hr@werkly.in
ADMIN_PASSWORD_HASH=your_bcrypt_hash
JWT_SECRET=replace_with_a_long_random_secret
CORS_ORIGIN=https://www.werkly.in
```

## 5. Run locally

```bash
npm run dev
```

## 6. Connect the frontend

Set these in your Vercel project:

```env
RAILWAY_API_BASE_URL=https://your-railway-service.up.railway.app
NEXT_PUBLIC_RAILWAY_API_BASE_URL=https://your-railway-service.up.railway.app
```

## Notes

- Do not put admin credentials in frontend code.
- The frontend already has demo fallback jobs if Railway is not configured yet.
- The admin dashboard in the frontend stores the JWT token in local storage after login.
