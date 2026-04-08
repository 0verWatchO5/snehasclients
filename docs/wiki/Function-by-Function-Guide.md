# Function-by-Function Guide

This page explains each key function and why it exists.

## UI Layer

### `app/layout.tsx`

- `RootLayout({ children })`
  - What it does: wraps all routes with HTML/body shell and app providers.
  - Why required: central place for global styles, fonts, and context providers.

### `app/providers.tsx`

- `Providers({ children })`
  - What it does: wraps app in NextAuth `SessionProvider`.
  - Why required: client components need session context (`useSession`) for auth state and guards.

### `app/page.tsx` (Login)

- `Home()`
  - What it does: renders login UI and dev admin-seed panel.
  - Why required: entry point for admin authentication.

- `useEffect(... status/authenticated ...)`
  - What it does: redirects signed-in users to `/admin`.
  - Why required: prevents logged-in users from staying on login screen.

- `onSubmit(e)`
  - What it does: submits credentials via `signIn("credentials")`.
  - Why required: performs controlled login and handles UI error/loading states.

- `onSeedAdmin(e)`
  - What it does: calls dev-only seed endpoint with `x-seed-key`.
  - Why required: bootstraps initial admin in local/dev environments quickly.

### `app/admin/page.tsx` (Dashboard)

- `dateInputValue(value)`
  - What it does: normalizes ISO datetime into `YYYY-MM-DD` for date inputs.
  - Why required: HTML date inputs need date-only strings.

- `premiumModeLabel(mode)`
  - What it does: maps premium mode code to human-readable text.
  - Why required: improves table readability.

- `AdminPageContent()`
  - What it does: implements authenticated dashboard behavior and customer table.
  - Why required: primary operational workspace for admins.

- `useEffect(() => performSearch(...), [])`
  - What it does: loads initial customer records.
  - Why required: dashboard is useful immediately without manual first search.

- `performSearch(value, filterBy, showMessage)`
  - What it does: calls search API and updates customer state.
  - Why required: shared search logic for initial load and user-triggered searches.

- `handleSearch(e)`
  - What it does: validates input and triggers search.
  - Why required: form submit orchestration.

- `handleEdit(customer)`
  - What it does: loads selected row into modal edit state.
  - Why required: enables inline record editing workflow.

- `handleSaveEdit()`
  - What it does: sends PUT update and refreshes local row.
  - Why required: persists edits and keeps UI synced.

- `handleDeleteClick(id)`
  - What it does: opens delete confirmation state.
  - Why required: adds safety step before destructive action.

- `handleConfirmDelete()`
  - What it does: sends DELETE request and removes row from state.
  - Why required: completes controlled deletion flow.

- `AdminPage()`
  - What it does: wraps content in `Suspense` fallback.
  - Why required: smooth loading behavior for client-side session/data readiness.

### `app/admin/add-customer/page.tsx`

- `AddCustomerPage()`
  - What it does: renders authenticated add-customer form.
  - Why required: dedicated create workflow with validation-friendly inputs.

- `parseNumber(value)`
  - What it does: safely parses numeric input; falls back to `0` on NaN.
  - Why required: prevents invalid number propagation from form inputs.

- `handleAddCustomer(e)`
  - What it does: submits new customer payload to API and redirects on success.
  - Why required: creates customer records and returns admin to dashboard.

## API Layer

### `app/api/auth/[...nextauth]/route.ts`

- `handler = NextAuth(authOptions)`
  - What it does: builds NextAuth request handler from shared options.
  - Why required: exposes NextAuth endpoints for App Router.

- `export { handler as GET, handler as POST }`
  - What it does: maps handler to both HTTP methods expected by NextAuth.
  - Why required: allows auth flows and callbacks to function correctly.

### `app/api/add-customer/route.ts`

- `POST(request)`
  - What it does: auth-checks, validates by schema, creates customer.
  - Why required: trusted write endpoint for new policy-holder records.

### `app/api/search/route.ts`

- `GET(request)`
  - What it does: auth-checks, parses filters, queries customers.
  - Why required: server-side search endpoint for dashboard lookup operations.

### `app/api/update-customer/route.ts`

- `normalizeCustomerUpdatePayload(input)`
  - What it does: removes compact keys and immutable/system fields.
  - Why required: prevents malformed/unsafe updates and alias collisions.

- `PUT(request)`
  - What it does: auth-checks, validates id, updates customer with validators.
  - Why required: controlled customer edit endpoint.

### `app/api/delete-customer/route.ts`

- `DELETE(request)`
  - What it does: auth-checks, validates id, deletes record.
  - Why required: controlled destructive operation endpoint.

### `app/api/dev/seed-admin/route.ts`

- `POST(request)`
  - What it does: development-only admin seeding with secret key validation.
  - Why required: accelerates safe local setup while blocking production abuse.

## Auth/Infra Layer

### `lib/auth.js`

- `authOptions`
  - What it does: central NextAuth configuration object.
  - Why required: single source of truth for auth provider, adapter, strategy, callbacks.

- `authorize(credentials)` inside CredentialsProvider
  - What it does: validates username/password against DB.
  - Why required: secure credential gate for sign-in.

- `callbacks.jwt({ token, user })`
  - What it does: persists user identifiers in JWT.
  - Why required: carries identity across requests without DB lookup per request.

- `callbacks.session({ session, token })`
  - What it does: maps token identity into `session.user`.
  - Why required: exposes user identity to client/server consumers.

### `lib/mongodb.ts`

- `clientPromise` initialization
  - What it does: creates cached MongoClient connection promise.
  - Why required: used by NextAuth MongoDB adapter; avoids reconnect overhead.

### `lib/mongoose.ts`

- `connectMongoose()`
  - What it does: returns cached Mongoose connection, or creates it once.
  - Why required: stable model operations and reduced connection churn.

## Model Layer

### `lib/models/Customer.ts`

- `policyHolderNameSchema`
  - What it does: validates nested policy-holder name fields.
  - Why required: enforces consistent structure for names.

- `emiSchema`
  - What it does: validates EMI sub-document fields.
  - Why required: keeps payment-mode details consistent.

- `customerSchema`
  - What it does: defines full customer document with aliases and constraints.
  - Why required: core domain schema and data integrity guard.

- `customerSchema.index(...)`
  - What it does: defines text index for policy-holder name search use cases.
  - Why required: improves search capability/performance for name-based lookup.

- `Customer` model export
  - What it does: reuses existing model if already compiled.
  - Why required: prevents model overwrite errors during hot reload.

### `lib/models/User.ts`

- `userSchema`
  - What it does: defines auth user shape.
  - Why required: stores credential-account metadata.

- `userSchema.index({ username, idp }, { unique: true })`
  - What it does: guarantees unique identity-provider usernames.
  - Why required: avoids duplicate auth identities.

- `User` model export
  - What it does: compiled/reused model for auth queries.
  - Why required: runtime-safe model access in Next.js dev and prod.

### `lib/models/IdentityProvider.ts`

- `identityProviderSchema`
  - What it does: defines identity provider metadata structure.
  - Why required: future-ready support for configurable providers.

- `IdentityProvider` model export
  - What it does: model access wrapper with hot-reload safety.
  - Why required: standard Mongoose model reuse pattern.
