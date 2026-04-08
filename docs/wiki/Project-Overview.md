# Project Overview

## What This Project Is

SnehasClients is an internal insurance admin dashboard used to:

- Authenticate admin users.
- Search and review customer policy records.
- Add new customer records.
- Edit existing records.
- Delete customer records.

The app uses Next.js App Router for both UI pages and API route handlers, with MongoDB as the data store.

## Business Context

Insurance operations often need lightweight tools to maintain customer-policy metadata without exposing full core systems. This project works as a focused admin workspace with a narrow scope:

- Maintain policy-holder profile details.
- Maintain policy commercial details (sum assured, premium, term, mode).
- Track provider and policy dates.
- Support rapid search by surname, policy number, mobile number, or customer code.

## Main User Role

- Admin user (credential-based login).

No public end-user flow is implemented.

## High-Level Features

- Admin login page at `/`.
- Admin dashboard at `/admin`.
- Add customer page at `/admin/add-customer`.
- Authenticated API routes for customer CRUD.
- Development-only admin bootstrap endpoint.

## Current Constraints and Scope

- Uses only local credentials auth (`idp: LOCAL`) in current behavior.
- Single app role model (admin-style internal usage).
- No pagination on customer list yet.
- No audit-log collection yet.
- Basic client-side UX messages; no advanced toast/notification system.
