# Architecture

## System Shape

This is a monolithic web app with server-rendered and client-rendered UI pages plus internal API endpoints.

### Layers

1. Presentation Layer (React client pages)
   - `app/page.tsx` (login)
   - `app/admin/page.tsx` (dashboard/search/edit/delete)
   - `app/admin/add-customer/page.tsx` (create flow)

2. API Layer (Next.js route handlers)
   - `app/api/auth/[...nextauth]/route.ts`
   - `app/api/add-customer/route.ts`
   - `app/api/search/route.ts`
   - `app/api/update-customer/route.ts`
   - `app/api/delete-customer/route.ts`
   - `app/api/dev/seed-admin/route.ts`

3. Service/Infra Layer
   - `lib/auth.js` (NextAuth options and callbacks)
   - `lib/mongoose.ts` (Mongoose connection cache)
   - `lib/mongodb.ts` (MongoClient promise for adapter)

4. Data Model Layer
   - `lib/models/Customer.ts`
   - `lib/models/User.ts`
   - `lib/models/IdentityProvider.ts`

## Request Flow Examples

### Login Flow

1. User submits credentials on `/`.
2. `signIn("credentials")` calls NextAuth.
3. `authorize()` in `lib/auth.js` validates credentials against hashed password in MongoDB.
4. JWT callback enriches token with `id` and `idp`.
5. Session callback projects token fields to `session.user`.
6. Client redirects to `/admin` on success.

### Customer Search Flow

1. Client calls `/api/search` with query params.
2. Route verifies authenticated session using `getServerSession(authOptions)`.
3. Route maps filters and queries `Customer.find(filter)`.
4. JSON data returns to dashboard table.

### Customer Update Flow

1. Client submits edited record to `/api/update-customer`.
2. API verifies auth.
3. API removes compact alias fields + immutable fields from payload.
4. API updates with `{ runValidators: true, translateAliases: true }`.
5. Updated record returns to client.

## Important Design Decisions

- API-level auth checks on each admin endpoint.
- Alias-based schema model to keep DB fields compact but app-level naming readable.
- Separate connectors for NextAuth adapter (`mongodb`) and app models (`mongoose`).
- Dev-only seed endpoint isolated and key-protected.
