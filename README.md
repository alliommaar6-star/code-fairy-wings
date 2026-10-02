# Benadir Store - Enterprise POS, Financial Engine & Customer Portal

Modern, standalone, full-stack POS and ERP system built with React, Node.js, and PostgreSQL.

## Architecture

```
Frontend (React 19 + Tailwind CSS)
   ↓
REST API Backend (/api/*)
   ↓
Authentication & Authorization (PBKDF2 + Secure Sessions)
   ↓
PostgreSQL Central Database
```

## Features

- **Point of Sale (POS)**: Barcode scanning, multi-item cart, discounts, quick sale.
- **Inventory & Restocking**: Stock tracking, cost layers, SKU generation.
- **Sales & Orders**: Order processing, delivery dispatch, regional cargo logistics.
- **Customer Portal**: Shareable customer links (`/p/:token`) for live tracking and Somali payment methods (EVC Plus, e-Dahab, Jeeb).
- **Financial Engine & Accounting**: Automated double-entry bookkeeping, trial balance, P&L, balance sheet, petty cash ledger.
- **Multi-Account Cash Management**: Real-time tracking of Cash Drawers, EVC Plus, and Bank reserves.
- **Staff Access Control**: Role-based permissions (Owner, Admin, Staff).

## Running with Docker

```sh
docker compose up -d
```

This starts:
1. PostgreSQL database with persistent volume.
2. Node.js backend application on port 3000.

## Environment Variables

See `.env.example`:

```sh
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/benadir_pos
SYSTEM_KEY=change-me-to-a-secure-random-key
PORT=3000
CORS_ORIGIN=http://localhost:3000
```
