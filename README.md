# FreshMart frontend

FreshMart is a responsive fruit and vegetable storefront with a bold neobrutalist visual system. This frontend repository contains the React application; the Spring Boot API belongs in the separate `BackEnd-` repository.

## Stack and current features

- React, TypeScript, Vite, React Router, Axios, and Lucide React
- Home, shop, product detail, cart, checkout, order history, about, contact, privacy, and terms routes
- Registration, email/mobile login, protected account, password change, forgot password, OTP verification, and reset password
- Search, category filters, price sorting, product details, quantity controls, and cart persistence
- Signed-in carts, addresses, unpaid demo checkout, order history, and role-gated admin workspace through the backend API
- Responsive layouts, keyboard focus indicators, native form validation, and reduced-motion support
- Central Axios API client configured with `VITE_API_BASE_URL`

Product catalog content uses illustrative local demo data when the backend is unavailable. Guest checkout confirms a demo order locally; signed-in checkout records an unpaid demo order through the API. Neither path calls a payment provider or schedules delivery. Guest cart data is stored in browser local storage and contains only product display data and quantities; signed-in cart data is kept by the API. Authentication data stays in React memory; refresh tokens stay in the backend's HttpOnly cookie, and reset challenges are not persisted by the browser.

## Prerequisites

- Node.js 20.19+ or 22.12+ (Vite 8 requirement)
- npm
- The FreshMart Spring Boot API for live catalog and account integration

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Vite serves the app at `http://localhost:5173`. Set `VITE_API_BASE_URL` in `.env.local` to the API root (default `http://localhost:8080/api`). Local environment files are ignored by Git.

## Build

```powershell
npm run build
npm run preview
```

## API integration

The shared Axios instance is in `src/api.ts`. It uses `withCredentials`, a 4-second timeout, and in-memory Bearer access tokens with one refresh retry after a 401. The AuthProvider also tries the refresh cookie at app startup. Do not put access/refresh tokens or credentials in local storage. API calls should display safe server messages through `getApiErrorMessage` and retain the demo catalog fallback for development.

The companion backend documents authentication, catalog, cart, address, order, and admin APIs in its README and Postman collection. The backend repository is separate; do not nest it in this folder.

## Repository

Git remote: `https://github.com/bandicharansaireddy/FrontEnd-side.git`
