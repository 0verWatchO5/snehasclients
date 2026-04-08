# API Reference

All customer management endpoints require an authenticated session.

## Auth

### GET/POST `/api/auth/[...nextauth]`

Purpose: NextAuth handler endpoint for credential sign-in, callbacks, and session handling.

Response: Managed internally by NextAuth.

## Customers

### POST `/api/add-customer`

Purpose: Create a new customer document.

Auth: Required.

Request body: Customer object using readable alias names.

Success:
- `201` with created customer JSON.

Errors:
- `401` Unauthorized.
- `409` Duplicate policy number.
- `400` Validation/invalid payload.

### GET `/api/search`

Purpose: Search customers by query params.

Auth: Required.

Supported query params:
- `surname`
- `policyNumber`
- `mobileNumber`
- `customerCode`

Success:
- `200` with array of matching customers.

Errors:
- `401` Unauthorized.
- `500` Search failure.

### PUT `/api/update-customer`

Purpose: Update an existing customer.

Auth: Required.

Request body:
- `id` (required)
- other customer fields to update (alias-style readable fields)

Server behavior:
- Removes compact DB keys (`phn`, `a`, `mob`, etc.) from payload.
- Removes immutable/system keys (`_id`, `createdAt`, `updatedAt`).
- Updates using validators and alias translation.

Success:
- `200` with updated customer JSON.

Errors:
- `401` Unauthorized.
- `400` Missing id or invalid update.
- `404` Customer not found.
- `409` Duplicate policy number.

### DELETE `/api/delete-customer`

Purpose: Delete customer by id.

Auth: Required.

Request body:
- `id` (required)

Success:
- `200` with success message.

Errors:
- `401` Unauthorized.
- `400` Missing id or invalid request.
- `404` Customer not found.

## Development Utility

### POST `/api/dev/seed-admin`

Purpose: Create initial local admin user for development.

Availability:
- Only when `NODE_ENV=development`.

Protection:
- Requires header `x-seed-key` matching `SEED_ADMIN_KEY`.

Request body:
- `username` (optional, default `admin`)
- `password` (optional, default `admin123`)
- `email` (optional)

Success:
- `201` Admin created.
- `200` User already exists.

Errors:
- `404` if not development mode.
- `401` if seed key invalid.
- `400` if username/password missing.
- `500` if server/env failure.
