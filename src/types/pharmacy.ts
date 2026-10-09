export type SubscriptionPlan = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
export type SubscriptionStatus = 'PENDING_PAYMENT' | 'PENDING_VERIFICATION' | 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
export type LocationType = 'STORE' | 'DISPENSARY';
export type RoleCode = 'ADMIN' | 'INVENTORY_MANAGER' | 'SALES_MANAGER' | 'CASHIER_PHARMACIST' | 'CUSTOM';
export type ProductType = 'MEDICINE' | 'GENERAL';
export type StorageCondition = 'ROOM_TEMPERATURE' | 'COOL' | 'COLD_CHAIN' | 'FREEZER' | 'PROTECT_FROM_LIGHT';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  tinNumber: string;
  licenseNumber: string;
  region: string;
  city: string;
  subCity: string;
  woreda: string;
  phone: string;
  email: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  paymentReference?: string;
  paymentMethod?: 'TELEBIRR' | 'CBE_BIRR' | 'CHAPA_BANK';
  paymentAmount?: number;
  activationCode?: string;
  registeredAt?: string;
  trialEndsAt: string;
  subscriptionExpiresAt?: string;
  useEthiopianCalendar: boolean;
  defaultLanguage: 'en' | 'am';
}

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  code: RoleCode;
  description: string;
  permissions: string[];
  isSystem: boolean;
}

export interface User {
  id: string;
  tenantId: string;
  roleId: string;
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  branchName?: string;
  assignedBranchNames?: string[]; // Multiple branches supported for multi-branch staff
  isPlatformAdmin?: boolean; // true if SaaS Super Admin controlling all pharmacies
  isActive: boolean;
  avatarUrl?: string;
  createdAt?: string;
}

export interface Location {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  branchName?: string;
  type: LocationType;
  isDefault: boolean;
  phone?: string;
  address?: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isMedicine: boolean;
  trackBatch: boolean;
  trackExpiry: boolean;
}

export interface Generic {
  id: string;
  tenantId: string;
  name: string;
  therapeuticClass?: string;
  pregnancyCategory?: 'A' | 'B' | 'C' | 'D' | 'X';
  description?: string;
}

export interface Manufacturer {
  id: string;
  tenantId: string;
  name: string;
  country: string;
  address?: string;
  contact?: string;
}

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  tinNumber?: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  balanceDue: number;
}

export interface Unit {
  id: string;
  tenantId: string;
  name: string;
  abbreviation: string;
  isBase: boolean;
}

export interface Product {
  id: string;
  tenantId: string;
  productType: ProductType;
  categoryId: string;
  brandName: string;
  barcode?: string;

  // Medicine Specific Fields
  efdaRegistrationNo?: string;
  genericId?: string;
  dosageForm?: string;
  strength?: string;
  packSize?: string;
  manufacturerId?: string;
  countryOfOrigin?: string;
  storageCondition?: StorageCondition;
  isControlled?: boolean;
  prescriptionRequired?: boolean;
  isVatExempt?: boolean;

  // Unit Conversions
  baseUnit: string;
  secondaryUnit?: string;
  secondaryRatio?: number;
  tertiaryUnit?: string;
  tertiaryRatio?: number;

  // General Products Specific Fields
  variantSize?: string;
  standardSellingPrice?: number;

  reorderLevel: number;
  reorderQuantity: number;
  isActive: boolean;
}

export interface Batch {
  id: string;
  tenantId: string;
  productId: string;
  supplierId?: string;
  batchNumber: string;
  manufactureDate?: string;
  expiryDate: string;
  costPrice: number;
  sellingPrice: number;
  grnReference?: string;
}

export interface StockBalance {
  id: string;
  tenantId: string;
  locationId: string;
  productId: string;
  batchId: string;
  quantity: number; // In base units
  reserved: number;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  tenantId: string;
  movementType: string;
  referenceNumber: string;
  sourceLocationId?: string;
  destinationLocationId?: string;
  productId: string;
  batchId: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  notes?: string;
  performedByUserId?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  fullName: string;
  phone: string;
  email?: string;
  creditLimit: number;
  currentDebt: number;
  isActive: boolean;
}

export type POStatus = 'DRAFT' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  quantityRequested: number; // in base units
  unitCostEstimated: number;
  quantityReceived: number;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  poNumber: string;
  supplierId: string;
  status: POStatus;
  orderDate: string;
  expectedDate?: string;
  totalEstimatedCost: number;
  notes?: string;
  items: PurchaseOrderItem[];
}

export interface GRNItem {
  id: string;
  productId: string;
  batchNumber: string;
  manufactureDate?: string;
  expiryDate: string;
  quantityReceived: number; // in base units
  unitCost: number;
  unitSellingPrice: number;
}

export interface GRN {
  id: string;
  tenantId: string;
  grnNumber: string;
  poId?: string;
  supplierId: string;
  destinationLocationId: string; // Store
  invoiceNumber: string;
  receivedDate: string;
  totalCost: number;
  notes?: string;
  items: GRNItem[];
}

export type SupplierInvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export interface SupplierPayment {
  id: string;
  paymentDate: string;
  amount: number;
  paymentMethod: 'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER' | 'CASH' | 'CHEQUE';
  referenceNumber: string; // Bank Ref / CBE Birr / Telebirr Transaction ID
  notes?: string;
}

export interface SupplierInvoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  supplierId: string;
  grnId?: string;
  poId?: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: SupplierInvoiceStatus;
  paymentTerms?: string;
  payments: SupplierPayment[];
  notes?: string;
}

