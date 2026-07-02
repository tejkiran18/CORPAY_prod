# CORPAY — Enterprise Entity Relationship Diagram

**Sprint 3 · v1.0 (for review)**

- **Database**: PostgreSQL 15 (Neon serverless)
- **ORM**: Prisma 5.x
- **Primary keys**: `UUID v4` (`gen_random_uuid()`)
- **Normal form**: 3NF (all non-key attributes depend on the whole PK; no transitive deps except deliberately cached counters)
- **Soft-delete**: `deletedAt` column on core entities
- **Audit fields**: every core row carries `createdAt`, `updatedAt`, `createdById`, `updatedById`
- **Money**: `NUMERIC(14,2)` in a specified `currency_code` (ISO-4217)
- **Timestamps**: `TIMESTAMPTZ` (UTC) everywhere

## 1. Domain map (logical grouping)

| Domain              | Tables |
|---------------------|--------|
| Reference           | countries, cities, currencies, permissions, settings |
| Organization        | organizations, business_units, departments, cost_centers, project_types, projects |
| Identity & Access   | employee_grades, employee_roles, role_permissions, employees, manager_assignments, sessions |
| Governance          | policies, policy_rules, budget_categories, budgets, spending_rights, spending_right_categories |
| Events              | business_events, trips |
| Merchants           | merchant_categories, merchants, transaction_categories |
| Approvals           | approval_workflows, approval_steps, approvals, approval_history |
| Ledger              | transactions |
| Ops & Compliance    | risk_events, notifications, audit_logs, attachments |

**Total: 38 tables.**

## 2. Cardinalities (high-level)

```
Organization (1) ───────── (∞) BusinessUnit
Organization (1) ───────── (∞) Department
Department   (1) ───────── (∞) CostCenter
Organization (1) ───────── (∞) Project
Organization (1) ───────── (∞) Employee
Employee     (1) ──self-ref── (∞) Employee            (via manager_assignments — supports matrix orgs)
EmployeeRole (1) ───────── (∞) Employee
Policy       (1) ───────── (∞) PolicyRule
SpendingRight(1) ───────── (∞) SpendingRightCategory
Budget       (1) ───────── (∞) Transaction
SpendingRight(1) ───────── (∞) Transaction
ApprovalWorkflow (1) ───── (∞) ApprovalStep
Approval     (1) ───────── (∞) ApprovalHistory
Transaction  (1) ───────── (0..1) Approval           (only when policy requires)
Transaction  (1) ───────── (0..∞) RiskEvent
Any entity   (1) ───────── (∞) AuditLog            (polymorphic: entity + entityId)
```

## 3. Mermaid ER diagram

> View this file in GitHub / Mermaid Live / VS Code to see it render.

