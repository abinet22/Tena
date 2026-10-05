import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Runs an operation with request-scoped PostgreSQL Row-Level Security (RLS) tenant isolation.
   * This guarantees that even if a developer forgets a `where: { tenantId }`, the database engine
   * physically isolates data per tenant.
   */
  async withTenant<T>(tenantId: string, fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      // Set the session variable for RLS
      await tx.$executeRawUnsafe(
        `SET LOCAL app.current_tenant_id = '${tenantId.replace(/'/g, "''")}';`
      );
      return fn(tx as unknown as PrismaClient);
    });
  }

  /**
   * Super Admin bypass for managing platform-level tenants and subscription billing.
   */
  async withSuperAdmin<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.bypass_rls = 'on';`);
      return fn(tx as unknown as PrismaClient);
    });
  }
}
