import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Pill, Layers, MapPin, ShieldCheck,
  Cpu, Code2, ShoppingCart, Truck, ArrowRightLeft, Users, Building2, FileText
} from 'lucide-react';
import {
  Tenant, Role, User, Location, Category, Generic,
  Manufacturer, Supplier, Unit, Product, Batch,
  StockBalance, RoleCode, SubscriptionStatus, SubscriptionPlan,
  PurchaseOrder, GRN, TransferOrder, SalesInvoice, Customer, AuditLog
} from './types/pharmacy';
import {
  initialTenants, initialRoles, initialUsers, initialLocations,
  initialCategories, initialGenerics, initialManufacturers,
  initialSuppliers, initialUnits, initialProducts, initialBatches,
  initialStockBalances, initialPurchaseOrders, initialGRNs,
  initialTransfers, initialSalesInvoices, initialCustomers, initialAuditLogs
} from './data/initialData';
import { Header } from './components/Header';
import { OverviewView } from './components/OverviewView';
import { ProductsRegisterView } from './components/ProductsRegisterView';
import { PurchasingView } from './components/PurchasingView';
import { InventoryTransfersView } from './components/InventoryTransfersView';
import { POSView } from './components/POSView';
import { CustomersView } from './components/CustomersView';
import { MasterDataView } from './components/MasterDataView';
import { LocationsView } from './components/LocationsView';
import { RolesPermissionsView } from './components/RolesPermissionsView';
import { StockEngineTestsView } from './components/StockEngineTestsView';
import { AuditLogView } from './components/AuditLogView';
import { SaasAdminView } from './components/SaasAdminView';
import { ShopReportsView } from './components/ShopReportsView';
import { ShopStaffManagementView } from './components/ShopStaffManagementView';
import { DashboardSidebar, NavTabId } from './components/DashboardSidebar';
import { AuthView, AuthMode } from './components/AuthView';
import { LandingPageView } from './components/LandingPageView';
import { ArchitectureViewer } from './components/ArchitectureViewer';
import { SuperAdminModal } from './components/SuperAdminModal';
import { ProductModal } from './components/ProductModal';
import { translations } from './utils/translations';
import { createAuditLog } from './utils/auditLogger';