```mermaid
erDiagram
    ORGANIZATION ||--o{ BUSINESS_UNIT : has
    ORGANIZATION ||--o{ DEPARTMENT : has
    ORGANIZATION ||--o{ PROJECT : owns
    ORGANIZATION ||--o{ EMPLOYEE : employs
    ORGANIZATION ||--o{ POLICY : defines
    ORGANIZATION ||--o{ BUDGET : allocates
    ORGANIZATION ||--o{ TRANSACTION : records
    ORGANIZATION }o--|| CURRENCY : "reports in"
    ORGANIZATION }o--|| COUNTRY : "domiciled in"

    BUSINESS_UNIT ||--o{ DEPARTMENT : contains
    DEPARTMENT ||--o{ COST_CENTER : owns
    DEPARTMENT ||--o{ EMPLOYEE : "reports to"
    COST_CENTER ||--o{ BUDGET : funds
    COST_CENTER ||--o{ SPENDING_RIGHT : caps
    COST_CENTER ||--o{ TRANSACTION : attributes

    PROJECT_TYPE ||--o{ PROJECT : classifies
    PROJECT ||--o{ BUSINESS_EVENT : hosts
    PROJECT ||--o{ BUDGET : funds
    PROJECT ||--o{ SPENDING_RIGHT : caps
    PROJECT ||--o{ TRANSACTION : attributes

    EMPLOYEE_GRADE ||--o{ EMPLOYEE : grades
    EMPLOYEE_ROLE ||--o{ EMPLOYEE : grants
    EMPLOYEE_ROLE ||--o{ ROLE_PERMISSION : has
    PERMISSION ||--o{ ROLE_PERMISSION : "granted by"

    EMPLOYEE ||--o{ MANAGER_ASSIGNMENT : "is subordinate"
    EMPLOYEE ||--o{ MANAGER_ASSIGNMENT : "is manager"
    EMPLOYEE ||--o{ SESSION : "opens"
    EMPLOYEE ||--o{ SPENDING_RIGHT : holds
    EMPLOYEE ||--o{ TRANSACTION : initiates
    EMPLOYEE ||--o{ BUSINESS_EVENT : owns
    EMPLOYEE ||--o{ APPROVAL : requests
    EMPLOYEE ||--o{ APPROVAL_HISTORY : "acts on"
    EMPLOYEE ||--o{ NOTIFICATION : receives
    EMPLOYEE ||--o{ AUDIT_LOG : "generates"

    POLICY ||--o{ POLICY_RULE : composed_of
    POLICY ||--o{ SPENDING_RIGHT : binds
    POLICY ||--o{ TRANSACTION : "validated by"

    BUDGET_CATEGORY ||--o{ BUDGET : categorises
    BUDGET ||--o{ TRANSACTION : "funds"

    BUSINESS_EVENT ||--o| TRIP : "extends when travel"
    BUSINESS_EVENT ||--o{ SPENDING_RIGHT : "scopes"
    BUSINESS_EVENT ||--o{ TRANSACTION : "attributes to"

    SPENDING_RIGHT ||--o{ SPENDING_RIGHT_CATEGORY : allows_blocks
    SPENDING_RIGHT ||--o{ TRANSACTION : "authorises"
    TRANSACTION_CATEGORY ||--o{ SPENDING_RIGHT_CATEGORY : "scoped in"
    TRANSACTION_CATEGORY ||--o{ TRANSACTION : classifies

    MERCHANT_CATEGORY ||--o{ MERCHANT : classifies
    MERCHANT ||--o{ TRANSACTION : "is paid"
    CITY ||--o{ MERCHANT : located_in
    COUNTRY ||--o{ CITY : contains

    APPROVAL_WORKFLOW ||--o{ APPROVAL_STEP : contains
    APPROVAL_WORKFLOW ||--o{ APPROVAL : instantiates
    APPROVAL ||--o{ APPROVAL_HISTORY : logs
    APPROVAL ||--o| TRANSACTION : "gates"
    APPROVAL ||--o| BUDGET : "gates"
    APPROVAL ||--o| SPENDING_RIGHT : "gates"

    TRANSACTION ||--o{ RISK_EVENT : flags
    TRANSACTION ||--o{ ATTACHMENT : evidenced_by

    ORGANIZATION ||--o{ SETTING : configures
    ORGANIZATION ||--o{ AUDIT_LOG : "scope of"
    ORGANIZATION ||--o{ ATTACHMENT : stores

    ORGANIZATION {
        uuid id PK
        varchar(120) legal_name
        varchar(20) gstin UK
        varchar(3) currency_code FK
        uuid country_id FK
        text address
        timestamptz created_at
        timestamptz updated_at
        uuid created_by_id FK
    }
    DEPARTMENT {
        uuid id PK
        uuid organization_id FK
        uuid business_unit_id FK
        varchar(80) name
        uuid head_employee_id FK
        boolean active
        UNIQUE org_name "(organization_id, name)"
    }
    COST_CENTER {
        uuid id PK
        uuid organization_id FK
        uuid department_id FK
        varchar(20) code UK
        varchar(120) name
        numeric budget_ceiling
    }
    PROJECT {
        uuid id PK
        uuid organization_id FK
        uuid type_id FK
        varchar(20) code
        varchar(120) name
        varchar(120) client
        varchar(20) status
        numeric budget_cap
        date start_date
        date end_date
        UNIQUE org_code "(organization_id, code)"
    }
    EMPLOYEE {
        uuid id PK
        uuid organization_id FK
        varchar(30) employee_code
        citext email UK
        varchar(120) name
        varchar(20) phone
        varchar(120) designation
        uuid grade_id FK
        uuid role_id FK
        uuid department_id FK
        uuid project_id FK
        varchar(20) status
        text password_hash
        UNIQUE org_ecode "(organization_id, employee_code)"
    }
    POLICY {
        uuid id PK
        uuid organization_id FK
        varchar(120) name
        boolean is_default
        boolean active
        date effective_from
        date effective_to
    }
    POLICY_RULE {
        uuid id PK
        uuid policy_id FK
        varchar(30) rule_type
        varchar(50) field
        varchar(20) operator
        numeric value_numeric
        text value_text
        jsonb value_json
        varchar(10) connector
        integer sort_order
        varchar(20) action_on_violation
        boolean active
    }
    SPENDING_RIGHT {
        uuid id PK
        uuid organization_id FK
        uuid employee_id FK
        uuid project_id FK
        uuid cost_center_id FK
        uuid business_event_id FK
        uuid policy_id FK
        uuid approval_workflow_id FK
        numeric allocated_amount
        numeric consumed_amount
        varchar(3) currency_code FK
        timestamptz validity_start
        timestamptz validity_end
        numeric single_transaction_limit
        numeric daily_limit
        numeric weekly_limit
        numeric monthly_limit
        varchar(10) risk_level
        varchar(20) status
    }
    BUDGET {
        uuid id PK
        uuid organization_id FK
        uuid category_id FK
        varchar(120) name
        varchar(20) type
        numeric amount
        numeric spent
        varchar(3) currency_code FK
        date start_date
        date end_date
        uuid cost_center_id FK
        uuid project_id FK
        uuid employee_id FK
        uuid business_event_id FK
        boolean approval_required
        varchar(20) status
        jsonb breakdown
    }
    BUSINESS_EVENT {
        uuid id PK
        uuid organization_id FK
        uuid owner_employee_id FK
        uuid project_id FK
        uuid cost_center_id FK
        varchar(30) type
        varchar(200) name
        varchar(120) location
        date start_date
        date end_date
        varchar(20) status
    }
    TRIP {
        uuid id PK
        uuid business_event_id FK UK
        uuid origin_city_id FK
        uuid destination_city_id FK
        varchar(20) mode
    }
    MERCHANT {
        uuid id PK
        varchar(160) name
        varchar(6) mcc
        uuid category_id FK
        varchar(60) upi_id UK
        uuid city_id FK
        numeric latitude
        numeric longitude
        boolean verified
    }
    TRANSACTION {
        uuid id PK
        varchar(24) reference UK
        uuid organization_id FK
        uuid employee_id FK
        uuid manager_id FK
        uuid project_id FK
        uuid business_event_id FK
        uuid spending_right_id FK
        uuid policy_id FK
        uuid merchant_id FK
        varchar(160) merchant_name
        uuid merchant_category_id FK
        uuid transaction_category_id FK
        uuid budget_id FK
        uuid cost_center_id FK
        numeric amount
        varchar(3) currency_code FK
        varchar(60) upi_reference
        varchar(20) payment_status
        varchar(20) approval_status
        integer risk_score
        numeric latitude
        numeric longitude
        varchar(80) device_id
        text reason
        timestamptz occurred_at
        uuid created_by_id FK
        uuid updated_by_id FK
        timestamptz created_at
        timestamptz updated_at
    }
    APPROVAL_WORKFLOW {
        uuid id PK
        uuid organization_id FK
        varchar(30) entity
        varchar(120) name
        boolean active
    }
    APPROVAL_STEP {
        uuid id PK
        uuid workflow_id FK
        integer sort_order
        uuid role_id FK
        uuid employee_id FK
        jsonb condition
        boolean active
    }
    APPROVAL {
        uuid id PK
        uuid workflow_id FK
        uuid current_step_id FK
        varchar(30) subject_type
        uuid subject_id
        uuid requester_id FK
        varchar(20) status
        timestamptz created_at
        timestamptz decided_at
    }
    APPROVAL_HISTORY {
        uuid id PK
        uuid approval_id FK
        uuid step_id FK
        uuid actor_employee_id FK
        varchar(20) action
        text note
        timestamptz created_at
    }
    RISK_EVENT {
        uuid id PK
        uuid organization_id FK
        uuid transaction_id FK
        uuid employee_id FK
        varchar(30) type
        varchar(10) severity
        integer score
        text reason
        boolean resolved
        uuid resolved_by_id FK
        timestamptz resolved_at
        timestamptz created_at
    }
    AUDIT_LOG {
        uuid id PK
        uuid organization_id FK
        uuid actor_employee_id FK
        varchar(30) action
        varchar(40) entity
        uuid entity_id
        jsonb before
        jsonb after
        inet ip_address
        text user_agent
        timestamptz created_at
    }
    NOTIFICATION {
        uuid id PK
        uuid organization_id FK
        uuid employee_id FK
        varchar(20) channel
        varchar(40) type
        varchar(160) title
        text body
        varchar(30) entity_ref_type
        uuid entity_ref_id
        varchar(10) status
        timestamptz read_at
        timestamptz created_at
    }
    ATTACHMENT {
        uuid id PK
        uuid organization_id FK
        varchar(30) entity
        uuid entity_id
        varchar(200) filename
        varchar(60) mime_type
        integer size_bytes
        text storage_path
        uuid uploaded_by_id FK
        timestamptz created_at
    }
    SETTING {
        uuid id PK
        uuid organization_id FK
        varchar(80) key
        jsonb value
        text description
        timestamptz updated_at
        uuid updated_by_id FK
        UNIQUE org_key "(organization_id, key)"
    }
```

