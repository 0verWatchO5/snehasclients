# Auth and Security

## Authentication Model

The app uses NextAuth v4 with Credentials provider.

### Credential Validation

- User enters username/password on `/`.
- `authorize()` in `lib/auth.js`:
  - connects with Mongoose,
  - fetches local user by `{ username, idp: "LOCAL" }`,
  - compares plaintext password against `passwordHash` with bcrypt.

If valid, returns normalized user object for JWT/session.

### Session Strategy

- `strategy: "jwt"`
- JWT callback stores `id` and `idp`.
- Session callback projects token fields to `session.user`.

## Authorization Model

### Client Routing Guard

Admin pages use `useSession({ required: true })` and redirect unauthenticated users to `/`.

### API Guard (Critical)

Each admin API route calls `getServerSession(authOptions)` and returns `401` if missing.

This ensures direct API calls cannot bypass UI checks.

## Password Security

- Hashing algorithm: bcrypt (cost factor 12 in seed route).
- Passwords are never stored in plaintext.

## HTTP Security Headers

Configured in `vercel.json`:

- Strict-Transport-Security
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy
- Permissions-Policy
- X-DNS-Prefetch-Control
- X-Download-Options
- X-Permitted-Cross-Domain-Policies
- X-XSS-Protection (disabled intentionally as modern browsers ignore legacy filter)
- Cross-Origin-Opener-Policy
- Cross-Origin-Resource-Policy
- Content-Security-Policy

## CSP Notes

Current CSP includes `unsafe-inline` and `unsafe-eval` for scripts/styles compatibility. This is practical but less strict than a nonce/hash-based CSP.

## Dev Seed Endpoint Security

The seed endpoint is intentionally protected by two gates:

1. Environment gate (`development` only).
2. Shared secret gate (`x-seed-key`).

This prevents accidental production admin creation.
