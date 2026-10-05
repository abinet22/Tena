# TenaPharm - Ethiopian Pharmacy Management SaaS

A multi-tenant, cloud-native Pharmacy Management System engineered specifically for Ethiopian retail and wholesale pharmacies, adhering to Ethiopian Food & Drug Authority (EFDA) compliance, dual-calendar (Ethiopian Calendar EC / Gregorian Calendar GC), Amharic/English bilingual operations, and Telebirr/CBE payment integration readiness.

---

## High-Level Architecture & Stack

- **Frontend**: Next.js (App Router, TypeScript, Tailwind CSS, Lucide icons)
- **Backend**: NestJS (TypeScript, Modular Architecture, Request-Scoped Tenant Context)
- **Database**: PostgreSQL 16 with **Row-Level Security (RLS)** ensuring physical tenant isolation
- **ORM**: Prisma Client with `$executeRawUnsafe("SET LOCAL app.current_tenant_id = $1")`
- **Background Jobs**: Redis 7 + BullMQ for nightly expiry alerts, low-stock triggers, and automated backups
- **Authentication**: JWT Access Token (15-min) + Rotating HTTP-only Refresh Token (7-day) with tenant claims

---

## Multi-Tenancy & Row-Level Security (RLS)

Every table except system-level `tenants` contains a `tenant_id` foreign key. Rather than relying solely on developers remembering `where: { tenantId }`, TenaPharm leverages native PostgreSQL Row-Level Security:

```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON products
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
```

NestJS intercepts incoming authenticated requests and executes `SET LOCAL app.current_tenant_id = '...'` at transaction boundaries.

---

## Role-Based Access Control (RBAC)

1. **Admin**: Full access, user accounts, system configuration, all reports, audit trail.
2. **Inventory Manager**: Product & drug register, purchases/GRN, internal transfers, adjustments, write-offs, stock reports.
3. **Sales Manager**: Sales oversight, discounts, return approvals, credit customer limits, sales reports.
4. **Cashier / Dispensing Pharmacist**: POS dispensing only. **Cost prices are strictly concealed across all endpoints and UI views.**

---

## Deliverables in This Phase (Phase 1)

1. **Prisma Schema (`prisma/schema.prisma`)**: Complete data models with `tenant_id`, indexes, relations, soft deletes.
2. **PostgreSQL RLS Migration (`prisma/migrations/0_init_rls/migration.sql`)**: Automated RLS policies for all 14 tenant-scoped tables.
3. **Database Seed Script (`prisma/seed.ts`)**: Sample Ethiopian pharmacies, EFDA categories with flags, INN generics, domestic manufacturers (EPHARM, Cadila), and multi-tier units.
4. **Docker Compose (`docker-compose.yml`)**: Production containers for PostgreSQL 16, Redis 7, NestJS API, and Next.js Web.
5. **Interactive Live Frontend & Stock Engine Verification**:
   - Multi-tenant switcher & Super Admin subscription approval
   - Role switcher with dynamic permission & cost price hiding
   - Location management (Store vs Dispensary)
   - Product & Drug Register (Medicines with unit conversions & General products driven by category flags)
   - Master data CRUD and Excel/CSV import & export
   - Dual-calendar (Ethiopian Calendar EC / Gregorian Calendar GC) and Amharic (አማርኛ) localization
   - Automated in-browser test runner verifying the Stock Engine & FEFO logic

---

## Running with Docker Compose

```bash
# 1. Clone repository
git clone https://github.com/tenapharm/tenapharm-saas.git
cd tenapharm-saas

# 2. Copy environment configuration
cp .env.example .env

# 3. Start PostgreSQL and Redis
docker compose up -d postgres redis

# 4. Run Prisma Migrations and Seed
npx prisma migrate dev --name init
npx prisma db seed

# 5. Start Backend and Frontend
docker compose up -d
```

---

## Roadmap

- [x] **Phase 1**: Authentication, Tenants, Roles & Permissions, Locations, Drug Register & Master Data, Ethiopian Calendar, Live Interactive Testing Suite.
- [x] **Phase 2**: Purchasing (PO -> GRN into Store -> Supplier Invoicing & Payables), Stock Engine (Balances, Movements, Store -> Dispensary Transfers with Shortage Prompts), Point of Sale (POS with Telebirr / CBE Birr / Cash / Credit split payments, FEFO batch auto-allocation, Generic Brand Substitutions, Hold Bills, Thermal Receipt).
- [ ] **Phase 3**: Comprehensive Reports (Inventory Expiry 30/60/90d, Stock Valuation, Sales & Shift Cash-Up, Financial Gross Margin, VAT & EFDA Compliance), Bulk Excel Import, and Super Admin billing dashboard.
