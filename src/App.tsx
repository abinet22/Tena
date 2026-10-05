import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Pill, Layers, MapPin, ShieldCheck,
  Cpu, Code2, ShoppingCart, Truck, ArrowRightLeft, Users, Building2, FileText
} from 'lucide-react';
import {
  Tenant, Role, User, Location, Category, Generic,
  Manufacturer, Supplier, Unit, Product, Batch,
  StockBalance, RoleCode, SubscriptionStatus,
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
import { ArchitectureViewer } from './components/ArchitectureViewer';
import { SuperAdminModal } from './components/SuperAdminModal';
import { ProductModal } from './components/ProductModal';
import { translations } from './utils/translations';
import { createAuditLog } from './utils/auditLogger';

export default function App() {
  // State management with initial Ethiopian pharmaceutical seed data
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    const saved = localStorage.getItem('tenapharm_tenants');
    return saved ? JSON.parse(saved) : initialTenants;
  });

  const [currentTenant, setCurrentTenant] = useState<Tenant>(() => tenants[0] || initialTenants[0]);

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
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'POS' | 'INVENTORY_TRANSFERS' | 'PURCHASING' | 'CUSTOMERS' | 'PRODUCTS' | 'MASTERS' | 'LOCATIONS' | 'ROLES' | 'AUDIT_LOGS' | 'TESTS' | 'ARCHITECTURE'
  >('OVERVIEW');
  const [isSuperAdminOpen, setIsSuperAdminOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('tenapharm_tenants', JSON.stringify(tenants));
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
    tenants, roles, locations, categories, generics, manufacturers,
    suppliers, units, products, batches, stockBalances,
    purchaseOrders, grns, transfers, salesInvoices, customers, auditLogs
  ]);

  const handleAddAuditLog = (entry: AuditLog) => {
    setAuditLogs((prev) => [entry, ...prev]);
  };

  // Handlers for Tenant Management (Super Admin)
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
        userName: 'Super Administrator',
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

  const handleAddTenant = (newTenantData: Omit<Tenant, 'id'>) => {
    const newTenant: Tenant = {
      ...newTenantData,
      id: `t-${Date.now()}`,
    };
    setTenants((prev) => [...prev, newTenant]);
    setCurrentTenant(newTenant);
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
    { id: 'TESTS', label: t.tabStockTests, icon: Cpu, badge: '7/7' },
    { id: 'ARCHITECTURE', label: t.tabArchitecture, icon: Code2 },
  ];

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
      />

      {/* Main Navigation Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center space-x-1 overflow-x-auto py-2 text-xs font-semibold scrollbar-none">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : tab.highlight
                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.highlight ? 'text-emerald-600' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-emerald-700 text-emerald-100'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
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
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">TenaPharm SaaS</span>
            <span>•</span>
            <span>Ethiopian Pharmacy Management System</span>
            <span>•</span>
            <span className="font-mono text-emerald-700 font-semibold">Phases 1 & 2 Completed</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Store &rarr; Dispensary Transfers</span>
            <span>•</span>
            <span>FEFO Auto-Allocation POS</span>
            <span>•</span>
            <span>Telebirr & CBE Payment Integration</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
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
