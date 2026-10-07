import React, { useState } from 'react';
import {
  FileText, Plus, Truck, Warehouse, CheckCircle2,
  Calendar, ShieldAlert, AlertCircle, DollarSign, Clock, Search,
  ArrowRight, CreditCard, ChevronDown, ChevronUp, History, Smartphone,
  QrCode, Building2, ExternalLink, Printer
} from 'lucide-react';
import {
  PurchaseOrder, GRN, GRNItem, Supplier, Product, Batch,
  StockBalance, StockMovement, Location, Category, RoleCode, AuditLog,
  SupplierInvoice, SupplierPayment, SupplierInvoiceStatus
} from '../types/pharmacy';
import { validateBatchRequirements, sanitizePriceForRole } from '../utils/stockEngine';
import { formatDualDate } from '../utils/ethiopianCalendar';
import { createAuditLog } from '../utils/auditLogger';

interface PurchasingViewProps {
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  grns: GRN[];
  setGrns: React.Dispatch<React.SetStateAction<GRN[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  products: Product[];
  categories: Category[];
  batches: Batch[];
  setBatches: React.Dispatch<React.SetStateAction<Batch[]>>;
  stockBalances: StockBalance[];
  setStockBalances: React.Dispatch<React.SetStateAction<StockBalance[]>>;
  locations: Location[];
  currentTenantId: string;
  currentRole: RoleCode;
  language: 'en' | 'am';
  supplierInvoices?: SupplierInvoice[];
  setSupplierInvoices?: React.Dispatch<React.SetStateAction<SupplierInvoice[]>>;
  stockMovements?: StockMovement[];
  setStockMovements?: React.Dispatch<React.SetStateAction<StockMovement[]>>;
  onAddAuditLog?: (entry: AuditLog) => void;
}

export const PurchasingView: React.FC<PurchasingViewProps> = ({
  purchaseOrders,
  setPurchaseOrders,
  grns,
  setGrns,
  suppliers,
  setSuppliers,
  products,
  categories,
  batches,
  setBatches,
  stockBalances,
  setStockBalances,
  locations,
  currentTenantId,
  currentRole,
  language,
  supplierInvoices = [],
  setSupplierInvoices,
  stockMovements = [],
  setStockMovements,
  onAddAuditLog,
}) => {
  const [activeTab, setActiveTab] = useState<'GRN' | 'PO' | 'PAYABLES'>('GRN');
  const [showGrnModal, setShowGrnModal] = useState(false);
  const [showPoModal, setShowPoModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<SupplierInvoice | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [payablesStatusFilter, setPayablesStatusFilter] = useState<'ALL' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'>('ALL');
  const [payablesSearchQuery, setPayablesSearchQuery] = useState('');

  // PO -> GRN link state
  const [linkedPoId, setLinkedPoId] = useState<string | null>(null);

  // GRN Form State
  const [grnSupplierId, setGrnSupplierId] = useState(suppliers[0]?.id || '');
  const [grnInvoiceNumber, setGrnInvoiceNumber] = useState('');
  const [grnProductId, setGrnProductId] = useState(products[0]?.id || '');
  const [grnBatchNumber, setGrnBatchNumber] = useState('');
  const [grnMfgDate, setGrnMfgDate] = useState('2024-06-01');
  const [grnExpiryDate, setGrnExpiryDate] = useState('2027-06-30');
  const [grnQty, setGrnQty] = useState(100);
  const [grnUnitCost, setGrnUnitCost] = useState(4.50);
  const [grnUnitSellingPrice, setGrnUnitSellingPrice] = useState(7.00);
  const [grnNotes, setGrnNotes] = useState('Standard receipt into central quarantine store.');
  const [grnError, setGrnError] = useState<string | null>(null);

  // PO Form State
  const [poSupplierId, setPoSupplierId] = useState(suppliers[0]?.id || '');
  const [poNotes, setPoNotes] = useState('');
  const [poExpectedDays, setPoExpectedDays] = useState(14);
  const [poItems, setPoItems] = useState<{ productId: string; qty: number; cost: number }[]>([
    { productId: products[0]?.id || '', qty: 500, cost: 4.50 },
  ]);

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER' | 'CASH' | 'CHEQUE'>('CBE_BIRR');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Find store warehouse location (All purchases go strictly to Store)
  const storeLocation = locations.find((l) => l.type === 'STORE') || locations[0];

  // Selected product and category in GRN modal
  const selectedProduct = products.find((p) => p.id === grnProductId);
  const selectedCategory = selectedProduct ? categories.find((c) => c.id === selectedProduct.categoryId) : undefined;

  // ------------------------------------------------------------------
  // 1. Convert PO -> GRN Intake
  // ------------------------------------------------------------------
  const handleInitiateGrnFromPo = (po: PurchaseOrder) => {
    setLinkedPoId(po.id);
    setGrnSupplierId(po.supplierId);
    setGrnInvoiceNumber(`INV-${po.poNumber.replace('PO-', '')}`);
    const firstItem = po.items[0];
    if (firstItem) {
      setGrnProductId(firstItem.productId);
      const remainingQty = Math.max(1, firstItem.quantityRequested - firstItem.quantityReceived);
      setGrnQty(remainingQty);
      setGrnUnitCost(firstItem.unitCostEstimated);
      const prod = products.find((p) => p.id === firstItem.productId);
      setGrnUnitSellingPrice(prod?.standardSellingPrice || firstItem.unitCostEstimated * 1.5);
    }
    setGrnBatchNumber(`EPSS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setGrnNotes(`Received against Purchase Order ${po.poNumber}. Inspected physical seal and cold chain certificate.`);
    setShowGrnModal(true);
  };

  // ------------------------------------------------------------------
  // 2. Create GRN into Store & Auto-Generate Supplier Invoice
  // ------------------------------------------------------------------
  const handleCreateGrn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !selectedCategory) return;

    // Validate category-driven rules (e.g. Baby Milk requires expiry; Diapers exempt)
    const validation = validateBatchRequirements(selectedCategory, {
      batchNumber: grnBatchNumber,
      expiryDate: grnExpiryDate,
    });

    if (!validation.isValid) {
      setGrnError(validation.error || 'Validation failed for category rules.');
      return;
    }

    const grnNumber = `GRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const batchId = `b-${Date.now()}`;
    const totalCost = Number(grnQty) * Number(grnUnitCost);
    const invoiceNum = grnInvoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    // 1. Create Batch record
    const newBatch: Batch = {
      id: batchId,
      tenantId: currentTenantId,
      productId: selectedProduct.id,
      supplierId: grnSupplierId,
      batchNumber: grnBatchNumber || 'NO-BATCH',
      manufactureDate: grnMfgDate || undefined,
      expiryDate: grnExpiryDate || '2099-12-31',
      costPrice: Number(grnUnitCost),
      sellingPrice: Number(grnUnitSellingPrice),
      grnReference: grnNumber,
    };
    setBatches((prev) => [newBatch, ...prev]);

    // 2. Increment Store Stock Balance (Purchases receive strictly into store!)
    setStockBalances((prev) => {
      const existing = prev.find(
        (b) => b.locationId === storeLocation.id && b.productId === selectedProduct.id && b.batchId === batchId
      );
      if (existing) {
        return prev.map((b) =>
          b.id === existing.id ? { ...b, quantity: b.quantity + Number(grnQty), updatedAt: nowIso } : b
        );
      }
      return [
        {
          id: `sb-${Date.now()}`,
          tenantId: currentTenantId,
          locationId: storeLocation.id,
          productId: selectedProduct.id,
          batchId: batchId,
          quantity: Number(grnQty),
          reserved: 0,
          updatedAt: nowIso,
        },
        ...prev,
      ];
    });

    // 3. Create GRN document
    const newGrn: GRN = {
      id: `grn-${Date.now()}`,
      tenantId: currentTenantId,
      grnNumber,
      poId: linkedPoId || undefined,
      supplierId: grnSupplierId,
      destinationLocationId: storeLocation.id,
      invoiceNumber: invoiceNum,
      receivedDate: nowIso,
      totalCost,
      notes: grnNotes,
      items: [
        {
          id: `grni-${Date.now()}`,
          productId: selectedProduct.id,
          batchNumber: grnBatchNumber,
          manufactureDate: grnMfgDate,
          expiryDate: grnExpiryDate,
          quantityReceived: Number(grnQty),
          unitCost: Number(grnUnitCost),
          unitSellingPrice: Number(grnUnitSellingPrice),
        },
      ],
    };
    setGrns((prev) => [newGrn, ...prev]);

    // 4. Update Linked PO if applicable
    if (linkedPoId) {
      setPurchaseOrders((prev) =>
        prev.map((po) => {
          if (po.id !== linkedPoId) return po;
          const updatedItems = po.items.map((it) =>
            it.productId === selectedProduct.id
              ? { ...it, quantityReceived: it.quantityReceived + Number(grnQty) }
              : it
          );
          const allReceived = updatedItems.every((it) => it.quantityReceived >= it.quantityRequested);
          return {
            ...po,
            items: updatedItems,
            status: allReceived ? 'COMPLETED' : 'PARTIALLY_RECEIVED',
          };
        })
      );
    }

    // 5. Create StockMovement entry in ledger
    if (setStockMovements) {
      const newMovement: StockMovement = {
        id: `sm-${Date.now()}`,
        tenantId: currentTenantId,
        movementType: 'GRN_INTAKE',
        referenceNumber: grnNumber,
        destinationLocationId: storeLocation.id,
        productId: selectedProduct.id,
        batchId: batchId,
        quantity: Number(grnQty),
        unitCost: Number(grnUnitCost),
        unitPrice: Number(grnUnitSellingPrice),
        notes: `Inbound GRN receipt from supplier into ${storeLocation.name}`,
        performedByUserId: 'u-2',
        createdAt: nowIso,
      };
      setStockMovements((prev) => [newMovement, ...prev]);
    }

    // 6. Automatically generate Supplier Invoice in Payables ledger
    if (setSupplierInvoices) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // Net 30 days default
      const newSupplierInvoice: SupplierInvoice = {
        id: `sinv-${Date.now()}`,
        tenantId: currentTenantId,
        invoiceNumber: invoiceNum,
        supplierId: grnSupplierId,
        grnId: newGrn.id,
        poId: linkedPoId || undefined,
        invoiceDate: nowIso,
        dueDate: dueDate.toISOString(),
        totalAmount: totalCost,
        paidAmount: 0,
        status: 'UNPAID',
        paymentTerms: 'Net 30 Days',
        payments: [],
        notes: `Auto-generated from ${grnNumber}. Total units: ${grnQty} ${selectedProduct.baseUnit}s.`,
      };
      setSupplierInvoices((prev) => [newSupplierInvoice, ...prev]);
    }

    // 7. Update supplier payable balanceDue
    setSuppliers((prev) =>
      prev.map((s) => (s.id === grnSupplierId ? { ...s, balanceDue: s.balanceDue + totalCost } : s))
    );

    if (onAddAuditLog) {
      const supp = suppliers.find((s) => s.id === grnSupplierId);
      onAddAuditLog(
        createAuditLog({
          tenantId: currentTenantId,
          userName: 'Rahel Tadesse',
          userRole: 'Inventory Manager',
          action: 'GRN_RECEIPT',
          entity: 'GRN',
          entityId: grnNumber,
          entityName: `Inbound GRN: ${selectedProduct.brandName} [Batch: ${grnBatchNumber || 'NO-BATCH'}] (${grnQty} units)`,
          batchNumber: grnBatchNumber,
          category: 'STOCK_ENGINE',
          severity: 'INFO',
          locationId: storeLocation.id,
          locationName: storeLocation.name,
          efdaComplianceCode: 'EFDA-IMPORT-TRACE-11',
          reason: `Inbound shipment received from ${supp?.name || 'Supplier'}. Invoice: ${invoiceNum}. Total value: ${totalCost.toLocaleString()} ETB. Verified COA and physical seals into Store Warehouse.`,
          newValues: {
            grnNumber,
            supplier: supp?.name,
            productId: selectedProduct.id,
            quantity: Number(grnQty),
            unitCost: Number(grnUnitCost),
            expiryDate: grnExpiryDate,
            linkedPoId: linkedPoId || 'Direct GRN',
          },
        })
      );
    }

    setShowGrnModal(false);
    setLinkedPoId(null);
    setGrnBatchNumber('');
    setGrnInvoiceNumber('');
    setGrnError(null);
  };

  // ------------------------------------------------------------------
  // 3. Create Purchase Order (PO)
  // ------------------------------------------------------------------
  const handleCreatePo = (e: React.FormEvent) => {
    e.preventDefault();
    const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalEstimatedCost = poItems.reduce((acc, item) => acc + item.qty * item.cost, 0);

    const newPo: PurchaseOrder = {
      id: `po-${Date.now()}`,
      tenantId: currentTenantId,
      poNumber,
      supplierId: poSupplierId,
      status: 'APPROVED',
      orderDate: new Date().toISOString(),
      expectedDate: new Date(Date.now() + poExpectedDays * 24 * 60 * 60 * 1000).toISOString(),
      totalEstimatedCost,
      notes: poNotes,
      items: poItems.map((item, idx) => ({
        id: `poi-${Date.now()}-${idx}`,
        productId: item.productId,
        quantityRequested: Number(item.qty),
        unitCostEstimated: Number(item.cost),
        quantityReceived: 0,
      })),
    };

    setPurchaseOrders((prev) => [newPo, ...prev]);
    setShowPoModal(false);
    setPoNotes('');
    setPoItems([{ productId: products[0]?.id || '', qty: 500, cost: 4.50 }]);
  };

  // ------------------------------------------------------------------
  // 4. Record Supplier Payment (Payables Settlement)
  // ------------------------------------------------------------------
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment || paymentAmount <= 0) return;

    const remainingDue = selectedInvoiceForPayment.totalAmount - selectedInvoiceForPayment.paidAmount;
    const finalPaymentAmount = Math.min(paymentAmount, remainingDue);
    const newPaidAmount = selectedInvoiceForPayment.paidAmount + finalPaymentAmount;
    const isFullyPaid = newPaidAmount >= selectedInvoiceForPayment.totalAmount;
    const newStatus: SupplierInvoiceStatus = isFullyPaid ? 'PAID' : 'PARTIALLY_PAID';

    const newPaymentRecord: SupplierPayment = {
      id: `spay-${Date.now()}`,
      paymentDate: new Date().toISOString(),
      amount: finalPaymentAmount,
      paymentMethod,
      referenceNumber: paymentRef || `${paymentMethod}-REF-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: paymentNotes || 'Supplier payment settlement.',
    };

    // 1. Update Supplier Invoice
    if (setSupplierInvoices) {
      setSupplierInvoices((prev) =>
        prev.map((inv) =>
          inv.id === selectedInvoiceForPayment.id
            ? {
                ...inv,
                paidAmount: newPaidAmount,
                status: newStatus,
                payments: [newPaymentRecord, ...inv.payments],
              }
            : inv
        )
      );
    }

    // 2. Decrement Supplier balanceDue
    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === selectedInvoiceForPayment.supplierId
          ? { ...s, balanceDue: Math.max(0, s.balanceDue - finalPaymentAmount) }
          : s
      )
    );

    if (onAddAuditLog) {
      const supp = suppliers.find((s) => s.id === selectedInvoiceForPayment.supplierId);
      onAddAuditLog(
        createAuditLog({
          tenantId: currentTenantId,
          userName: 'Abinet Tesfaye',
          userRole: 'Pharmacy Admin',
          action: 'SUPPLIER_PAYMENT_RECORDED',
          entity: 'SupplierInvoice',
          entityId: selectedInvoiceForPayment.invoiceNumber,
          entityName: `Settlement: ${supp?.name || 'Supplier'} (${finalPaymentAmount.toLocaleString()} ETB via ${paymentMethod})`,
          category: 'FINANCIAL',
          severity: 'INFO',
          efdaComplianceCode: 'EFDA-PAYABLE-AUDIT-08',
          reason: `Settled payment against supplier invoice ${selectedInvoiceForPayment.invoiceNumber}. Ref: ${newPaymentRecord.referenceNumber}. Remaining balance: ${(selectedInvoiceForPayment.totalAmount - newPaidAmount).toLocaleString()} ETB.`,
          newValues: {
            invoiceNumber: selectedInvoiceForPayment.invoiceNumber,
            paidAmount: finalPaymentAmount,
            totalPaid: newPaidAmount,
            method: paymentMethod,
            reference: newPaymentRecord.referenceNumber,
            newStatus,
          },
        })
      );
    }

    setShowPaymentModal(false);
    setSelectedInvoiceForPayment(null);
    setPaymentRef('');
    setPaymentNotes('');
  };

  // Calculations
  const totalPayables = suppliers.reduce((acc, s) => acc + s.balanceDue, 0);
  const unpaidInvoicesCount = supplierInvoices.filter((i) => i.status === 'UNPAID').length;
  const partiallyPaidCount = supplierInvoices.filter((i) => i.status === 'PARTIALLY_PAID').length;
  const fullyPaidCount = supplierInvoices.filter((i) => i.status === 'PAID').length;

  const filteredInvoices = supplierInvoices.filter((inv) => {
    if (payablesStatusFilter !== 'ALL' && inv.status !== payablesStatusFilter) return false;
    if (payablesSearchQuery.trim()) {
      const q = payablesSearchQuery.toLowerCase();
      const supp = suppliers.find((s) => s.id === inv.supplierId);
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (supp && supp.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold">Phase 2: Purchasing & Payables Management</h2>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Complete procurement workflow: <strong>Purchase Orders (PO)</strong> &rarr; <strong>Goods Received Notes (GRN) into Store</strong> &rarr; <strong>Supplier Invoicing & Payables Settlement</strong> with Telebirr and CBE payment tracking.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPoModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl border border-slate-600 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-emerald-300" />
              <span>Create Purchase Order (PO)</span>
            </button>

            <button
              onClick={() => {
                setLinkedPoId(null);
                setShowGrnModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Receive New GRN into Store</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-700/80 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[11px]">Total GRN Receipts</span>
            <span className="text-lg font-bold text-white mt-0.5 block">{grns.length} Documents</span>
            <span className="text-[10px] text-emerald-400">Strictly stored in Warehouse</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[11px]">Purchase Orders (PO)</span>
            <span className="text-lg font-bold text-emerald-400 mt-0.5 block">{purchaseOrders.length} Orders</span>
            <span className="text-[10px] text-slate-300">1-Click intake enabled</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[11px]">Inbound Intake Point</span>
            <span className="text-sm font-bold text-amber-300 mt-1 block truncate">
              {storeLocation.name} ({storeLocation.code})
            </span>
            <span className="text-[10px] text-slate-400">Central Quarantine Store</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[11px]">Outstanding Payables Due</span>
            <span className="text-lg font-bold text-rose-300 mt-0.5 block">
              {sanitizePriceForRole(totalPayables, currentRole)}
            </span>
            <span className="text-[10px] text-slate-300">{unpaidInvoicesCount} Unpaid Invoices</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
        <button
          onClick={() => setActiveTab('GRN')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === 'GRN'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Warehouse className="w-3.5 h-3.5" />
          <span>Goods Received Notes ({grns.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('PO')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === 'PO'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Purchase Orders ({purchaseOrders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('PAYABLES')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === 'PAYABLES'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Supplier Invoices & Payables ({supplierInvoices.length})</span>
        </button>
      </div>

      {/* GRN Tab Content */}
      {activeTab === 'GRN' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-emerald-600" />
              <span>Inbound Goods Received Notes (Central Store Intake)</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Physical inventory is segregated directly into bulk quarantine warehouse
            </span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
              <tr>
                <th className="px-4 py-3">GRN Number</th>
                <th className="px-4 py-3">Supplier & Invoice</th>
                <th className="px-4 py-3">Received Date</th>
                <th className="px-4 py-3">Store Location</th>
                <th className="px-4 py-3">Items, Batches & Expiry</th>
                <th className="px-4 py-3 text-right">Intake Value (ETB)</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grns.map((grn) => {
                const sup = suppliers.find((s) => s.id === grn.supplierId);
                const loc = locations.find((l) => l.id === grn.destinationLocationId);
                return (
                  <tr key={grn.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      <div>{grn.grnNumber}</div>
                      {grn.poId && (
                        <div className="text-[10px] text-emerald-700 font-normal">
                          From PO Ref: {purchaseOrders.find((p) => p.id === grn.poId)?.poNumber || grn.poId}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{sup?.name || 'EPSS'}</div>
                      <div className="text-slate-500 text-[10px] font-mono">Invoice: {grn.invoiceNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDualDate(grn.receivedDate, language)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                        <Warehouse className="w-3 h-3 text-amber-700" />
                        {loc?.name || storeLocation.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {grn.items.map((it, idx) => {
                        const prod = products.find((p) => p.id === it.productId);
                        return (
                          <div key={idx} className="space-y-0.5 text-[11px]">
                            <span className="font-semibold text-slate-800">{prod?.brandName}:</span>{' '}
                            <span>{it.quantityReceived} {prod?.baseUnit}s</span>{' '}
                            <span className="font-mono text-[10px] text-slate-500">[Batch: {it.batchNumber} | Exp: {it.expiryDate}]</span>
                          </div>
                        );
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {sanitizePriceForRole(grn.totalCost, currentRole)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Stored in Warehouse
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PO Tab Content with 1-Click PO -> GRN intake */}
      {activeTab === 'PO' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Purchase Orders (PO) & Receiving Action</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Click &quot;Receive into Store (GRN)&quot; on any approved PO to trigger physical intake into warehouse
            </span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
              <tr>
                <th className="px-4 py-3">PO Number</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Order Date</th>
                <th className="px-4 py-3">Expected Date</th>
                <th className="px-4 py-3">Requested Lines & Progress</th>
                <th className="px-4 py-3 text-right">Est. Cost (ETB)</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchaseOrders.map((po) => {
                const sup = suppliers.find((s) => s.id === po.supplierId);
                const isCompleted = po.status === 'COMPLETED';
                return (
                  <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{po.poNumber}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{sup?.name}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDualDate(po.orderDate, language)}</td>
                    <td className="px-4 py-3 text-slate-600">{po.expectedDate ? formatDualDate(po.expectedDate, language) : '—'}</td>
                    <td className="px-4 py-3">
                      {po.items.map((it, idx) => {
                        const prod = products.find((p) => p.id === it.productId);
                        return (
                          <div key={idx} className="text-[11px] flex items-center gap-1.5">
                            <span className="font-medium text-slate-800">{prod?.brandName}:</span>
                            <span className="text-slate-600">
                              {it.quantityReceived} / {it.quantityRequested} {prod?.baseUnit}s
                            </span>
                            {it.quantityReceived >= it.quantityRequested && (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            )}
                          </div>
                        );
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {sanitizePriceForRole(po.totalEstimatedCost, currentRole)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        po.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : po.status === 'PARTIALLY_RECEIVED'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!isCompleted ? (
                        <button
                          onClick={() => handleInitiateGrnFromPo(po)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-colors shadow-2xs cursor-pointer mx-auto"
                          title="Generate GRN and receive shipments into Store Warehouse"
                        >
                          <Warehouse className="w-3 h-3" />
                          <span>Receive (GRN)</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Fully Received</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PAYABLES TAB: Full Supplier Invoices Ledger & Payments Settlement */}
      {activeTab === 'PAYABLES' && (
        <div className="space-y-4">
          {/* Payables Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-medium block">Total Outstanding Balance</span>
              <span className="text-xl font-extrabold text-rose-700 mt-1 block">
                {totalPayables.toLocaleString()} ETB
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Across {suppliers.length} active wholesale suppliers</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-medium block">Unpaid Invoices</span>
              <span className="text-xl font-extrabold text-amber-700 mt-1 block">
                {unpaidInvoicesCount} Invoices
              </span>
              <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">Awaiting settlement</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-medium block">Partially Paid</span>
              <span className="text-xl font-extrabold text-blue-700 mt-1 block">
                {partiallyPaidCount} Invoices
              </span>
              <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">Installments active</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-medium block">Settled Invoices</span>
              <span className="text-xl font-extrabold text-emerald-700 mt-1 block">
                {fullyPaidCount} Invoices
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Zero balance remaining</span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search invoice number or supplier name..."
                value={payablesSearchQuery}
                onChange={(e) => setPayablesSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setPayablesStatusFilter('ALL')}
                className={`px-3 py-1 rounded-md font-semibold ${payablesStatusFilter === 'ALL' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600'}`}
              >
                All Invoices ({supplierInvoices.length})
              </button>
              <button
                onClick={() => setPayablesStatusFilter('UNPAID')}
                className={`px-3 py-1 rounded-md font-semibold ${payablesStatusFilter === 'UNPAID' ? 'bg-rose-100 text-rose-900 shadow-xs font-bold' : 'text-slate-600'}`}
              >
                Unpaid ({unpaidInvoicesCount})
              </button>
              <button
                onClick={() => setPayablesStatusFilter('PARTIALLY_PAID')}
                className={`px-3 py-1 rounded-md font-semibold ${payablesStatusFilter === 'PARTIALLY_PAID' ? 'bg-blue-100 text-blue-900 shadow-xs font-bold' : 'text-slate-600'}`}
              >
                Partial ({partiallyPaidCount})
              </button>
              <button
                onClick={() => setPayablesStatusFilter('PAID')}
                className={`px-3 py-1 rounded-md font-semibold ${payablesStatusFilter === 'PAID' ? 'bg-emerald-100 text-emerald-900 shadow-xs font-bold' : 'text-slate-600'}`}
              >
                Paid ({fullyPaidCount})
              </button>
            </div>
          </div>

          {/* Supplier Invoices Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Invoice Date</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3 text-right">Total Amount (ETB)</th>
                  <th className="px-4 py-3 text-right">Paid Amount (ETB)</th>
                  <th className="px-4 py-3 text-right">Remaining Due (ETB)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Payment Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const sup = suppliers.find((s) => s.id === inv.supplierId);
                  const remainingDue = inv.totalAmount - inv.paidAmount;
                  const isExpanded = expandedInvoiceId === inv.id;

                  return (
                    <React.Fragment key={inv.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          <div>{inv.invoiceNumber}</div>
                          {inv.grnId && (
                            <div className="text-[10px] text-slate-500 font-normal">
                              GRN: {grns.find((g) => g.id === inv.grnId)?.grnNumber || inv.grnId}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{sup?.name || 'EPSS Supplier'}</div>
                          <div className="text-[10px] text-slate-500">TIN: {sup?.tinNumber || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDualDate(inv.invoiceDate, language)}</td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${remainingDue > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                            {formatDualDate(inv.dueDate, language)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {inv.totalAmount.toLocaleString()} ETB
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                          {inv.paidAmount.toLocaleString()} ETB
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-rose-700">
                          {remainingDue.toLocaleString()} ETB
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {remainingDue > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedInvoiceForPayment(inv);
                                  setPaymentAmount(remainingDue);
                                  setShowPaymentModal(true);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                              >
                                Record Payment
                              </button>
                            )}

                            {inv.payments && inv.payments.length > 0 && (
                              <button
                                onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                                className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
                                title="View payment installments history"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Payment History Accordion */}
                      {isExpanded && inv.payments && inv.payments.length > 0 && (
                        <tr className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={9} className="px-6 py-3">
                            <div className="space-y-1.5">
                              <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5">
                                <History className="w-3.5 h-3.5 text-emerald-600" />
                                Payment Installments History ({inv.payments.length} Payments):
                              </span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                {inv.payments.map((p) => (
                                  <div key={p.id} className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                                    <div>
                                      <div className="font-bold text-slate-900">{p.amount.toLocaleString()} ETB via {p.paymentMethod}</div>
                                      <div className="text-[10px] text-slate-500">Ref: {p.referenceNumber} • {formatDualDate(p.paymentDate, language)}</div>
                                      {p.notes && <div className="text-[10px] text-slate-600 mt-0.5">{p.notes}</div>}
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      Cleared
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Record Supplier Payment */}
      {showPaymentModal && selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Record Supplier Payment Settlement</h3>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[11px]">Invoice Reference:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{selectedInvoiceForPayment.invoiceNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[11px]">Remaining Due:</span>
                  <span className="font-bold text-rose-700 text-sm">
                    {(selectedInvoiceForPayment.totalAmount - selectedInvoiceForPayment.paidAmount).toLocaleString()} ETB
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Payment Amount (ETB) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="1"
                  max={selectedInvoiceForPayment.totalAmount - selectedInvoiceForPayment.paidAmount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Payment Channel / Method *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CBE_BIRR')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold transition-all cursor-pointer ${
                      paymentMethod === 'CBE_BIRR'
                        ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-purple-600" />
                    <span>CBE Birr / CBE Online</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('TELEBIRR')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold transition-all cursor-pointer ${
                      paymentMethod === 'TELEBIRR'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>Telebirr</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('BANK_TRANSFER')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold transition-all cursor-pointer ${
                      paymentMethod === 'BANK_TRANSFER'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>Bank Transfer (Awash/Dashen)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold transition-all cursor-pointer ${
                      paymentMethod === 'CASH'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 text-amber-600" />
                    <span>Cash / Cheque</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">
                  Transaction Reference / Voucher Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CBE-TXN-998231 or TEL-2026-981"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Settlement Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Cleared via online commercial bank portal"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Payment of {paymentAmount.toLocaleString()} ETB</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New GRN Receipt into Store */}
      {showGrnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Goods Received Note (GRN) Intake into Store</h3>
              </div>
              <button onClick={() => setShowGrnModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateGrn} className="p-6 overflow-y-auto space-y-4 text-xs">
              {grnError && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{grnError}</span>
                </div>
              )}

              {/* Inbound target notice */}
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-medium">Intake Destination:</span>
                  <span className="font-bold text-amber-950 flex items-center gap-1 mt-0.5">
                    <Warehouse className="w-4 h-4 text-amber-700" />
                    {storeLocation.name} ({storeLocation.code})
                  </span>
                </div>
                {linkedPoId && (
                  <span className="text-[11px] font-bold bg-amber-200/70 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-300">
                    Linked to PO: {purchaseOrders.find((p) => p.id === linkedPoId)?.poNumber}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Supplier *</label>
                  <select
                    value={grnSupplierId}
                    onChange={(e) => setGrnSupplierId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Supplier Invoice Ref *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-EPSS-88912"
                    value={grnInvoiceNumber}
                    onChange={(e) => setGrnInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Product / Pharmaceutical *</label>
                <select
                  value={grnProductId}
                  onChange={(e) => {
                    setGrnProductId(e.target.value);
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod?.standardSellingPrice) {
                      setGrnUnitSellingPrice(prod.standardSellingPrice);
                    }
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brandName} ({p.dosageForm || 'Item'}) — {p.baseUnit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Batch Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EPSS-2024-LOT9"
                    value={grnBatchNumber}
                    onChange={(e) => setGrnBatchNumber(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Manufacture Date</label>
                  <input
                    type="date"
                    value={grnMfgDate}
                    onChange={(e) => setGrnMfgDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">
                    Expiry Date {selectedCategory?.trackExpiry ? '*' : '(Optional)'}
                  </label>
                  <input
                    type="date"
                    required={selectedCategory?.trackExpiry}
                    value={grnExpiryDate}
                    onChange={(e) => setGrnExpiryDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">
                    Received Qty ({selectedProduct?.baseUnit}s) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={grnQty}
                    onChange={(e) => setGrnQty(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Unit Cost Price (ETB) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={grnUnitCost}
                    onChange={(e) => setGrnUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Unit Selling Price (ETB) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={grnUnitSellingPrice}
                    onChange={(e) => setGrnUnitSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Receipt Notes / Quality Checks</label>
                <input
                  type="text"
                  value={grnNotes}
                  onChange={(e) => setGrnNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <span className="font-bold text-slate-800">
                  Total Intake Value: {(grnQty * grnUnitCost).toFixed(2)} ETB
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGrnModal(false)}
                    className="px-3 py-1.5 text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                  >
                    Post GRN to Store
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Purchase Order */}
      {showPoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Create Purchase Order (PO)</span>
              </h3>
              <button onClick={() => setShowPoModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreatePo} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Supplier *</label>
                  <select
                    value={poSupplierId}
                    onChange={(e) => setPoSupplierId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Expected Delivery Within</label>
                  <select
                    value={poExpectedDays}
                    onChange={(e) => setPoExpectedDays(parseInt(e.target.value) || 14)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value={7}>7 Days (Express Replenishment)</option>
                    <option value={14}>14 Days (Standard Two Weeks)</option>
                    <option value={30}>30 Days (Monthly Restock)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Order Line Items</label>
                  <button
                    type="button"
                    onClick={() =>
                      setPoItems((prev) => [...prev, { productId: products[0]?.id || '', qty: 100, cost: 5.0 }])
                    }
                    className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item Line</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {poItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 items-center">
                      <div className="col-span-6">
                        <select
                          value={item.productId}
                          onChange={(e) => {
                            const newProdId = e.target.value;
                            setPoItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, productId: newProdId } : it))
                            );
                          }}
                          className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.brandName} ({p.baseUnit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.qty}
                          onChange={(e) => {
                            const q = parseInt(e.target.value) || 0;
                            setPoItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, qty: q } : it))
                            );
                          }}
                          className="w-full px-2 py-1 rounded border border-slate-300 text-xs font-bold"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Cost ETB"
                          value={item.cost}
                          onChange={(e) => {
                            const c = parseFloat(e.target.value) || 0;
                            setPoItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, cost: c } : it))
                            );
                          }}
                          className="w-full px-2 py-1 rounded border border-slate-300 text-xs font-bold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Order Notes & Specifications</label>
                <textarea
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="e.g. Delivery directly to Bole Central Store quarantine depot..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 h-16"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <span className="font-bold text-slate-900">
                  Est. Total: {poItems.reduce((acc, it) => acc + it.qty * it.cost, 0).toLocaleString()} ETB
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPoModal(false)}
                    className="px-3 py-1.5 text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                  >
                    Generate PO
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
