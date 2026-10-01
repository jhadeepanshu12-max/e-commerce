# Nova Commerce — Multi-Tenant E-commerce SaaS

A scalable multi-tenant commerce platform with a customer storefront, tenant admin panel, and platform-level administration.

## Structure

- `backend/` — Express + MongoDB API
- `frontend/storefront/` — customer storefront
- `frontend/admin/` — tenant/admin control panel
- `mobile/` — mobile application workspace

## Local setup

### 1. Backend

```bash
cd backend
npm install
copy .env.example .env
# Fill MongoDB/JWT/Razorpay values in .env
npm test
npm run dev
```

### 2. Admin

```bash
cd frontend/admin
npm install
copy .env.example .env
npm run dev
```

### 3. Storefront

```bash
cd frontend/storefront
npm install
copy .env.example .env
npm run dev
```

The backend defaults to `http://localhost:5000/api/v1`.

## Security

Never commit `.env` files, API keys, Razorpay secrets, JWT secrets, or database credentials. Use the provided `.env.example` files.
