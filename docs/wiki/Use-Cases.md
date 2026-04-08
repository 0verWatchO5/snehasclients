# Use Cases

## Primary Use Case: Insurance Customer Administration

An authenticated operations/admin user signs in and manages policy-holder records in one UI.

### Supported Tasks

1. Login with username and password.
2. Load existing customer records.
3. Search records by one of:
   - Surname
   - Policy number
   - Mobile number
   - Customer code
4. Create a new customer with policy and premium details.
5. Edit existing customer data (including dates, provider, and EMI fields).
6. Delete a customer record.

## Secondary Use Case: Development Environment Bootstrap

In development mode only, a protected endpoint can seed a local admin account:

- Endpoint requires `NODE_ENV=development`.
- Endpoint requires `SEED_ADMIN_KEY` secret via request header.
- Prevents repeated duplicate creation.

This reduces setup time for local/dev testing.

## Non-Goals in Current Build

- Public customer self-service portal.
- Multi-role authorization matrix.
- Reporting/analytics dashboards.
- Payment gateway integration.
- Background jobs or workflow engine.
