# FreshMart frontend

FreshMart is a responsive fruit and vegetable storefront with a bold neobrutalist visual system. This frontend repository contains the React application; the Spring Boot API belongs in the separate `BackEnd-` repository.

## Stack and current features

- React, TypeScript, Vite, React Router, Axios, and Lucide React
- Home, shop, product detail, cart, demo checkout, about, contact, privacy, and terms routes
- Search, category filters, price sorting, product details, quantity controls, and cart persistence
- Responsive layouts, keyboard focus indicators, native form validation, and reduced-motion support
- Central Axios API client configured with `VITE_API_BASE_URL`

Product catalog content currently uses clearly illustrative frontend demo data. The checkout confirms a demo order locally; it does not call a payment provider or schedule delivery. Cart data is stored in browser local storage and contains only product display data and quantities.

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

The shared Axios instance is in `src/api.ts`. It uses `withCredentials` for a future HttpOnly refresh-cookie flow and a 12-second timeout. Do not put access/refresh tokens or credentials in local storage. API calls should display safe server messages through `getApiErrorMessage` and retain the demo catalog fallback for development.

The companion backend documents authentication, catalog, cart, address, order, and admin APIs in its README and Postman collection. The backend repository is separate; do not nest it in this folder.

## Repository

Git remote: `https://github.com/bandicharansaireddy/FrontEnd-side.git`
