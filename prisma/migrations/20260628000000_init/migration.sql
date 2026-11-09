-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BudgetType" AS ENUM ('TRAVEL', 'PROJECT', 'DEPARTMENT', 'EMPLOYEE', 'EVENT', 'MISC');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('TRIP', 'CLIENT_VISIT', 'CONFERENCE', 'ONSITE', 'TRAINING', 'OTHER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PLANNED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TravelMode" AS ENUM ('FLIGHT', 'TRAIN', 'CAR', 'BUS', 'TAXI');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'APPROVED', 'PENDING', 'REJECTED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'ESCALATED', 'COMMENTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskType" AS ENUM ('VELOCITY', 'OUT_OF_POLICY', 'GEO_ANOMALY', 'UNUSUAL_MERCHANT', 'HIGH_AMOUNT', 'DUPLICATE', 'OFF_HOURS');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotifChannel" AS ENUM ('INAPP', 'EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "NotifStatus" AS ENUM ('UNREAD', 'READ', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'PAYMENT', 'POLICY_CHANGE', 'ROLE_CHANGE', 'SETTINGS_UPDATE');

-- CreateEnum
CREATE TYPE "RuleOperator" AS ENUM ('EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE', 'IN', 'NOT_IN', 'CONTAINS', 'BETWEEN');

-- CreateEnum
CREATE TYPE "RuleConnector" AS ENUM ('AND', 'OR', 'NOT');

-- CreateEnum
CREATE TYPE "RuleAction" AS ENUM ('BLOCK', 'REQUIRE_APPROVAL', 'WARN', 'AUTO_APPROVE');

-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('CATEGORY_LIMIT', 'PER_TRANSACTION_LIMIT', 'DAILY_LIMIT', 'WEEKLY_LIMIT', 'MONTHLY_LIMIT', 'ALLOWED_CATEGORY', 'RESTRICTED_CATEGORY', 'APPROVAL_THRESHOLD', 'MERCHANT_RULE', 'GEO_RULE', 'TIME_RULE', 'VELOCITY_RULE');

-- CreateEnum
CREATE TYPE "SpendingRightMode" AS ENUM ('ALLOWED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ApprovalSubject" AS ENUM ('TRANSACTION', 'BUDGET', 'SPENDING_RIGHT', 'BUSINESS_EVENT');

-- CreateTable
CREATE TABLE "countries" (
    "id" UUID NOT NULL,
    "code" VARCHAR(2) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "currencyCode" VARCHAR(3),

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL,
    "countryId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "state" VARCHAR(120),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "symbol" VARCHAR(8) NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 2,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "module" VARCHAR(40) NOT NULL,
    "description" VARCHAR(200) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "legalName" VARCHAR(160) NOT NULL,
    "displayName" VARCHAR(80) NOT NULL,
    "gstin" VARCHAR(20),
    "currencyCode" VARCHAR(3) NOT NULL,
    "countryId" UUID NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdById" UUID,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_units" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "headEmployeeId" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "business_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "businessUnitId" UUID,
    "name" VARCHAR(80) NOT NULL,
    "headEmployeeId" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "budgetCeiling" DECIMAL(14,2),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_types" (
    "id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "description" VARCHAR(200),

    CONSTRAINT "project_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "typeId" UUID,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "client" VARCHAR(160),
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "budgetCap" DECIMAL(14,2),
    "startDate" DATE,
    "endDate" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_grades" (
    "id" UUID NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "employee_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_roles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "description" VARCHAR(200),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "employee_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "employeeCode" VARCHAR(30) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(20),
    "designation" VARCHAR(120),
    "gradeId" UUID,
    "roleId" UUID NOT NULL,
    "departmentId" UUID,
    "projectId" UUID,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "passwordHash" TEXT,
    "lastLoginAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manager_assignments" (
    "id" UUID NOT NULL,
    "managerId" UUID NOT NULL,
    "subordinateId" UUID NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMPTZ(6),
    "primary" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "manager_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "tokenHash" VARCHAR(120) NOT NULL,
    "issuedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "revokedAt" TIMESTAMPTZ(6),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(400),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" DATE,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_rules" (
    "id" UUID NOT NULL,
    "policyId" UUID NOT NULL,
    "ruleType" "RuleType" NOT NULL,
    "field" VARCHAR(60) NOT NULL,
    "operator" "RuleOperator" NOT NULL,
    "valueNumeric" DECIMAL(14,2),
    "valueText" VARCHAR(160),
    "valueJson" JSONB,
    "connector" "RuleConnector" NOT NULL DEFAULT 'AND',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "actionOnViolation" "RuleAction" NOT NULL DEFAULT 'REQUIRE_APPROVAL',
    "message" VARCHAR(200),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "policy_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_categories" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "description" VARCHAR(200),

    CONSTRAINT "budget_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "categoryId" UUID,
    "name" VARCHAR(160) NOT NULL,
    "type" "BudgetType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "spent" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currencyCode" VARCHAR(3) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "costCenterId" UUID,
    "projectId" UUID,
    "employeeId" UUID,
    "businessEventId" UUID,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" "BudgetStatus" NOT NULL DEFAULT 'ACTIVE',
    "breakdown" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spending_rights" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "projectId" UUID,
    "costCenterId" UUID,
    "businessEventId" UUID,
    "policyId" UUID,
    "approvalWorkflowId" UUID,
    "allocatedAmount" DECIMAL(14,2) NOT NULL,
    "consumedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currencyCode" VARCHAR(3) NOT NULL,
    "validityStart" TIMESTAMPTZ(6) NOT NULL,
    "validityEnd" TIMESTAMPTZ(6) NOT NULL,
    "singleTransactionLimit" DECIMAL(14,2),
    "dailyLimit" DECIMAL(14,2),
    "weeklyLimit" DECIMAL(14,2),
    "monthlyLimit" DECIMAL(14,2),
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "status" "BudgetStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "spending_rights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spending_right_categories" (
    "id" UUID NOT NULL,
    "spendingRightId" UUID NOT NULL,
    "transactionCategoryId" UUID NOT NULL,
    "mode" "SpendingRightMode" NOT NULL,

    CONSTRAINT "spending_right_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_events" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "ownerEmployeeId" UUID NOT NULL,
    "projectId" UUID,
    "costCenterId" UUID,
    "type" "EventType" NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "location" VARCHAR(160),
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "businessEventId" UUID NOT NULL,
    "originCityId" UUID,
    "destinationCityId" UUID,
    "mode" "TravelMode",

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_categories" (
    "id" UUID NOT NULL,
    "mcc" VARCHAR(6),
    "name" VARCHAR(120) NOT NULL,
    "isRestrictedDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "merchant_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchants" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "mcc" VARCHAR(6),
    "categoryId" UUID,
    "upiId" VARCHAR(60),
    "cityId" UUID,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_categories" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(200),
    "parentId" UUID,

    CONSTRAINT "transaction_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_workflows" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "entity" "ApprovalSubject" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_steps" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "roleId" UUID,
    "employeeId" UUID,
    "condition" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" UUID NOT NULL,
    "workflowId" UUID,
    "currentStepId" UUID,
    "subjectType" "ApprovalSubject" NOT NULL,
    "subjectId" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(6),

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_history" (
    "id" UUID NOT NULL,
    "approvalId" UUID NOT NULL,
    "stepId" UUID,
    "actorEmployeeId" UUID NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(30) NOT NULL,
    "organizationId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "managerId" UUID,
    "projectId" UUID,
    "businessEventId" UUID,
    "spendingRightId" UUID,
    "policyId" UUID,
    "merchantId" UUID,
    "merchantName" VARCHAR(200) NOT NULL,
    "merchantCategoryId" UUID,
    "transactionCategoryId" UUID,
    "budgetId" UUID,
    "costCenterId" UUID,
    "amount" DECIMAL(14,2) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,
    "upiReference" VARCHAR(60),
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "deviceId" VARCHAR(80),
    "reason" TEXT,
    "method" VARCHAR(20) NOT NULL DEFAULT 'UPI',
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_events" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "transactionId" UUID,
    "employeeId" UUID,
    "type" "RiskType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "score" INTEGER NOT NULL,
    "reason" VARCHAR(400) NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" UUID,
    "resolvedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "channel" "NotifChannel" NOT NULL DEFAULT 'INAPP',
    "type" VARCHAR(40) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" TEXT,
    "entityRefType" VARCHAR(30),
    "entityRefId" UUID,
    "status" "NotifStatus" NOT NULL DEFAULT 'UNREAD',
    "readAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "actorEmployeeId" UUID,
    "action" "AuditAction" NOT NULL,
    "entity" VARCHAR(40) NOT NULL,
    "entityId" UUID,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "entity" VARCHAR(40) NOT NULL,
    "entityId" UUID NOT NULL,
    "filename" VARCHAR(200) NOT NULL,
    "mimeType" VARCHAR(80) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "value" JSONB NOT NULL,
    "description" VARCHAR(200),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedById" UUID,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE INDEX "cities_countryId_idx" ON "cities"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "cities_countryId_name_key" ON "cities"("countryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_module_idx" ON "permissions"("module");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_gstin_key" ON "organizations"("gstin");

-- CreateIndex
CREATE INDEX "business_units_organizationId_idx" ON "business_units"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "business_units_organizationId_code_key" ON "business_units"("organizationId", "code");

-- CreateIndex
CREATE INDEX "departments_organizationId_businessUnitId_idx" ON "departments"("organizationId", "businessUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_organizationId_name_key" ON "departments"("organizationId", "name");

-- CreateIndex
CREATE INDEX "cost_centers_departmentId_idx" ON "cost_centers"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_organizationId_code_key" ON "cost_centers"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "project_types_name_key" ON "project_types"("name");

-- CreateIndex
CREATE INDEX "projects_organizationId_status_idx" ON "projects"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "projects_organizationId_code_key" ON "projects"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "employee_grades_name_key" ON "employee_grades"("name");

-- CreateIndex
CREATE UNIQUE INDEX "employee_grades_level_key" ON "employee_grades"("level");

-- CreateIndex
CREATE UNIQUE INDEX "employee_roles_name_key" ON "employee_roles"("name");

-- CreateIndex
CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "employees_organizationId_roleId_idx" ON "employees"("organizationId", "roleId");

-- CreateIndex
CREATE INDEX "employees_organizationId_departmentId_idx" ON "employees"("organizationId", "departmentId");

-- CreateIndex
CREATE INDEX "employees_organizationId_status_idx" ON "employees"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "employees_organizationId_email_key" ON "employees"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_organizationId_employeeCode_key" ON "employees"("organizationId", "employeeCode");

-- CreateIndex
CREATE INDEX "manager_assignments_subordinateId_idx" ON "manager_assignments"("subordinateId");

-- CreateIndex
CREATE UNIQUE INDEX "manager_assignments_managerId_subordinateId_effectiveFrom_key" ON "manager_assignments"("managerId", "subordinateId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_employeeId_expiresAt_idx" ON "sessions"("employeeId", "expiresAt");

-- CreateIndex
CREATE INDEX "policies_organizationId_isDefault_idx" ON "policies"("organizationId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "policies_organizationId_name_key" ON "policies"("organizationId", "name");

-- CreateIndex
CREATE INDEX "policy_rules_policyId_sortOrder_idx" ON "policy_rules"("policyId", "sortOrder");

-- CreateIndex
CREATE INDEX "policy_rules_policyId_active_idx" ON "policy_rules"("policyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "budget_categories_organizationId_name_key" ON "budget_categories"("organizationId", "name");

-- CreateIndex
CREATE INDEX "budgets_organizationId_status_idx" ON "budgets"("organizationId", "status");

-- CreateIndex
CREATE INDEX "budgets_projectId_idx" ON "budgets"("projectId");

-- CreateIndex
CREATE INDEX "budgets_costCenterId_idx" ON "budgets"("costCenterId");

-- CreateIndex
CREATE INDEX "budgets_employeeId_idx" ON "budgets"("employeeId");

-- CreateIndex
CREATE INDEX "spending_rights_organizationId_employeeId_status_idx" ON "spending_rights"("organizationId", "employeeId", "status");

-- CreateIndex
CREATE INDEX "spending_rights_validityEnd_idx" ON "spending_rights"("validityEnd");

-- CreateIndex
CREATE INDEX "spending_right_categories_spendingRightId_mode_idx" ON "spending_right_categories"("spendingRightId", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "spending_right_categories_spendingRightId_transactionCatego_key" ON "spending_right_categories"("spendingRightId", "transactionCategoryId");

-- CreateIndex
CREATE INDEX "business_events_organizationId_status_startDate_idx" ON "business_events"("organizationId", "status", "startDate");

-- CreateIndex
CREATE INDEX "business_events_ownerEmployeeId_idx" ON "business_events"("ownerEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "trips_businessEventId_key" ON "trips"("businessEventId");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_categories_mcc_key" ON "merchant_categories"("mcc");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_categories_name_key" ON "merchant_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_upiId_key" ON "merchants"("upiId");

-- CreateIndex
CREATE INDEX "merchants_mcc_idx" ON "merchants"("mcc");

-- CreateIndex
CREATE INDEX "merchants_categoryId_idx" ON "merchants"("categoryId");

-- CreateIndex
CREATE INDEX "transaction_categories_organizationId_parentId_idx" ON "transaction_categories"("organizationId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_categories_organizationId_name_key" ON "transaction_categories"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "approval_workflows_organizationId_name_key" ON "approval_workflows"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "approval_steps_workflowId_sortOrder_key" ON "approval_steps"("workflowId", "sortOrder");

-- CreateIndex
CREATE INDEX "approvals_subjectType_subjectId_idx" ON "approvals"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "approvals_status_createdAt_idx" ON "approvals"("status", "createdAt");

-- CreateIndex
CREATE INDEX "approval_history_approvalId_createdAt_idx" ON "approval_history"("approvalId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reference_key" ON "transactions"("reference");

-- CreateIndex
CREATE INDEX "transactions_organizationId_occurredAt_idx" ON "transactions"("organizationId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "transactions_employeeId_occurredAt_idx" ON "transactions"("employeeId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "transactions_projectId_occurredAt_idx" ON "transactions"("projectId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "transactions_costCenterId_occurredAt_idx" ON "transactions"("costCenterId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "transactions_budgetId_idx" ON "transactions"("budgetId");

-- CreateIndex
CREATE INDEX "transactions_spendingRightId_idx" ON "transactions"("spendingRightId");

-- CreateIndex
CREATE INDEX "transactions_merchantId_idx" ON "transactions"("merchantId");

-- CreateIndex
CREATE INDEX "transactions_paymentStatus_idx" ON "transactions"("paymentStatus");

-- CreateIndex
CREATE INDEX "transactions_approvalStatus_idx" ON "transactions"("approvalStatus");

-- CreateIndex
CREATE INDEX "risk_events_organizationId_severity_resolved_idx" ON "risk_events"("organizationId", "severity", "resolved");

-- CreateIndex
CREATE INDEX "risk_events_transactionId_idx" ON "risk_events"("transactionId");

-- CreateIndex
CREATE INDEX "notifications_employeeId_status_idx" ON "notifications"("employeeId", "status");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_createdAt_idx" ON "audit_logs"("entity", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "attachments_entity_entityId_idx" ON "attachments"("entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "settings_organizationId_key_key" ON "settings"("organizationId", "key");

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_headEmployeeId_fkey" FOREIGN KEY ("headEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_headEmployeeId_fkey" FOREIGN KEY ("headEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "project_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "employee_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "employee_grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "employee_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_assignments" ADD CONSTRAINT "manager_assignments_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_assignments" ADD CONSTRAINT "manager_assignments_subordinateId_fkey" FOREIGN KEY ("subordinateId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_rules" ADD CONSTRAINT "policy_rules_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "budget_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_businessEventId_fkey" FOREIGN KEY ("businessEventId") REFERENCES "business_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spending_rights" ADD CONSTRAINT "spending_rights_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spending_rights" ADD CONSTRAINT "spending_rights_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spending_rights" ADD CONSTRAINT "spending_rights_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spending_rights" ADD CONSTRAINT "spending_rights_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spending_rights" ADD CONSTRAINT "spending_rights_businessEventId_fkey" FOREIGN KEY ("businessEventId") REFERENCES "business_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spending_rights" ADD CONSTRAINT "spending_rights_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spending_rights" ADD CONSTRAINT "spending_rights_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spending_rights" ADD CONSTRAINT "spending_rights_approvalWorkflowId_fkey" FOREIGN KEY ("approvalWorkflowId") REFERENCES "approval_workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spending_right_categories" ADD CONSTRAINT "spending_right_categories_spendingRightId_fkey" FOREIGN KEY ("spendingRightId") REFERENCES "spending_rights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spending_right_categories" ADD CONSTRAINT "spending_right_categories_transactionCategoryId_fkey" FOREIGN KEY ("transactionCategoryId") REFERENCES "transaction_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_events" ADD CONSTRAINT "business_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_events" ADD CONSTRAINT "business_events_ownerEmployeeId_fkey" FOREIGN KEY ("ownerEmployeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_events" ADD CONSTRAINT "business_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_events" ADD CONSTRAINT "business_events_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_businessEventId_fkey" FOREIGN KEY ("businessEventId") REFERENCES "business_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_originCityId_fkey" FOREIGN KEY ("originCityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_destinationCityId_fkey" FOREIGN KEY ("destinationCityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "merchant_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_categories" ADD CONSTRAINT "transaction_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_categories" ADD CONSTRAINT "transaction_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "transaction_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_workflows" ADD CONSTRAINT "approval_workflows_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "approval_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "employee_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "approval_workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_currentStepId_fkey" FOREIGN KEY ("currentStepId") REFERENCES "approval_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_txn_fk" FOREIGN KEY ("subjectId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_history" ADD CONSTRAINT "approval_history_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "approvals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_history" ADD CONSTRAINT "approval_history_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "approval_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_history" ADD CONSTRAINT "approval_history_actorEmployeeId_fkey" FOREIGN KEY ("actorEmployeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_businessEventId_fkey" FOREIGN KEY ("businessEventId") REFERENCES "business_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_spendingRightId_fkey" FOREIGN KEY ("spendingRightId") REFERENCES "spending_rights"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchantCategoryId_fkey" FOREIGN KEY ("merchantCategoryId") REFERENCES "merchant_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transactionCategoryId_fkey" FOREIGN KEY ("transactionCategoryId") REFERENCES "transaction_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorEmployeeId_fkey" FOREIGN KEY ("actorEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attach_txn_fk" FOREIGN KEY ("entityId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