export type TransferStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'DISPATCHED' | 'RECEIVED' | 'CANCELLED';

export interface TransferOrderItem {
  id: string;
  productId: string;
  batchId: string;
  quantity: number; // in base units
}

export interface TransferOrder {
  id: string;
  tenantId: string;
  transferNumber: string;
  transferType?: 'INTERNAL_STORE_DISPENSARY' | 'INTER_BRANCH';
  sourceLocationId: string; // Store or Branch
  destinationLocationId: string; // Dispensary or Destination Branch
  status: TransferStatus;
  requestedBy: string;
  approvedBy?: string;
  driverName?: string;
  vehiclePlate?: string;
  createdAt: string;
  receivedAt?: string;
  notes?: string;
  items: TransferOrderItem[];
}

export interface PaymentSplit {
  method: 'CASH' | 'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER' | 'CREDIT';
  amount: number;
  reference?: string; // Telebirr / CBE transaction ref
}

export interface SalesItem {
  id: string;
  productId: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  unitType: 'BASE' | 'SECONDARY' | 'TERTIARY'; // Tablet, Strip, Box
  quantityInUnit: number;
  quantityInBase: number;
  unitPrice: number;
  totalPrice: number;
  isControlled?: boolean;
  prescriptionRequired?: boolean;
}

export interface SalesInvoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  locationId: string; // Dispensary
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  payments: PaymentSplit[];
  items: SalesItem[];
  createdAt: string;
  status: 'COMPLETED' | 'RETURNED' | 'PARTIALLY_RETURNED';
  prescriptionRef?: string;
}

export interface HeldBill {
  id: string;
  token: string;
  customerName?: string;
  items: SalesItem[];
  heldAt: string;
  notes?: string;
}

export interface StockAdjustment {
  id: string;
  tenantId: string;
  locationId: string;
  productId: string;
  batchId: string;
  type: 'INCREASE' | 'DECREASE';
  quantityVariance: number;
  reason: string;
  approvedBy: string;
  createdAt: string;
}

export interface StockWriteOff {
  id: string;
  tenantId: string;
  locationId: string;
  productId: string;
  batchId: string;
  reason: 'EXPIRED' | 'DAMAGED' | 'RECALLED_EFDA';
  quantity: number;
  approvedBy: string;
  disposalCertificateRef?: string;
  createdAt: string;
}

export type AuditCategory = 'STOCK_ENGINE' | 'POS_DISPENSING' | 'CONTROLLED_DRUGS' | 'USER_SECURITY' | 'PRICE_MASTER' | 'COMPLIANCE' | 'TENANT_ADMIN' | 'FINANCIAL';
export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'ALERT';

export interface AuditLog {
  id: string;
  tenantId: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId: string;
  entityName?: string;
  category: AuditCategory;
  severity: AuditSeverity;
  locationId?: string;
  locationName?: string;
  efdaComplianceCode?: string;
  reason?: string;
  prescriptionRef?: string;
  batchNumber?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  verificationHash?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  tenantId: string;
  roleTarget: RoleCode | 'ALL';
  title: string;
  message: string;
  type: 'EXPIRY_WARNING' | 'LOW_STOCK' | 'CREDIT_LIMIT' | 'AUDIT_ALERT';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  createdAt: string;
  read: boolean;
  linkTab?: string;
}

export const ALL_PERMISSIONS = [
  { id: 'tenants:manage', name: 'Manage Tenants', category: 'Administration' },
  { id: 'users:read', name: 'View Users', category: 'User Management' },
  { id: 'users:write', name: 'Create/Edit Users', category: 'User Management' },
  { id: 'roles:manage', name: 'Manage Roles & Permissions', category: 'User Management' },
  { id: 'locations:read', name: 'View Locations', category: 'Locations' },
  { id: 'locations:write', name: 'Create/Edit Locations', category: 'Locations' },
  { id: 'products:read', name: 'View Products & Generics', category: 'Products' },
  { id: 'products:write', name: 'Create/Edit Products', category: 'Products' },
  { id: 'products:delete', name: 'Delete Products', category: 'Products' },
  { id: 'master_data:manage', name: 'Manage Master Data (Generics, Mfrs, Cats)', category: 'Products' },
  { id: 'stock:read', name: 'View Stock Balances', category: 'Inventory' },
  { id: 'stock:write', name: 'Record Purchases (GRN)', category: 'Inventory' },
  { id: 'stock:adjust', name: 'Adjust Stock / Count', category: 'Inventory' },
  { id: 'stock:transfer', name: 'Store to Dispensary Transfers', category: 'Inventory' },
  { id: 'cost:view', name: 'View Cost & Purchase Prices', category: 'Financial' },
  { id: 'pos:access', name: 'Access Point of Sale / Dispensing', category: 'Sales' },
  { id: 'sales:discount', name: 'Authorize Discounts', category: 'Sales' },
  { id: 'sales:return', name: 'Approve Customer Returns', category: 'Sales' },
  { id: 'customers:credit', name: 'Manage Customer Credit Lines', category: 'Sales' },
  { id: 'reports:inventory', name: 'View Inventory & Expiry Reports', category: 'Reports' },
  { id: 'reports:sales', name: 'View Sales & Financial Reports', category: 'Reports' },
  { id: 'audit:view', name: 'View System Audit Logs', category: 'Compliance' },
];
