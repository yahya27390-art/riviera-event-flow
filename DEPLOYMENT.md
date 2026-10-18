# Riviera: preserving existing financial records

This change is prepared for review. It has **not** been applied to the live
Supabase database or either hosted site. Do not merge and deploy the frontend
before completing the Auth/database cutover below.

## Data guarantees

- Migrations add nullable booking fields, new request metadata, RPCs, access
  policies and protection triggers. They do not backfill, normalize, delete or
  reconcile existing bookings, receipts, expenses or cash/bank transactions.
- Existing `paid_amount` and `remaining_amount` values remain authoritative.
  Recording a new, explicitly submitted payment adds/subtracts only that amount.
  Existing inconsistencies are not silently repaired.
- Old contracts derive the missing base price from `total_amount - sum(items)`
  in memory. Opening a booking does not write anything.
- Deleting bookings and rewriting/deleting posted ledger entries are blocked.
  Cancel a booking to retain its history. Cancellation does not refund money or
  alter any balance. Financial corrections/refunds require a separately reviewed
  reversal-entry workflow; this change does not invent or post adjustments.
- New deposits, payments, expenses and transfers run atomically. A failed insert
  rolls back the whole operation. Request IDs prevent duplicate retries.
- Reports exclude internal transfers from revenue but retain their effects in
  both account balances. All ledger pages are read. If the old UI omitted older
  rows because of its 500/1000-row limit, the displayed sum can differ; review
  that discrepancy against the full ledger, never modify records to match it.
- Browser restore over the live ledger and the old automatic cleanup script
  are disabled. Backups are consistent, administrator-only exports. They are
  stored locally and run when an administrator opens the app, not 24/7.

## Validate before production

1. Take an operator-controlled full database backup and prove restoration into
   an **isolated** database. Export Auth accounts/config separately; application
   JSON exports do not contain Supabase Auth password hashes or infrastructure.
2. Record full ledger sums and per-table fingerprints using
   `supabase/verification/financial_baseline.sql`. Keep the output securely.
   Inspect actual production columns, grants and existing triggers against the
   schema used in tests. Do not run any cleanup or deduplication script.
3. On the isolated copy, create a Supabase Auth administrator with a new password
   and protected `app_metadata`:
   `{"accounting_access":true,"role":"admin","must_change_password":false}`.
   Disable public signups. Verify sign-in. Legacy local PINs will no longer work.
   Create staff accounts through Auth with protected accounting access/role;
   temporary accounts must have `must_change_password:true`. Do not import PIN
   hashes from `hall_settings.notes` or let user-editable metadata assign roles.
4. Apply migrations `202610180001` through `202610180003` in order to the isolated
   database. The first refuses to run without a prepared administrator. Deploy
   `accounting-users` with normal JWT verification enabled and its standard
   server-side Supabase environment secrets. Never put a service key in Vite.
5. Use a staging frontend pointed at the isolated database. Verify administrator
   and accountant sign-in, mandatory password changes, a legacy contract edit,
   new cash/bank payments, a transfer, expenses, backups and cancellation.
   Verify failed requests and lost-response retries. Confirm denied access as anon.
6. Compare the before/after baseline immediately after migration, **before any
   staging transactions**: every old financial row and amount must match exactly.
   The automated embedded-PostgreSQL suite checks this on synthetic legacy rows,
   including a legacy paid balance that differs from its receipt total.

## Coordinated production cutover

Production cutover is a separate, explicit operation. Arrange a maintenance
window: pause writes from old clients, take and verify the backup/baseline,
provision and test Auth, apply the reviewed migrations and Edge Function, compare
the unchanged baseline, then deploy the frontend and sign in with the new Auth
credentials. Old anonymous clients are deliberately denied by the new policies.
Do not run staging financial transactions against production to test the release.

The existing deployment workflows are manual and require the cutover-ready
checkbox. PR CI only installs dependencies, tests, lints and builds. It has no
database credentials and performs no deployment or migrations.

If a staging check fails, stop before cutover. If cutover fails, preserve the
ledger and repair forward under maintenance; do not restore stale JSON or reopen
anonymous policies. Keep the previous frontend artifact and full database backup
for an operator-reviewed recovery plan. No automatic data rollback is provided.

## Local validation

`npm ci`, `npm test`, `npm run lint`, `npm run build`.

Database tests use embedded PGlite with synthetic data. They never connect to
Supabase or load production credentials. They test PostgreSQL transactions,
permissions and idempotency; real multi-connection load testing and hosted Edge
Function end-to-end testing remain staging requirements.
