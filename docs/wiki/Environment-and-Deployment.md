# Environment and Deployment

## Required Environment Variables

- `MONGODB_URI`
  - Used by both `lib/mongodb.ts` and `lib/mongoose.ts`.
  - Required at startup.

- `NEXTAUTH_SECRET`
  - Used by NextAuth for token/session integrity.

- `SEED_ADMIN_KEY`
  - Required for `/api/dev/seed-admin` route.

## Local Development

1. Install dependencies:
   - `npm install`
2. Set required environment variables in `.env`.
3. Run dev server:
   - `npm run dev`
4. Open:
   - `http://localhost:3000`

## Initial Admin Bootstrap (Dev)

From login page in development mode:

- Expand "Initialize Admin (Dev Only)".
- Provide `SEED_ADMIN_KEY` and credentials.
- Submit to create admin if missing.

## Production Build

- `npm run build`
- `npm run start`

## Deployment Notes

- `vercel.json` adds security headers globally.
- Ensure production has strong `NEXTAUTH_SECRET` and restricted DB access.
- Keep `SEED_ADMIN_KEY` secret and avoid exposing dev tools in production.

## Operational Recommendations

- Add database backups and retention policies.
- Add monitoring/logging for API failures and auth events.
- Rotate admin credentials periodically.
- Consider role-based access if more user types are added.
