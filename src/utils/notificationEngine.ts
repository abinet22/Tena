import { AppNotification, Batch, Product, StockBalance, Customer, RoleCode } from '../types/pharmacy';

/**
 * Automated Nightly Expiry and Low-Stock Alert Job Runner.
 * Simulates the BullMQ / Redis background worker running scheduled cron tasks.
 * Writes targeted Notification records per role:
 * - ADMIN: Critical expiration, EFDA quarantine audit, and credit limit breaches
 * - INVENTORY_MANAGER: Batches expiring within 30/90 days and reorder thresholds reached
 * - CASHIER_PHARMACIST: Dispensary counter out-of-stock items and retail alerts
 */
export function runNightlyExpiryAndLowStockJob(
  tenantId: string,
  products: Product[],
  batches: Batch[],
  balances: StockBalance[],
  customers: Customer[],
  now: Date = new Date()
): AppNotification[] {
  const newNotifications: AppNotification[] = [];
  const nowTime = now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. Scan Batches for Expiry
  batches.forEach((b) => {
    if (b.tenantId && b.tenantId !== tenantId) return;
    const expTime = new Date(b.expiryDate).getTime();
    if (isNaN(expTime)) return;

    const daysUntilExpiry = Math.ceil((expTime - nowTime) / dayMs);
    const prod = products.find((p) => p.id === b.productId);
    const prodName = prod?.brandName || 'Medicine';

    if (daysUntilExpiry <= 0) {
      // Expired!
      newNotifications.push({
        id: `notif-exp-crit-${b.id}-${Date.now()}`,
        tenantId,
        roleTarget: 'ADMIN',
        title: `CRITICAL: Expired Batch ${b.batchNumber}`,
        message: `${prodName} [Batch: ${b.batchNumber}] expired ${Math.abs(daysUntilExpiry)} days ago (${b.expiryDate}). Immediate quarantine & EFDA write-off required.`,
        type: 'EXPIRY_WARNING',
        severity: 'CRITICAL',
        createdAt: now.toISOString(),
        read: false,
        linkTab: 'INVENTORY',
      });
      newNotifications.push({
        id: `notif-exp-inv-${b.id}-${Date.now()}`,
        tenantId,
        roleTarget: 'INVENTORY_MANAGER',
        title: `Quarantine Notice: ${b.batchNumber}`,
        message: `${prodName} [Batch: ${b.batchNumber}] is expired. Blocked from dispensing and transfers.`,
        type: 'EXPIRY_WARNING',
        severity: 'CRITICAL',
        createdAt: now.toISOString(),
        read: false,
        linkTab: 'INVENTORY',
      });
    } else if (daysUntilExpiry <= 30) {
      // Expiring in < 30 days
      newNotifications.push({
        id: `notif-exp-30-${b.id}-${Date.now()}`,
        tenantId,
        roleTarget: 'INVENTORY_MANAGER',
        title: `Urgent FEFO Alert: Expires in ${daysUntilExpiry} Days`,
        message: `${prodName} [Batch: ${b.batchNumber}] expires soon on ${b.expiryDate}. Prioritize for dispensary clearance.`,
        type: 'EXPIRY_WARNING',
        severity: 'WARNING',
        createdAt: now.toISOString(),
        read: false,
        linkTab: 'POS',
      });
    }
  });

  // 2. Scan Products for Low Stock (below reorder level)
  products.forEach((p) => {
    if (p.tenantId && p.tenantId !== tenantId) return;
    const totalStock = balances
      .filter((b) => b.productId === p.id)
      .reduce((sum, b) => sum + b.quantity, 0);

    if (totalStock <= (p.reorderLevel || 50)) {
      newNotifications.push({
        id: `notif-stock-${p.id}-${Date.now()}`,
        tenantId,
        roleTarget: 'INVENTORY_MANAGER',
        title: `Low Stock: ${p.brandName}`,
        message: `Current total physical stock (${totalStock} ${p.baseUnit}s) reached reorder threshold (${p.reorderLevel || 50}). Reorder ${p.reorderQuantity || 200} recommended.`,
        type: 'LOW_STOCK',
        severity: 'WARNING',
        createdAt: now.toISOString(),
        read: false,
        linkTab: 'PURCHASING',
      });

      // Cashier notification if dispensary is empty
      const dispStock = balances
        .filter((b) => b.productId === p.id && b.locationId.includes('disp'))
        .reduce((sum, b) => sum + b.quantity, 0);

      if (dispStock === 0) {
        newNotifications.push({
          id: `notif-disp-stock-${p.id}-${Date.now()}`,
          tenantId,
          roleTarget: 'CASHIER_PHARMACIST',
          title: `Dispensary Counter Out-of-Stock: ${p.brandName}`,
          message: `${p.brandName} is completely depleted at the front counter. Request internal transfer from store.`,
          type: 'LOW_STOCK',
          severity: 'INFO',
          createdAt: now.toISOString(),
          read: false,
          linkTab: 'POS',
        });
      }
    }
  });

  // 3. Scan Customers for Credit Limit Exceeded
  customers.forEach((c) => {
    if (c.tenantId && c.tenantId !== tenantId) return;
    if (c.currentDebt >= c.creditLimit) {
      newNotifications.push({
        id: `notif-cred-${c.id}-${Date.now()}`,
        tenantId,
        roleTarget: 'ADMIN',
        title: `Credit Limit Reached: ${c.fullName}`,
        message: `Patient / Client debt (${c.currentDebt.toFixed(2)} ETB) has reached limit (${c.creditLimit.toFixed(2)} ETB). Sales Manager approval required for future credit.`,
        type: 'CREDIT_LIMIT',
        severity: 'WARNING',
        createdAt: now.toISOString(),
        read: false,
        linkTab: 'CUSTOMERS',
      });
    }
  });

  return newNotifications;
}
