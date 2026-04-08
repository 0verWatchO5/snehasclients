# Tech Stack

## Runtime and Framework

- Next.js 16.2.2 (App Router)
- React 19.2.4
- TypeScript 5
- Node.js runtime for route handlers

## Authentication

- next-auth 4.24.x
- Credentials Provider (username/password)
- JWT session strategy
- MongoDB adapter for NextAuth persistence

## Data Layer

- MongoDB (official `mongodb` driver used by NextAuth adapter)
- Mongoose 8.19.x for domain models and CRUD

## Security and Crypto

- bcryptjs for password hashing and comparison
- Security headers configured in `vercel.json`

## Styling and UI

- Tailwind CSS v4
- Global CSS tokens in `app/globals.css`
- Geist font family via `next/font/google`

## Tooling

- ESLint 9 + eslint-config-next
- TypeScript strict mode

## Why This Stack Fits the Use Case

- Next.js App Router keeps UI + API in one deployable app.
- NextAuth Credentials is simple for internal admin login.
- Mongoose schema aliases allow compact storage while exposing readable API fields.
- Tailwind allows rapid internal dashboard iteration.
- Vercel header config adds baseline web-hardening controls.
