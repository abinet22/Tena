import React, { useState } from 'react';
import {
  Code2, Database, ShieldCheck, Container, FileText,
  Copy, Check, ExternalLink, Terminal
} from 'lucide-react';

export const ArchitectureViewer: React.FC = () => {
  const [activeFile, setActiveFile] = useState<
    'SCHEMA' | 'RLS' | 'SEED' | 'DOCKER' | 'MIDDLEWARE' | 'PRISMA_SERVICE'
  >('SCHEMA');
  const [copied, setCopied] = useState(false);

  const fileContents: Record<string, { title: string; lang: string; path: string; code: string }> = {
    SCHEMA: {
      title: 'Prisma Schema with Tenant ID & Multi-Tenancy',
      lang: 'prisma',
      path: 'prisma/schema.prisma',
      code: `// Multi-tenant Ethiopian Pharmacy SaaS (TenaPharm)
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Tenant {
  id                    String             @id @default(uuid()) @db.Uuid
  name                  String             @db.VarChar(255)
  slug                  String             @unique @db.VarChar(100)
  tinNumber             String?            @db.VarChar(50) // Ethiopian Tax ID
  licenseNumber         String?            @db.VarChar(100) // EFDA License
  plan                  SubscriptionPlan   @default(STARTER)
  status                SubscriptionStatus @default(TRIAL)
  paymentReference      String?            @db.VarChar(100)
  useEthiopianCalendar  Boolean            @default(true)
  // ... relations to users, roles, products, locations, stock
}

model Product {
  id                   String           @id @default(uuid()) @db.Uuid
  tenantId             String           @db.Uuid
  productType          ProductType      @default(MEDICINE)
  categoryId           String           @db.Uuid
  brandName            String           @db.VarChar(200)
  genericId            String?          @db.Uuid
  baseUnit             String           @default("Tablet")
  secondaryUnit        String?
  secondaryRatio       Int?
  tertiaryUnit         String?
  tertiaryRatio        Int?
  isControlled         Boolean          @default(false)
  prescriptionRequired Boolean          @default(true)
  // ... relations to category, generic, batches, stockBalances
}

model StockBalance {
  id         String    @id @default(uuid()) @db.Uuid
  tenantId   String    @db.Uuid
  locationId String    @db.Uuid
  productId  String    @db.Uuid
  batchId    String    @db.Uuid
  quantity   Int       @default(0) // In base units
  reserved   Int       @default(0)
  // Row-locked on updates inside the same transaction as StockMovement
}

model StockMovement {
  id                    String        @id @default(uuid()) @db.Uuid
  tenantId              String        @db.Uuid
  movementType          MovementType  // PURCHASE, SALE, TRANSFER_IN, TRANSFER_OUT...
  referenceNumber       String
  productId             String        @db.Uuid
  batchId               String        @db.Uuid
  quantity              Int
  unitCost              Decimal       @db.Decimal(12, 2)
  unitPrice             Decimal       @db.Decimal(12, 2)
  createdAt             DateTime      @default(now())
}`,
    },
    RLS: {
      title: 'PostgreSQL Row-Level Security (RLS) Isolation Policies',
      lang: 'sql',
      path: 'prisma/migrations/0_init_rls/migration.sql',
      code: `-- PostgreSQL Row-Level Security (RLS) Migration for TenaPharm Multi-Tenancy

CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_rls_bypassed() RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(current_setting('app.bypass_rls', true) = 'on', false);
END;
$$ LANGUAGE plpgsql STABLE;

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'roles', 'users', 'locations', 'categories', 'generics',
    'manufacturers', 'suppliers', 'units', 'products', 'batches',
    'stock_balances', 'stock_movements', 'customers', 'audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_policy ON %I ' ||
      'AS RESTRICTIVE FOR ALL ' ||
      'USING (is_rls_bypassed() OR tenant_id = current_tenant_id()) ' ||
      'WITH CHECK (is_rls_bypassed() OR tenant_id = current_tenant_id());',
      tbl
    );
  END LOOP;
END;
$$;`,
    },
    SEED: {
      title: 'Database Seed Script with Ethiopian Standard Data',
      lang: 'typescript',
      path: 'prisma/seed.ts',
      code: `// Populates default tenant (Abyssinia Central Pharmacy), EFDA categories,
// Ethiopian domestic manufacturers (EPHARM, Cadila), INN generics,
// and sample medicines & general baby goods with unit conversions.

import { PrismaClient, SubscriptionPlan, SubscriptionStatus, RoleType } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'abyssinia-central-pharmacy' },
    update: {},
    create: {
      name: 'Abyssinia Central Pharmacy',
      slug: 'abyssinia-central-pharmacy',
      tinNumber: '0029384756',
      licenseNumber: 'EFDA/LIC/AA/2024/0982',
      region: 'Addis Ababa',
      city: 'Addis Ababa',
      subCity: 'Bole',
      plan: SubscriptionPlan.ENTERPRISE,
      status: SubscriptionStatus.ACTIVE,
      paymentReference: 'CBE-TXN-20241002-88392',
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      useEthiopianCalendar: true,
    },
  });
  // ... seeds Admin, Inventory Mgr, Sales Mgr, Cashier, EFDA categories, etc.
}`,
    },
    DOCKER: {
      title: 'Docker Compose (PostgreSQL RLS, Redis BullMQ, NestJS, Next.js)',
      lang: 'yaml',
      path: 'docker-compose.yml',
      code: `version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: tenapharm_postgres
    restart: always
    environment:
      POSTGRES_USER: tenapharm_user
      POSTGRES_PASSWORD: TenaPharmSecret2025!
      POSTGRES_DB: tenapharm_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./prisma/migrations/0_init_rls/migration.sql:/docker-entrypoint-initdb.d/01_init_rls.sql

  redis:
    image: redis:7-alpine
    container_name: tenapharm_redis
    command: redis-server --appendonly yes --requirepass RedisSecurePass2025!
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    container_name: tenapharm_backend
    environment:
      DATABASE_URL: "postgresql://tenapharm_user:TenaPharmSecret2025!@postgres:5432/tenapharm_db?schema=public"
      REDIS_HOST: redis
    ports:
      - "4000:4000"

  frontend:
    build: ./frontend
    container_name: tenapharm_frontend
    ports:
      - "3000:3000"`,
    },
    MIDDLEWARE: {
      title: 'NestJS Request-Scoped Tenant Context Middleware',
      lang: 'typescript',
      path: 'backend/src/common/middleware/tenant-context.middleware.ts',
      code: `import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: any, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        req.tenantId = decoded.tenantId;
        req.userId = decoded.sub;
        req.userRole = decoded.role;
        req.userPermissions = decoded.permissions || [];
      } catch (err) {}
    }
    next();
  }
}`,
    },
    PRISMA_SERVICE: {
      title: 'NestJS Prisma Service with SET LOCAL RLS Injection',
      lang: 'typescript',
      path: 'backend/src/prisma/prisma.service.ts',
      code: `import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient {
  /**
   * Executes a transaction with request-scoped PostgreSQL RLS tenant context
   */
  async withTenant<T>(tenantId: string, fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        \`SET LOCAL app.current_tenant_id = '\${tenantId.replace(/'/g, "''")}';\`
      );
      return fn(tx as unknown as PrismaClient);
    });
  }

  /**
   * Super Admin bypass for cross-tenant billing operations
   */
  async withSuperAdmin<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(\`SET LOCAL app.bypass_rls = 'on';\`);
      return fn(tx as unknown as PrismaClient);
    });
  }
}`,
    },
  };

  const currentFile = fileContents[activeFile];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* File Tabs */}
      <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs">
        <button
          onClick={() => setActiveFile('SCHEMA')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
            activeFile === 'SCHEMA' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          schema.prisma
        </button>
        <button
          onClick={() => setActiveFile('RLS')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
            activeFile === 'RLS' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
          0_init_rls.sql
        </button>
        <button
          onClick={() => setActiveFile('SEED')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
            activeFile === 'SEED' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-amber-600" />
          seed.ts
        </button>
        <button
          onClick={() => setActiveFile('DOCKER')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
            activeFile === 'DOCKER' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Container className="w-3.5 h-3.5 text-blue-600" />
          docker-compose.yml
        </button>
        <button
          onClick={() => setActiveFile('MIDDLEWARE')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
            activeFile === 'MIDDLEWARE' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code2 className="w-3.5 h-3.5 text-purple-600" />
          tenant-context.middleware.ts
        </button>
        <button
          onClick={() => setActiveFile('PRISMA_SERVICE')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
            activeFile === 'PRISMA_SERVICE' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-teal-600" />
          prisma.service.ts
        </button>
      </div>

      {/* Code Container */}
      <div className="bg-slate-950 text-slate-200 rounded-2xl overflow-hidden border border-slate-800 shadow-md">
        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-emerald-400 font-semibold">{currentFile.path}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">{currentFile.title}</span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>
        </div>

        <pre className="p-4 font-mono text-xs overflow-x-auto leading-relaxed text-slate-300 max-h-[500px]">
          <code>{currentFile.code}</code>
        </pre>
      </div>
    </div>
  );
};