## 4. Index strategy (with rationale)

| Index | Rationale |
|-------|-----------|
| `transactions (organization_id, occurred_at DESC)` | Every dashboard filters by org + date range. This is THE hot query. |
| `transactions (employee_id, occurred_at DESC)`     | “My transactions” screen. |
| `transactions (spending_right_id)` partial WHERE `payment_status='APPROVED'` | Fast consumption tally without scanning rejected rows. |
| `transactions (budget_id) WHERE payment_status='APPROVED'` | Budget spent aggregation. |
| `transactions (project_id, occurred_at DESC)` | Project P&L rollups. |
| `transactions (cost_center_id, occurred_at DESC)` | CFO cost-center drilldowns. |
| `transactions (merchant_id)`                       | Merchant analytics. |
| `transactions (approval_status)` partial WHERE `approval_status='PENDING'` | Approvals inbox — skinny hot index. |
| `spending_rights (employee_id, status)`            | The validation engine's first lookup on every UPI tap. |
| `spending_rights (organization_id, validity_end)`  | Nightly expiry sweep. |
| `policies (organization_id, is_default) UNIQUE partial WHERE is_default = true` | At most 1 default policy per org enforced by DB. |
| `policy_rules (policy_id, sort_order)`             | Evaluate rules in order without sort operator. |
| `approvals (subject_type, subject_id)`             | Lookup approval by the entity it gates. |
| `approvals (status, created_at DESC)` partial WHERE `status='PENDING'` | Pending inbox. |
| `audit_logs (organization_id, created_at DESC)`    | Compliance queries — always time-bounded. |
| `audit_logs (entity, entity_id, created_at DESC)`  | "Show me history of X." |
| `notifications (employee_id, status)` partial WHERE `status='UNREAD'` | Bell icon poll — tiny partial index. |
| `employees (organization_id, email)` UNIQUE        | Login lookup + tenant isolation. |
| `employees (organization_id, role_id)`             | RBAC seed queries. |
| `merchants (upi_id)` UNIQUE where not null         | UPI dedupe. |
| `merchants (mcc)`                                  | Category classification. |

