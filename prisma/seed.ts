import { PrismaClient, SubscriptionPlan, SubscriptionStatus, LocationType, RoleType, ProductType, StorageCondition } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding TenaPharm Ethiopian Pharmacy Management System...');

  // 1. Create Default Tenant
  const tenantAbyssinia = await prisma.tenant.upsert({
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
      woreda: '03',
      phone: '+251 911 234 567',
      email: 'admin@abyssiniapharmacy.et',
      plan: SubscriptionPlan.ENTERPRISE,
      status: SubscriptionStatus.ACTIVE,
      paymentReference: 'CBE-TXN-20241002-88392',
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      useEthiopianCalendar: true,
      defaultLanguage: 'am',
    },
  });

  const tenantId = tenantAbyssinia.id;

  // 2. Create Roles for Tenant
  const adminRole = await prisma.role.create({
    data: {
      tenantId,
      name: 'Pharmacy Administrator',
      code: RoleType.ADMIN,
      description: 'Full administrative access to settings, users, audit logs, and all reports.',
      isSystem: true,
      permissions: [
        'tenants:manage',
        'users:read', 'users:write', 'users:delete',
        'roles:manage',
        'locations:read', 'locations:write',
        'products:read', 'products:write', 'products:delete',
        'master_data:manage',
        'stock:read', 'stock:write', 'stock:adjust', 'stock:transfer',
        'purchases:read', 'purchases:write', 'purchases:approve',
        'sales:read', 'sales:write', 'sales:discount', 'sales:return',
        'pos:access', 'cost:view',
        'reports:all',
        'audit:view',
      ],
    },
  });

  const invManagerRole = await prisma.role.create({
    data: {
      tenantId,
      name: 'Inventory Manager',
      code: RoleType.INVENTORY_MANAGER,
      description: 'Drug register, GRN receipts, stock transfers, adjustments, write-offs, and inventory reports.',
      isSystem: true,
      permissions: [
        'locations:read',
        'products:read', 'products:write',
        'master_data:manage',
        'stock:read', 'stock:write', 'stock:adjust', 'stock:transfer',
        'purchases:read', 'purchases:write',
        'cost:view',
        'reports:inventory',
      ],
    },
  });

  const salesManagerRole = await prisma.role.create({
    data: {
      tenantId,
      name: 'Sales Manager',
      code: RoleType.SALES_MANAGER,
      description: 'Sales oversight, discounts, return approvals, credit customer accounts, and sales reports.',
      isSystem: true,
      permissions: [
        'products:read',
        'stock:read',
        'sales:read', 'sales:write', 'sales:discount', 'sales:return',
        'customers:credit',
        'pos:access', 'cost:view',
        'reports:sales',
      ],
    },
  });

  const cashierRole = await prisma.role.create({
    data: {
      tenantId,
      name: 'Cashier / Dispensing Pharmacist',
      code: RoleType.CASHIER_PHARMACIST,
      description: 'Point of sale dispensing, prescription validation, customer billing. Strictly hides cost prices.',
      isSystem: true,
      permissions: [
        'products:read',
        'stock:read',
        'sales:write',
        'pos:access',
        // Note: 'cost:view' is NOT granted to Cashiers
      ],
    },
  });

  // 3. Create Users
  await prisma.user.createMany({
    data: [
      {
        tenantId,
        roleId: adminRole.id,
        fullName: 'Dr. Dawit Haile (Lead Pharmacist)',
        email: 'dawit@abyssiniapharmacy.et',
        phone: '+251 911 112 233',
        passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', // hashed 'Admin123!'
        isActive: true,
      },
      {
        tenantId,
        roleId: invManagerRole.id,
        fullName: 'Rahel Tadesse',
        email: 'rahel@abyssiniapharmacy.et',
        phone: '+251 912 334 455',
        passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        isActive: true,
      },
      {
        tenantId,
        roleId: salesManagerRole.id,
        fullName: 'Yared Bekele',
        email: 'yared@abyssiniapharmacy.et',
        phone: '+251 913 556 677',
        passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        isActive: true,
      },
      {
        tenantId,
        roleId: cashierRole.id,
        fullName: 'Hiwot Girma',
        email: 'hiwot@abyssiniapharmacy.et',
        phone: '+251 914 778 899',
        passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        isActive: true,
      },
    ],
  });

  // 4. Create Locations (Store & Dispensary)
  const mainStore = await prisma.location.create({
    data: {
      tenantId,
      name: 'Main Quarantine & Central Store',
      code: 'STORE-01',
      type: LocationType.STORE,
      isDefault: false,
      address: 'Basement Warehouse, Bole Medhanialem Building',
      phone: '+251 911 234 568',
      isActive: true,
    },
  });

  const mainDispensary = await prisma.location.create({
    data: {
      tenantId,
      name: 'Front Dispensary Counter',
      code: 'DISP-01',
      type: LocationType.DISPENSARY,
      isDefault: true,
      address: 'Ground Floor Retail Counter, Bole Medhanialem Building',
      phone: '+251 911 234 569',
      isActive: true,
    },
  });

  // 5. Master Categories with Flags
  const catAntibiotics = await prisma.category.create({
    data: {
      tenantId,
      name: 'Antibiotics & Antimicrobials',
      description: 'Systemic antibacterial agents subject to strict dispensing guidelines.',
      isMedicine: true,
      trackBatch: true,
      trackExpiry: true,
    },
  });

  const catAnalgesics = await prisma.category.create({
    data: {
      tenantId,
      name: 'Analgesics & Antipyretics',
      description: 'Pain relief and fever reduction drugs.',
      isMedicine: true,
      trackBatch: true,
      trackExpiry: true,
    },
  });

  const catControlled = await prisma.category.create({
    data: {
      tenantId,
      name: 'Narcotics & Controlled Drugs',
      description: 'EFDA regulated controlled psychotropic drugs.',
      isMedicine: true,
      trackBatch: true,
      trackExpiry: true,
    },
  });

  const catBabyMilk = await prisma.category.create({
    data: {
      tenantId,
      name: 'Infant Milk Formula & Baby Food',
      description: 'Non-medicine nutritional goods requiring strict batch and expiry tracking.',
      isMedicine: false,
      trackBatch: true,
      trackExpiry: true,
    },
  });

  const catDiapers = await prisma.category.create({
    data: {
      tenantId,
      name: 'Baby Diapers & Hygiene Products',
      description: 'Hygiene and disposable supplies without batch or expiration mandates.',
      isMedicine: false,
      trackBatch: false,
      trackExpiry: false,
    },
  });

  const catCosmetics = await prisma.category.create({
    data: {
      tenantId,
      name: 'Dermatological Skincare & Cosmetics',
      description: 'Dermocosmetics requiring batch and expiration dates.',
      isMedicine: false,
      trackBatch: true,
      trackExpiry: true,
    },
  });

  // 6. Master Generics
  const genAmoxicillin = await prisma.generic.create({
    data: {
      tenantId,
      name: 'Amoxicillin Trihydrate',
      therapeuticClass: 'Beta-lactam Antibiotic',
      pregnancyCategory: 'B',
      description: 'Broad spectrum penicillin antibiotic.',
    },
  });

  const genParacetamol = await prisma.generic.create({
    data: {
      tenantId,
      name: 'Paracetamol (Acetaminophen)',
      therapeuticClass: 'Non-opioid Analgesic / Antipyretic',
      pregnancyCategory: 'B',
      description: 'First line treatment for mild to moderate pain and fever.',
    },
  });

  const genTramadol = await prisma.generic.create({
    data: {
      tenantId,
      name: 'Tramadol Hydrochloride',
      therapeuticClass: 'Opioid Analgesic (Schedule IV)',
      pregnancyCategory: 'C',
      description: 'Centrally acting analgesic for moderate to severe pain. Controlled substance in Ethiopia.',
    },
  });

  // 7. Manufacturers
  const mfrEpharm = await prisma.manufacturer.create({
    data: {
      tenantId,
      name: 'Ethiopian Pharmaceuticals Manufacturing Sh.Co. (EPHARM)',
      country: 'Ethiopia',
      address: 'Addis Ababa, Kolfe Keranio',
      contact: '+251 112 752 400',
    },
  });

  const mfrCadila = await prisma.manufacturer.create({
    data: {
      tenantId,
      name: 'Cadila Pharmaceuticals (Ethiopia) PLC',
      country: 'Ethiopia',
      address: 'Gelan, Oromia Special Zone',
      contact: '+251 114 340 001',
    },
  });

  const mfrDanone = await prisma.manufacturer.create({
    data: {
      tenantId,
      name: 'Danone Nutricia Early Life Nutrition',
      country: 'Netherlands',
      address: 'Amsterdam, Netherlands',
      contact: '+31 20 456 7890',
    },
  });

  // 8. Units
  await prisma.unit.createMany({
    data: [
      { tenantId, name: 'Box', abbreviation: 'bx', isBase: false },
      { tenantId, name: 'Strip', abbreviation: 'str', isBase: false },
      { tenantId, name: 'Tablet', abbreviation: 'tab', isBase: true },
      { tenantId, name: 'Bottle', abbreviation: 'btl', isBase: true },
      { tenantId, name: 'Piece', abbreviation: 'pcs', isBase: true },
      { tenantId, name: 'Can', abbreviation: 'can', isBase: true },
    ],
  });

  // 9. Suppliers
  const supplierEPSS = await prisma.supplier.create({
    data: {
      tenantId,
      name: 'Ethiopian Pharmaceuticals Supply Service (EPSS)',
      tinNumber: '0001928374',
      contactPerson: 'Ato Solomon Kebede',
      phone: '+251 112 763 266',
      email: 'orders@epss.gov.et',
      address: 'In front of St. Paul Hospital, Addis Ababa',
    },
  });

  // 10. Sample Products (Medicines & General)
  const prodAmoxil = await prisma.product.create({
    data: {
      tenantId,
      productType: ProductType.MEDICINE,
      categoryId: catAntibiotics.id,
      brandName: 'Amoxil 500mg Capsule',
      genericId: genAmoxicillin.id,
      dosageForm: 'Capsule',
      strength: '500mg',
      packSize: '10 x 10 Capsules (100 per box)',
      manufacturerId: mfrCadila.id,
      countryOfOrigin: 'Ethiopia',
      storageCondition: StorageCondition.ROOM_TEMPERATURE,
      isControlled: false,
      prescriptionRequired: true,
      isVatExempt: true,
      barcode: '8901234567890',
      baseUnit: 'Capsule',
      secondaryUnit: 'Strip',
      secondaryRatio: 10, // 10 capsules per strip
      tertiaryUnit: 'Box',
      tertiaryRatio: 100, // 100 capsules per box
      reorderLevel: 100,
      reorderQuantity: 500,
    },
  });

  const prodTramal = await prisma.product.create({
    data: {
      tenantId,
      productType: ProductType.MEDICINE,
      categoryId: catControlled.id,
      brandName: 'Tramal 50mg Capsule (Controlled)',
      genericId: genTramadol.id,
      dosageForm: 'Capsule',
      strength: '50mg',
      packSize: '30 Capsules',
      manufacturerId: mfrEpharm.id,
      countryOfOrigin: 'Ethiopia',
      storageCondition: StorageCondition.ROOM_TEMPERATURE,
      isControlled: true,
      prescriptionRequired: true,
      isVatExempt: true,
      barcode: '8909876543210',
      baseUnit: 'Capsule',
      secondaryUnit: 'Strip',
      secondaryRatio: 10,
      tertiaryUnit: 'Box',
      tertiaryRatio: 30,
      reorderLevel: 30,
      reorderQuantity: 120,
    },
  });

  const prodBebelac = await prisma.product.create({
    data: {
      tenantId,
      productType: ProductType.GENERAL,
      categoryId: catBabyMilk.id,
      brandName: 'Bebelac 1 Infant Formula (0-6 months)',
      variantSize: '400g Tin Can',
      manufacturerId: mfrDanone.id,
      countryOfOrigin: 'Netherlands',
      storageCondition: StorageCondition.ROOM_TEMPERATURE,
      isControlled: false,
      prescriptionRequired: false,
      isVatExempt: false,
      barcode: '8712400123456',
      baseUnit: 'Can',
      standardSellingPrice: 1250.00,
      reorderLevel: 20,
      reorderQuantity: 60,
    },
  });

  const prodDiapers = await prisma.product.create({
    data: {
      tenantId,
      productType: ProductType.GENERAL,
      categoryId: catDiapers.id,
      brandName: 'Pampers Baby-Dry Pants Maxi',
      variantSize: 'Size 4 (52 Diapers)',
      countryOfOrigin: 'Turkey',
      storageCondition: StorageCondition.ROOM_TEMPERATURE,
      isControlled: false,
      prescriptionRequired: false,
      isVatExempt: false,
      barcode: '4015400234567',
      baseUnit: 'Pack',
      standardSellingPrice: 1650.00,
      reorderLevel: 15,
      reorderQuantity: 45,
    },
  });

  console.log('Seed completed successfully for tenant:', tenantAbyssinia.name);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