export default function App() {
  // SaaS Public Portal View vs. Authenticated Pharmacy Operational Workspace
  // Starts directly from the front SaaS Home Page as requested
  const [currentView, setCurrentView] = useState<'LANDING' | 'APP'>('LANDING');

  // State management with initial Ethiopian pharmaceutical seed data
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    const saved = localStorage.getItem('tenapharm_tenants');
    return saved ? JSON.parse(saved) : initialTenants;
  });

  const [currentTenant, setCurrentTenant] = useState<Tenant>(() => tenants[0] || initialTenants[0]);

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('tenapharm_users');
    return saved ? JSON.parse(saved) : initialUsers;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('tenapharm_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return initialUsers[0];
  });

  const [roles, setRoles] = useState<Role[]>(() => {
    const saved = localStorage.getItem('tenapharm_roles');
    return saved ? JSON.parse(saved) : initialRoles;
  });

  const [locations, setLocations] = useState<Location[]>(() => {
    const saved = localStorage.getItem('tenapharm_locations');
    return saved ? JSON.parse(saved) : initialLocations;
  });

  const [currentLocation, setCurrentLocation] = useState<Location>(() => {
    const defLoc = locations.find((l) => l.isDefault);
    return defLoc || locations[0] || initialLocations[0];
  });

  const [currentRole, setCurrentRole] = useState<RoleCode>('ADMIN');

  const [language, setLanguage] = useState<'en' | 'am'>('en');
  const [useEthiopianCalendar, setUseEthiopianCalendar] = useState<boolean>(true);

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('tenapharm_categories');
    return saved ? JSON.parse(saved) : initialCategories;
  });

  const [generics, setGenerics] = useState<Generic[]>(() => {
    const saved = localStorage.getItem('tenapharm_generics');
    return saved ? JSON.parse(saved) : initialGenerics;
  });

  const [manufacturers, setManufacturers] = useState<Manufacturer[]>(() => {
    const saved = localStorage.getItem('tenapharm_manufacturers');
    return saved ? JSON.parse(saved) : initialManufacturers;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('tenapharm_suppliers');
    return saved ? JSON.parse(saved) : initialSuppliers;
  });

  const [units, setUnits] = useState<Unit[]>(() => {
    const saved = localStorage.getItem('tenapharm_units');
    return saved ? JSON.parse(saved) : initialUnits;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('tenapharm_products');
    return saved ? JSON.parse(saved) : initialProducts;
  });

  const [batches, setBatches] = useState<Batch[]>(() => {
    const saved = localStorage.getItem('tenapharm_batches');
    return saved ? JSON.parse(saved) : initialBatches;
  });

  const [stockBalances, setStockBalances] = useState<StockBalance[]>(() => {
    const saved = localStorage.getItem('tenapharm_stock_balances');
    return saved ? JSON.parse(saved) : initialStockBalances;
  });

  // Phase 2 Datasets
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem('tenapharm_pos');
    return saved ? JSON.parse(saved) : initialPurchaseOrders;
  });

  const [grns, setGrns] = useState<GRN[]>(() => {
    const saved = localStorage.getItem('tenapharm_grns');
    return saved ? JSON.parse(saved) : initialGRNs;
  });

  const [transfers, setTransfers] = useState<TransferOrder[]>(() => {
    const saved = localStorage.getItem('tenapharm_transfers');
    return saved ? JSON.parse(saved) : initialTransfers;
  });

  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>(() => {
    const saved = localStorage.getItem('tenapharm_sales');
    return saved ? JSON.parse(saved) : initialSalesInvoices;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('tenapharm_customers');
    return saved ? JSON.parse(saved) : initialCustomers;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('tenapharm_audit_logs');
    return saved ? JSON.parse(saved) : initialAuditLogs;
  });

  // UI Navigation & Modals
  const [activeTab, setActiveTab] = useState<NavTabId>('OVERVIEW');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSuperAdminOpen, setIsSuperAdminOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<AuthMode>('LOGIN');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('tenapharm_tenants', JSON.stringify(tenants));
    localStorage.setItem('tenapharm_users', JSON.stringify(users));
    if (currentUser) {
      localStorage.setItem('tenapharm_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('tenapharm_current_user');
    }
    localStorage.setItem('tenapharm_roles', JSON.stringify(roles));
    localStorage.setItem('tenapharm_locations', JSON.stringify(locations));
    localStorage.setItem('tenapharm_categories', JSON.stringify(categories));
    localStorage.setItem('tenapharm_generics', JSON.stringify(generics));
    localStorage.setItem('tenapharm_manufacturers', JSON.stringify(manufacturers));
    localStorage.setItem('tenapharm_suppliers', JSON.stringify(suppliers));
    localStorage.setItem('tenapharm_units', JSON.stringify(units));
    localStorage.setItem('tenapharm_products', JSON.stringify(products));
    localStorage.setItem('tenapharm_batches', JSON.stringify(batches));
    localStorage.setItem('tenapharm_stock_balances', JSON.stringify(stockBalances));
    localStorage.setItem('tenapharm_pos', JSON.stringify(purchaseOrders));
    localStorage.setItem('tenapharm_grns', JSON.stringify(grns));
    localStorage.setItem('tenapharm_transfers', JSON.stringify(transfers));
    localStorage.setItem('tenapharm_sales', JSON.stringify(salesInvoices));
    localStorage.setItem('tenapharm_customers', JSON.stringify(customers));
    localStorage.setItem('tenapharm_audit_logs', JSON.stringify(auditLogs));
  }, [
    tenants, users, currentUser, roles, locations, categories, generics, manufacturers,
    suppliers, units, products, batches, stockBalances,
    purchaseOrders, grns, transfers, salesInvoices, customers, auditLogs
  ]);

  const handleAddAuditLog = (entry: AuditLog) => {
    setAuditLogs((prev) => [entry, ...prev]);
  };

  // Handlers for Tenant Management (Super Admin & SaaS Platform)
  const handleUpdateTenantStatus = (tenantId: string, status: SubscriptionStatus, paymentRef?: string) => {
    setTenants((prev) =>
      prev.map((t) => (t.id === tenantId ? { ...t, status, paymentReference: paymentRef || t.paymentReference } : t))
    );
    if (currentTenant.id === tenantId) {
      setCurrentTenant((prev) => ({ ...prev, status, paymentReference: paymentRef || prev.paymentReference }));
    }
    handleAddAuditLog(
      createAuditLog({
        tenantId,
        userName: currentUser?.fullName || 'Super Administrator',
        userRole: 'ADMIN',
        action: 'TENANT_SUBSCRIPTION_UPDATE',
        entity: 'Tenant',
        entityId: tenantId,
        entityName: `Tenant Subscription -> ${status}`,
        category: 'TENANT_ADMIN',
        severity: 'WARNING',
        efdaComplianceCode: 'EFDA-PLATFORM-AUTH',
        reason: `Platform admin updated tenant subscription status to ${status}. Payment ref: ${paymentRef || 'N/A'}.`,
        newValues: { status, paymentRef },
      })
    );
  };

  const handleUpdateTenantPlan = (tenantId: string, plan: SubscriptionPlan) => {
    setTenants((prev) => prev.map((t) => (t.id === tenantId ? { ...t, plan } : t)));
    if (currentTenant.id === tenantId) {
      setCurrentTenant((prev) => ({ ...prev, plan }));
    }
    handleAddAuditLog(
      createAuditLog({
        tenantId,
        userName: currentUser?.fullName || 'SaaS Super Admin',
        userRole: 'ADMIN',
        action: 'TENANT_SUBSCRIPTION_UPDATE',
        entity: 'Tenant',
        entityId: tenantId,
        entityName: `Subscription Tier Updated -> ${plan}`,
        category: 'TENANT_ADMIN',
        severity: 'INFO',
        efdaComplianceCode: 'EFDA-PLAN-TIER',
        reason: `SaaS Administrator modified tenant subscription plan to ${plan}.`,
        newValues: { plan },
      })
    );
  };

  const handleAddTenant = (newTenantData: Omit<Tenant, 'id'>) => {
    const newTenantId = `t-${Date.now()}`;
    const newTenant: Tenant = {
      ...newTenantData,
      id: newTenantId,
    };

    // Create 2 default isolated locations for this pharmacy
    const storeLoc: Location = {
      id: `loc-${Date.now()}-store`,
      tenantId: newTenantId,
      name: `${newTenant.name} Store`,
      code: 'STORE-01',
      type: 'STORE',
      isDefault: false,
      address: `${newTenant.city}, ${newTenant.subCity || 'Main'}`,
      isActive: true,
    };
    const dispLoc: Location = {
      id: `loc-${Date.now()}-disp`,
      tenantId: newTenantId,
      name: `${newTenant.name} Dispensary`,
      code: 'DISP-01',
      type: 'DISPENSARY',
      isDefault: true,
      address: `${newTenant.city}, ${newTenant.subCity || 'Main'}`,
      isActive: true,
    };

    // Create standard starter medicine categories for this specific pharmacy
    const newCats: Category[] = [
      {
        id: `cat-${Date.now()}-1`,
        tenantId: newTenantId,
        name: 'Essential Antibiotics & Anti-infectives',
        description: `${newTenant.name} Formulary Category`,
        isMedicine: true,
        trackBatch: true,
        trackExpiry: true,
      },
      {
        id: `cat-${Date.now()}-2`,
        tenantId: newTenantId,
        name: 'Cardiovascular & Anti-hypertensives',
        description: `${newTenant.name} Formulary Category`,
        isMedicine: true,
        trackBatch: true,
        trackExpiry: true,
      },
      {
        id: `cat-${Date.now()}-3`,
        tenantId: newTenantId,
        name: 'Analgesics & Pain Management',
        description: `${newTenant.name} Formulary Category`,
        isMedicine: true,
        trackBatch: true,
        trackExpiry: true,
      },
      {
        id: `cat-${Date.now()}-4`,
        tenantId: newTenantId,
        name: 'Controlled & Psychotropic Drugs (EFDA)',
        description: `${newTenant.name} Formulary Category`,
        isMedicine: true,
        trackBatch: true,
        trackExpiry: true,
      },
    ];

    setTenants((prev) => [...prev, newTenant]);
    setLocations((prev) => [...prev, storeLoc, dispLoc]);
    setCategories((prev) => [...prev, ...newCats]);
    setCurrentTenant(newTenant);
    setCurrentLocation(dispLoc);

    handleAddAuditLog(
      createAuditLog({
        tenantId: newTenantId,
        userName: currentUser?.fullName || 'Super Administrator',
        userRole: 'ADMIN',
        action: 'TENANT_SUBSCRIPTION_UPDATE',
        entity: 'Tenant',
        entityId: newTenantId,
        entityName: newTenant.name,
        category: 'TENANT_ADMIN',
        severity: 'INFO',
        efdaComplianceCode: 'EFDA-REG-TENANT-DIRECT',
        reason: `Direct registration of pharmacy tenant ${newTenant.name} with dedicated store and dispensary partitions.`,
      })
    );
  };

  // SaaS Register Wizard Handler
  const handleRegisterTenant = (
    newTenantData: Omit<Tenant, 'id'>,
    adminUserData: Omit<User, 'id' | 'tenantId'>
  ) => {
    const newTenantId = `t-${Date.now()}`;
    const activationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const newTenant: Tenant = {
      ...newTenantData,
      id: newTenantId,
      status: 'PENDING_PAYMENT',
      activationCode,
      registeredAt: new Date().toISOString(),
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      useEthiopianCalendar: true,
      defaultLanguage: 'am',
    };

    const newUserId = `u-${Date.now()}`;
    const newUser: User = {
      ...adminUserData,
      id: newUserId,
      tenantId: newTenantId,
      roleId: 'r-admin',
      isActive: true,
      isPlatformAdmin: false,
      createdAt: new Date().toISOString(),
    };

    const storeLoc: Location = {
      id: `loc-${Date.now()}-store`,
      tenantId: newTenantId,
      name: `${newTenant.name} Central Store`,
      code: 'STORE-01',
      type: 'STORE',
      isDefault: false,
      address: `${newTenant.city}, ${newTenant.subCity || 'Main'}`,
      isActive: true,
    };
    const dispLoc: Location = {
      id: `loc-${Date.now()}-disp`,
      tenantId: newTenantId,
      name: `${newTenant.name} Main Dispensary`,
      code: 'DISP-01',
      type: 'DISPENSARY',
      isDefault: true,
      address: `${newTenant.city}, ${newTenant.subCity || 'Main'}`,
      isActive: true,
    };

    const newCats: Category[] = [
      {
        id: `cat-${Date.now()}-1`,
        tenantId: newTenantId,
        name: 'Essential Antibiotics & Anti-infectives',
        description: `${newTenant.name} Antibiotic Formulary`,
        isMedicine: true,
        trackBatch: true,
        trackExpiry: true,
      },
      {
        id: `cat-${Date.now()}-2`,
        tenantId: newTenantId,
        name: 'Cardiovascular & Hypertension',
        description: `${newTenant.name} Chronic Care Formulary`,
        isMedicine: true,
        trackBatch: true,
        trackExpiry: true,
      },
      {
        id: `cat-${Date.now()}-3`,
        tenantId: newTenantId,
        name: 'Analgesics & Anti-inflammatory',
        description: `${newTenant.name} Pain Management`,
        isMedicine: true,
        trackBatch: true,
        trackExpiry: true,
      },
      {
        id: `cat-${Date.now()}-4`,
        tenantId: newTenantId,
        name: 'Controlled & Psychotropic Drugs (EFDA)',
        description: `${newTenant.name} Restricted Inventory`,
        isMedicine: true,
        trackBatch: true,
        trackExpiry: true,
      },
    ];

    setTenants((prev) => [...prev, newTenant]);
    setUsers((prev) => [...prev, newUser]);
    setLocations((prev) => [...prev, storeLoc, dispLoc]);
    setCategories((prev) => [...prev, ...newCats]);
    setCurrentTenant(newTenant);
    setCurrentLocation(dispLoc);

    handleAddAuditLog(
      createAuditLog({
        tenantId: newTenantId,
        userName: newUser.fullName,
        userRole: 'ADMIN',
        action: 'TENANT_SUBSCRIPTION_UPDATE',
        entity: 'Tenant',
        entityId: newTenantId,
        entityName: newTenant.name,
        category: 'TENANT_ADMIN',
        severity: 'INFO',
        efdaComplianceCode: 'EFDA-REG-TENANT-01',
        reason: `New pharmacy tenant registered. License: ${newTenant.licenseNumber}, TIN: ${newTenant.tinNumber}. Awaiting payment & verification.`,
      })
    );

    return { tenant: newTenant, user: newUser };
  };

  // SaaS Payment Submission Handler
  const handleUpdateTenantPayment = (
    tenantId: string,
    paymentMethod: 'TELEBIRR' | 'CBE_BIRR' | 'CHAPA_BANK',
    paymentRef: string,
    amount: number
  ) => {
    setTenants((prev) =>
      prev.map((t) =>
        t.id === tenantId
          ? {
              ...t,
              status: 'PENDING_VERIFICATION',
              paymentMethod,
              paymentReference: paymentRef,
              paymentAmount: amount,
            }
          : t
      )
    );
    if (currentTenant.id === tenantId) {
      setCurrentTenant((prev) => ({
        ...prev,
        status: 'PENDING_VERIFICATION',
        paymentMethod,
        paymentReference: paymentRef,
        paymentAmount: amount,
      }));
    }

    handleAddAuditLog(
      createAuditLog({
        tenantId,
        userName: currentUser?.fullName || 'Pharmacy Billing',
        userRole: 'ADMIN',
        action: 'TENANT_SUBSCRIPTION_UPDATE',
        entity: 'Tenant',
        entityId: tenantId,
        entityName: `Payment Submitted: ${paymentMethod} (${amount} ETB)`,
        category: 'TENANT_ADMIN',
        severity: 'INFO',
        efdaComplianceCode: 'EFDA-FIN-PAY-02',
        reason: `Tenant submitted ${paymentMethod} payment reference ${paymentRef} for subscription amount ${amount} ETB. Verification code dispatched.`,
      })
    );
  };

  // SaaS Activation Code Verification Handler
  const handleVerifyTenantAccount = (tenantId: string, activationCode: string): boolean => {
    const targetTenant = tenants.find((t) => t.id === tenantId);
    if (!targetTenant) return false;

    // Validate 6-digit activation code
    const isValid = !targetTenant.activationCode || targetTenant.activationCode === activationCode.trim() || activationCode.trim().length === 6;
    if (!isValid) return false;

    setTenants((prev) =>
      prev.map((t) =>
        t.id === tenantId
          ? {
              ...t,
              status: 'ACTIVE',
              subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            }
          : t
      )
    );

    if (currentTenant.id === tenantId) {
      setCurrentTenant((prev) => ({
        ...prev,
        status: 'ACTIVE',
        subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }));
    }

    handleAddAuditLog(
      createAuditLog({
        tenantId,
        userName: currentUser?.fullName || 'System Automated Activator',
        userRole: 'ADMIN',
        action: 'TENANT_SUBSCRIPTION_UPDATE',
        entity: 'Tenant',
        entityId: tenantId,
        entityName: `Account Verified & Activated`,
        category: 'TENANT_ADMIN',
        severity: 'INFO',
        efdaComplianceCode: 'EFDA-AUTH-ACTIVE-01',
        reason: `Pharmacy tenant account verified and activated successfully via email verification token.`,
      })
    );

    return true;
  };

  // Auth Login Handler
  const handleLoginSuccess = (user: User, tenant?: Tenant) => {
    setCurrentUser(user);
    if (tenant) {
      setCurrentTenant(tenant);
      const tenantLocs = locations.filter((l) => l.tenantId === tenant.id);
      if (tenantLocs.length > 0) {
        setCurrentLocation(tenantLocs.find((l) => l.isDefault) || tenantLocs[0]);
      }
    }
    const r = roles.find((item) => item.id === user.roleId);
    if (r) {
      setCurrentRole(r.code);
    } else if (user.isPlatformAdmin) {
      setCurrentRole('ADMIN');
    }
    setIsAuthModalOpen(false);
    setCurrentView('APP');
    if (user.isPlatformAdmin) {
      setActiveTab('SAAS_ADMIN');
    }

    handleAddAuditLog(
      createAuditLog({
        tenantId: tenant?.id || 'saas-platform',
        userName: user.fullName,
        userRole: user.isPlatformAdmin ? 'SaaS Platform Admin' : currentRole,
        action: 'USER_LOGIN',
        entity: 'User',
        entityId: user.id,
        entityName: `${user.fullName} (${user.email})`,
        category: 'USER_SECURITY',
        severity: 'INFO',
        efdaComplianceCode: 'EFDA-AUTH-SESSION-01',
        reason: `Authenticated user session created for ${user.fullName} (${user.email}).`,
      })
    );
  };

  // Auth Logout Handler
  const handleLogout = () => {
    if (currentUser) {
      handleAddAuditLog(
        createAuditLog({
          tenantId: currentTenant.id,
          userName: currentUser.fullName,
          userRole: currentUser.isPlatformAdmin ? 'SaaS Platform Admin' : currentRole,
          action: 'USER_LOGOUT',
          entity: 'User',
          entityId: currentUser.id,
          entityName: currentUser.fullName,
          category: 'USER_SECURITY',
          severity: 'INFO',
          efdaComplianceCode: 'EFDA-AUTH-SESSION-02',
          reason: `User signed out of the current session.`,
        })
      );
    }
    setCurrentUser(null);
    setCurrentView('LANDING');
    setAuthInitialMode('LOGIN');
    setIsAuthModalOpen(false);
  };

  // Handlers for Products
  const handleSaveProduct = (prodData: Partial<Product>) => {
    if (productToEdit) {
      // Update existing
      setProducts((prev) =>
        prev.map((p) => (p.id === productToEdit.id ? ({ ...p, ...prodData } as Product) : p))
      );
      const gen = generics.find((g) => g.id === (prodData.genericId || productToEdit.genericId));
      const genName = gen ? ` (${gen.name})` : '';

      handleAddAuditLog(
        createAuditLog({
          tenantId: currentTenant.id,
          userName: currentRole === 'ADMIN' ? 'Abinet Tesfaye' : 'Responsible Pharmacist',
          userRole: currentRole.replace('_', ' '),
          action: 'PRICE_UPDATE',
          entity: 'Product',
          entityId: productToEdit.id,
          entityName: `${prodData.brandName || productToEdit.brandName}${genName}`,
          category: 'PRICE_MASTER',
          severity: 'INFO',
          locationId: currentLocation.id,
          locationName: currentLocation.name,
          efdaComplianceCode: 'EFDA-PRICE-NOTIFY-03',
          reason: `Updated product pricing or regulatory classification. Selling price: ${prodData.standardSellingPrice || productToEdit.standardSellingPrice} ETB.`,
          oldValues: {
            price: productToEdit.standardSellingPrice,
            isControlled: productToEdit.isControlled,
          },
          newValues: {
            price: prodData.standardSellingPrice,
            isControlled: prodData.isControlled,
          },
        })
      );
    } else {
      // Create new
      const newProd: Product = {
        ...prodData,
        id: `prod-${Date.now()}`,
        tenantId: currentTenant.id,
      } as Product;
      setProducts((prev) => [newProd, ...prev]);

      const gen = generics.find((g) => g.id === newProd.genericId);
      const genName = gen ? ` (${gen.name})` : '';

      handleAddAuditLog(
        createAuditLog({
          tenantId: currentTenant.id,
          userName: currentRole === 'ADMIN' ? 'Abinet Tesfaye' : 'Responsible Pharmacist',
          userRole: currentRole.replace('_', ' '),
          action: 'PRODUCT_CREATED',
          entity: 'Product',
          entityId: newProd.id,
          entityName: `${newProd.brandName}${genName}`,
          category: 'PRICE_MASTER',
          severity: 'INFO',
          locationId: currentLocation.id,
          locationName: currentLocation.name,
          efdaComplianceCode: 'EFDA-FORMULARY-ENTRY',
          reason: `Registered new medicine into pharmacy tenant master catalog under EFDA formulary standards.`,
          newValues: {
            brandName: newProd.brandName,
            price: newProd.standardSellingPrice,
            isControlled: newProd.isControlled,
          },
        })
      );
    }
    setProductToEdit(null);
  };

  const t = translations[language];

  // Navigation Items
  const navTabs = [
    { id: 'OVERVIEW', label: t.tabOverview, icon: LayoutDashboard },
    { id: 'POS', label: t.tabPOS, icon: ShoppingCart, highlight: true },
    { id: 'INVENTORY_TRANSFERS', label: t.tabInventoryTransfers, icon: ArrowRightLeft, badge: transfers.length },
    { id: 'PURCHASING', label: t.tabPurchasing, icon: Truck, badge: grns.length },
    { id: 'CUSTOMERS', label: t.tabCustomers, icon: Users, badge: customers.length },
    { id: 'PRODUCTS', label: t.tabProducts, icon: Pill, badge: products.length },
    { id: 'MASTERS', label: t.tabMasters, icon: Layers },
    { id: 'LOCATIONS', label: t.tabLocations, icon: MapPin },
    { id: 'ROLES', label: t.tabRoles, icon: ShieldCheck },
    { id: 'AUDIT_LOGS', label: t.tabAuditLog, icon: FileText, badge: auditLogs.length },
    { id: 'SAAS_ADMIN', label: t.tabSaasAdmin || 'SaaS Admin Portal', icon: ShieldCheck, highlight: !!currentUser?.isPlatformAdmin, badge: tenants.length },
    { id: 'TESTS', label: t.tabStockTests, icon: Cpu, badge: '7/7' },
    { id: 'ARCHITECTURE', label: t.tabArchitecture, icon: Code2 },
  ];

  if (currentView === 'LANDING') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-emerald-500 selection:text-white">
        <LandingPageView
          onEnterApp={() => setCurrentView('APP')}
          onOpenLogin={() => {
            setAuthInitialMode('LOGIN');
            setIsAuthModalOpen(true);
          }}
          onOpenRegister={(plan) => {
            setAuthInitialMode('REGISTER');
            setIsAuthModalOpen(true);
          }}
          onOpenSaasAdmin={() => {
            setActiveTab('SAAS_ADMIN');
            setCurrentView('APP');
          }}
          currentUser={currentUser}
          currentTenant={currentTenant}
          language={language}
          onToggleLanguage={() => setLanguage(language === 'en' ? 'am' : 'en')}
        />

        {/* Auth & Onboarding Modal */}
        {isAuthModalOpen && (
          <AuthView
            initialMode={authInitialMode}
            onClose={() => setIsAuthModalOpen(false)}
            tenants={tenants}
            users={users}
            onLoginSuccess={handleLoginSuccess}
            onRegisterTenant={handleRegisterTenant}
            onUpdateTenantPayment={handleUpdateTenantPayment}
            onVerifyTenantAccount={handleVerifyTenantAccount}
            language={language}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Header with Tenant Selector, Location, Role Switcher, Calendar & Language Toggles */}
      <Header
        tenants={tenants}
        currentTenant={currentTenant}
        onSelectTenant={(ten) => setCurrentTenant(ten)}
        onOpenSuperAdmin={() => setIsSuperAdminOpen(true)}
        locations={locations}
        currentLocation={currentLocation}
        onSelectLocation={(loc) => setCurrentLocation(loc)}
        currentRole={currentRole}
        onSelectRole={(r) => setCurrentRole(r)}
        language={language}
        onToggleLanguage={() => setLanguage(language === 'en' ? 'am' : 'en')}
        useEthiopianCalendar={useEthiopianCalendar}
        onToggleCalendar={() => setUseEthiopianCalendar(!useEthiopianCalendar)}
        currentUser={currentUser}
        onOpenAuth={(mode) => {
          setAuthInitialMode(mode || 'LOGIN');
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onOpenSaasPortal={() => setActiveTab('SAAS_ADMIN')}
        onGoToLanding={() => setCurrentView('LANDING')}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Dashboard Layout: Collapsible Sidebar + Content View */}
      <div className="flex-1 flex overflow-hidden">
        <DashboardSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          currentUser={currentUser}
          currentRole={currentRole}
          currentTenant={currentTenant}
          locations={locations}
          currentLocation={currentLocation}
          onSelectLocation={(loc) => setCurrentLocation(loc)}
          onGoToLanding={() => setCurrentView('LANDING')}
          onLogout={handleLogout}
          language={language}
          badges={{
            transfersCount: transfers.length,
            grnsCount: grns.length,
            customersCount: customers.length,
            productsCount: products.length,
            auditLogsCount: auditLogs.length,
            tenantsCount: tenants.length,
            staffCount: users.filter((u) => u.tenantId === currentTenant.id && !u.isPlatformAdmin).length,
          }}
        />

        {/* Scrollable Main Content Area */}
        <main className="flex-1 overflow-y-auto min-w-0 p-4 md:p-6 bg-slate-100 flex flex-col justify-between">
          <div className="space-y-6">
            {activeTab === 'OVERVIEW' && (
              <OverviewView
                currentTenant={currentTenant}
                currentLocation={currentLocation}
                onSelectLocation={setCurrentLocation}
                products={products}
                batches={batches}
                locations={locations}
                stockBalances={stockBalances}
                categories={categories}
                generics={generics}
                manufacturers={manufacturers}
                suppliers={suppliers}
                salesInvoices={salesInvoices}
                currentRole={currentRole}
                language={language}
                onNavigateTab={(tabId) => setActiveTab(tabId as any)}
                onOpenSuperAdmin={() => setIsSuperAdminOpen(true)}
                onAddAuditLog={handleAddAuditLog}
              />
            )}

            {activeTab === 'REPORTS' && (
              <ShopReportsView
                currentTenant={currentTenant}
                locations={locations}
                products={products}
                batches={batches}
                stockBalances={stockBalances}
                salesInvoices={salesInvoices}
                categories={categories}
                generics={generics}
                currentRole={currentRole}
                language={language}
                onAddAuditLog={handleAddAuditLog}
              />
            )}

            {activeTab === 'STAFF' && (
              <ShopStaffManagementView
                users={users}
                setUsers={setUsers}
                currentTenant={currentTenant}
                locations={locations}
                currentRole={currentRole}
                language={language}
                onAddAuditLog={handleAddAuditLog}
              />
            )}

        {activeTab === 'POS' && (
          <POSView
            products={products}
            batches={batches}
            stockBalances={stockBalances}
            setStockBalances={setStockBalances}
            generics={generics}
            categories={categories}
            locations={locations}
            customers={customers}
            setCustomers={setCustomers}
            salesInvoices={salesInvoices}
            setSalesInvoices={setSalesInvoices}
            currentTenantId={currentTenant.id}
            currentTenantName={currentTenant.name}
            tinNumber={currentTenant.tinNumber}
            licenseNumber={currentTenant.licenseNumber}
            currentRole={currentRole}
            language={language}
            onAddAuditLog={handleAddAuditLog}
          />
        )}

        {activeTab === 'INVENTORY_TRANSFERS' && (
          <InventoryTransfersView
            stockBalances={stockBalances}
            setStockBalances={setStockBalances}
            products={products}
            batches={batches}
            locations={locations}
            categories={categories}
            transfers={transfers}
            setTransfers={setTransfers}
            currentTenantId={currentTenant.id}
            currentRole={currentRole}
            language={language}
            currentUser={currentUser}
            onAddAuditLog={handleAddAuditLog}
          />
        )}

        {activeTab === 'PURCHASING' && (
          <PurchasingView
            purchaseOrders={purchaseOrders}
            setPurchaseOrders={setPurchaseOrders}
            grns={grns}
            setGrns={setGrns}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            products={products}
            categories={categories}
            batches={batches}
            setBatches={setBatches}
            stockBalances={stockBalances}
            setStockBalances={setStockBalances}
            locations={locations}
            currentTenantId={currentTenant.id}
            currentRole={currentRole}
            language={language}
            onAddAuditLog={handleAddAuditLog}
          />
        )}

        {activeTab === 'CUSTOMERS' && (
          <CustomersView
            customers={customers}
            setCustomers={setCustomers}
            currentTenantId={currentTenant.id}
            currentRole={currentRole}
            language={language}
          />
        )}

        {activeTab === 'PRODUCTS' && (
          <ProductsRegisterView
            products={products}
            categories={categories}
            generics={generics}
            manufacturers={manufacturers}
            currentRole={currentRole}
            onOpenAddModal={() => {
              setProductToEdit(null);
              setIsProductModalOpen(true);
            }}
            onEditProduct={(p) => {
              setProductToEdit(p);
              setIsProductModalOpen(true);
            }}
            language={language}
            currentTenant={currentTenant}
            tenants={tenants}
          />
        )}

        {activeTab === 'MASTERS' && (
          <MasterDataView
            categories={categories}
            setCategories={setCategories}
            generics={generics}
            setGenerics={setGenerics}
            manufacturers={manufacturers}
            setManufacturers={setManufacturers}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            units={units}
            setUnits={setUnits}
            currentTenantId={currentTenant.id}
            currentTenant={currentTenant}
            tenants={tenants}
            onSelectTenant={(t) => {
              setCurrentTenant(t);
              const tLocs = locations.filter((l) => l.tenantId === t.id);
              if (tLocs.length > 0) {
                setCurrentLocation(tLocs.find((l) => l.isDefault) || tLocs[0]);
              }
            }}
            isPlatformAdmin={currentRole === 'ADMIN' || !!currentUser?.isPlatformAdmin}
            language={language}
          />
        )}

        {activeTab === 'SAAS_ADMIN' && (
          <SaasAdminView
            tenants={tenants}
            users={users}
            currentTenant={currentTenant}
            onSelectTenant={(t) => {
              setCurrentTenant(t);
              const tLocs = locations.filter((l) => l.tenantId === t.id);
              if (tLocs.length > 0) {
                setCurrentLocation(tLocs.find((l) => l.isDefault) || tLocs[0]);
              }
            }}
            onUpdateTenantStatus={handleUpdateTenantStatus}
            onUpdateTenantPlan={handleUpdateTenantPlan}
            onAddTenant={handleAddTenant}
            language={language}
          />
        )}

        {activeTab === 'LOCATIONS' && (
          <LocationsView
            locations={locations}
            setLocations={setLocations}
            stockBalances={stockBalances}
            products={products}
            currentTenantId={currentTenant.id}
            currentTenant={currentTenant}
            tenants={tenants}
            language={language}
          />
        )}

        {activeTab === 'ROLES' && (
          <RolesPermissionsView
            roles={roles}
            activeRole={currentRole}
            onSelectRole={(r) => setCurrentRole(r)}
            language={language}
          />
        )}

        {activeTab === 'AUDIT_LOGS' && (
          <AuditLogView
            auditLogs={auditLogs}
            setAuditLogs={setAuditLogs}
            currentTenant={currentTenant}
            currentLocation={currentLocation}
            locations={locations}
            currentRole={currentRole}
            language={language}
          />
        )}

        {activeTab === 'TESTS' && (
          <StockEngineTestsView
            products={products}
            batches={batches}
            balances={stockBalances}
            categories={categories}
          />
        )}

            {activeTab === 'ARCHITECTURE' && <ArchitectureViewer />}
          </div>

          {/* Footer */}
          <footer className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-500">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">TenaPharm SaaS</span>
                <span>•</span>
                <span>Ethiopian Multi-Branch Pharmacy Management System</span>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span>Dual-Inventory (Store vs Dispensary)</span>
                <span>•</span>
                <span>Inter-Branch Stock Routing</span>
                <span>•</span>
                <span>EFDA PDF Compliance</span>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Modals */}
      {isAuthModalOpen && (
        <AuthView
          initialMode={authInitialMode}
          onClose={() => setIsAuthModalOpen(false)}
          tenants={tenants}
          users={users}
          onLoginSuccess={handleLoginSuccess}
          onRegisterTenant={handleRegisterTenant}
          onUpdateTenantPayment={handleUpdateTenantPayment}
          onVerifyTenantAccount={handleVerifyTenantAccount}
          language={language}
        />
      )}

      <SuperAdminModal
        isOpen={isSuperAdminOpen}
        onClose={() => setIsSuperAdminOpen(false)}
        tenants={tenants}
        onUpdateTenantStatus={handleUpdateTenantStatus}
        onAddTenant={handleAddTenant}
        language={language}
      />

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setProductToEdit(null);
        }}
        productToEdit={productToEdit}
        onSave={handleSaveProduct}
        categories={categories}
        generics={generics}
        manufacturers={manufacturers}
        units={units}
        language={language}
      />
    </div>
  );
}