All `id` UUID primary keys are B-tree by default. **All foreign keys are covered by an index** (Postgres does NOT create these automatically).

## 5. Constraint highlights

- **Multi-tenant hard isolation**: every non-reference table carries `organization_id NOT NULL` and every unique constraint that could collide across tenants is scoped to it (e.g. `UNIQUE (organization_id, name)`).
- **Referential integrity**: FKs default to `ON UPDATE CASCADE ON DELETE RESTRICT` — explicit `SET NULL` only on optional attribution FKs (e.g. `transactions.merchant_id`).
- **Money integrity**: `CHECK (amount >= 0)` on `transactions.amount`, `budgets.amount`, `spending_rights.allocated_amount`.
- **Enum-like columns** implemented as Postgres `ENUM` types (via Prisma enums) for compile-time safety: `PaymentStatus`, `ApprovalStatus`, `RiskLevel`, `Severity`, `Channel`, etc.
- **Immutable audit**: `audit_logs` has no `UPDATE` / `DELETE` grant; append-only. Enforced later at role level.
- **Consumed vs Allocated** in `spending_rights` maintained inside a single serialisable transaction (`SELECT … FOR UPDATE` + `UPDATE` + insert txn) — no race between two concurrent payments.

## 6. Deviations from strict 3NF (intentional)

1. `spending_rights.consumed_amount` and `budgets.spent` are **materialised counters** kept in sync inside the payment transaction. Strict 3NF would recompute from `SUM(transactions.amount)`. We keep the counter for O(1) validation lookups; consistency guaranteed by the write path.
2. `transactions.merchant_name` is duplicated even when `merchant_id` is set. This preserves the exact string captured at the moment of payment even if the merchant record is later renamed or deleted — required for statutory audit.
3. `transactions.cost_center_id` is denormalised from `employee → department → cost_center` for hot reads. Populated at write time via trigger-equivalent code in the transaction engine.

These are the only three deviations, each with a written justification, and each maintained transactionally.
