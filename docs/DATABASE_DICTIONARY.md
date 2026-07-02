# CORPAY Database Dictionary

Generated from `/app/prisma/schema.prisma` · v1.0 (Sprint 3)

38 tables · 24 enums · PostgreSQL 15 (Neon)

## Naming conventions
- Table names: `snake_case`, plural (`transactions`, `spending_rights`)
- Column names: `snake_case` in PG, `camelCase` in Prisma client
- Primary key: always `id UUID` (`gen_random_uuid()`)
- Foreign key column: `<related>_id`
- Timestamps: `created_at`, `updated_at` (TIMESTAMPTZ, UTC)
- Money: `NUMERIC(14,2)` never `float`

## Table by table (highlights)

### `organizations`
Multi-tenant root. Every business row transitively references one org.
- **Unique**: `gstin`
- **FK**: `country_id → countries`, `currency_code → currencies`
- **Cardinality**: 1:N with `departments`, `projects`, `employees`, `budgets`, `policies`, `transactions`, `audit_logs`.

### `employees`
- **Unique**: `(organization_id, email)`, `(organization_id, employee_code)`
- **FK**: `role_id`, `grade_id`, `department_id`, `project_id`, `organization_id`
- **Indexes**: `(organization_id, role_id)`, `(organization_id, department_id)`, `(organization_id, status)`
- **Self-relation**: none directly; matrix reporting captured via `manager_assignments`.

### `manager_assignments`
Many-to-many between employees (supports matrix reporting and time-boxed changes).
- **Unique**: `(manager_id, subordinate_id, effective_from)`
- **Indexes**: `(subordinate_id)` for "who is my manager" queries.

### `policies` / `policy_rules`
Data-driven rule engine. `policy_rules.rule_type`, `.operator`, `.connector`, `.value_*` allow expressing any policy without code changes.
- **Indexes**: `(policy_id, sort_order)` — rules are evaluated in insertion order under a boolean expression built from `connector`.
- Rule types cover: category limits, per-transaction cap, daily/weekly/monthly limits, allowed/restricted category lists, approval thresholds, merchant/geo/time/velocity rules.

### `spending_rights`
Grants an employee the ability to spend against a specific project/cost-center/event within limits.
- **Materialised counter**: `consumed_amount` updated inside the payment transaction (see `TransactionEngine`).
- **Indexes**: `(organization_id, employee_id, status)` — the first lookup on every UPI tap; `(validity_end)` for expiry sweeps.
- Category allow/block lists live in `spending_right_categories` (join table with `mode`).

### `budgets`
Allocation container. FK-linked to Cost Center / Project / Employee / BusinessEvent (all optional; at least one populated). `spent` maintained transactionally.

### `transactions`
Centre of the platform. 20+ FKs give a fully attributed ledger row.
- Every dashboard and drilldown filters on either `(organization_id, occurred_at)`, `(project_id, occurred_at)` or `(cost_center_id, occurred_at)` — all indexed with `occurred_at DESC` to power "latest 50" pages without a sort.
- `reference` is a human-readable UNIQUE ID (`TXN-YYYYMMDD-XXXXX`) for audit/CSV.
- `payment_status` and `approval_status` are separate first-class fields (a payment can be paid but pending post-audit review).

### `approval_workflows` / `approval_steps` / `approvals` / `approval_history`
Generic N-step workflow engine.
- `approvals.subject_type + subject_id` is a polymorphic pointer to `transactions`, `budgets`, `spending_rights`, or `business_events`. Standard pattern; a nullable FK column per subject is avoided to keep the table skinny.
- Every state change writes an immutable row to `approval_history`.

### `audit_logs`
Append-only compliance record.
- Indexes: `(organization_id, created_at DESC)`, `(entity, entity_id, created_at DESC)`, `(action, created_at DESC)`.
- At deploy time the DB role for the app will have `GRANT INSERT, SELECT` only — no `UPDATE`/`DELETE`.

### `sessions`
JWT jti registry to support forced logout / session revocation. Prisma model, not a raw HTTP cookie store.
- `token_hash` is SHA-256 of the JWT jti; the raw token never touches the DB.

## Indexing philosophy
1. Every FK gets a covering index (PG does not auto-create these).
2. Multi-column indexes lead with `organization_id` for tenant isolation and predicate pushdown.
3. Time-series columns end with `DESC` sort order for "latest N" without a heap sort.
4. Partial indexes are used aggressively where 90%+ of rows are irrelevant (e.g. pending approvals, unread notifications).
5. `UNIQUE` constraints are all tenant-scoped.

## What we did NOT normalise (with reason)
1. `transactions.merchant_name` — immutable snapshot at write time even if merchant renamed.
2. `transactions.cost_center_id` — denormalised from `employee → department → cost_center` for hot dashboard reads.
3. `budgets.spent` / `spending_rights.consumed_amount` — materialised counters, updated inside the same DB transaction that inserts the underlying `transactions` row.
