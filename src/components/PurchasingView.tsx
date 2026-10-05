import React, { useState } from 'react';
import {
  FileText, Plus, Truck, Warehouse, CheckCircle2,
  Calendar, ShieldAlert, AlertCircle, DollarSign, Clock, Search
} from 'lucide-react';
import {
  PurchaseOrder, GRN, GRNItem, Supplier, Product, Batch,
  StockBalance, StockMovement, Location, Category, RoleCode, AuditLog
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
  onAddAuditLog,
}) => {
  const [activeTab, setActiveTab] = useState<'GRN' | 'PO' | 'PAYABLES'>('GRN');
  const [showGrnModal, setShowGrnModal] = useState(false);
  const [showPoModal, setShowPoModal] = useState(false);

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
  const [poItems, setPoItems] = useState<{ productId: string; qty: number; cost: number }[]>([
    { productId: products[0]?.id || '', qty: 500, cost: 4.50 },
  ]);

  // Find store warehouse location
  const storeLocation = locations.find((l) => l.type === 'STORE') || locations[0];

  // Selected product and category in GRN modal
  const selectedProduct = products.find((p) => p.id === grnProductId);
  const selectedCategory = selectedProduct ? categories.find((c) => c.id === selectedProduct.categoryId) : undefined;

  const handleCreateGrn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !selectedCategory) return;

    // Validate category-driven rules (Baby Milk requires expiry; Diapers exempt)
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
          b.id === existing.id ? { ...b, quantity: b.quantity + Number(grnQty), updatedAt: new Date().toISOString() } : b
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
          updatedAt: new Date().toISOString(),
        },
        ...prev,
      ];
    });

    // 3. Create GRN document
    const newGrn: GRN = {
      id: `grn-${Date.now()}`,
      tenantId: currentTenantId,
      grnNumber,
      supplierId: grnSupplierId,
      destinationLocationId: storeLocation.id,
      invoiceNumber: grnInvoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      receivedDate: new Date().toISOString(),
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
          reason: `Inbound shipment received from ${supp?.name || 'Supplier'}. Invoice: ${grnInvoiceNumber || 'N/A'}. Total value: ${totalCost.toLocaleString()} ETB. Verified COA and physical seals.`,
          newValues: {
            grnNumber,
            supplier: supp?.name,
            productId: selectedProduct.id,
            quantity: Number(grnQty),
            unitCost: Number(grnUnitCost),
            expiryDate: grnExpiryDate,
          },
        })
      );
    }

    // 4. Update supplier payable balance
    setSuppliers((prev) =>
      prev.map((s) => (s.id === grnSupplierId ? { ...s, balanceDue: s.balanceDue + totalCost } : s))
    );

    setShowGrnModal(false);
    setGrnBatchNumber('');
    setGrnInvoiceNumber('');
    setGrnError(null);
  };

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
      expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
  };

  const totalPayables = suppliers.reduce((acc, s) => acc + s.balanceDue, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-sm border border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold">Purchasing & Goods Received Notes (GRN)</h2>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Strict warehouse intake rules: All inbound orders are received into the <strong>Store (Warehouse)</strong>. Batches and expiration dates are validated against product category compliance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPoModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl border border-slate-600 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Create Purchase Order</span>
            </button>

            <button
              onClick={() => setShowGrnModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Receive New GRN into Store</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-700/80 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[11px]">Total GRN Receipts</span>
            <span className="text-lg font-bold text-white mt-0.5 block">{grns.length} Documents</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[11px]">Active Purchase Orders</span>
            <span className="text-lg font-bold text-emerald-400 mt-0.5 block">{purchaseOrders.length} Orders</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[11px]">Inbound Intake Point</span>
            <span className="text-sm font-bold text-amber-300 mt-1 block truncate">
              {storeLocation.name} ({storeLocation.code})
            </span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[11px]">Outstanding Payables</span>
            <span className="text-lg font-bold text-white mt-0.5 block">
              {sanitizePriceForRole(totalPayables, currentRole)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
        <button
          onClick={() => setActiveTab('GRN')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition-all ${
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
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition-all ${
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
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition-all ${
            activeTab === 'PAYABLES'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Supplier Payables & Invoices</span>
        </button>
      </div>

      {/* GRN Tab Content */}
      {activeTab === 'GRN' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
              <tr>
                <th className="px-4 py-3">GRN Number</th>
                <th className="px-4 py-3">Supplier & Invoice</th>
                <th className="px-4 py-3">Received Date</th>
                <th className="px-4 py-3">Delivered To Location</th>
                <th className="px-4 py-3">Items & Batches</th>
                <th className="px-4 py-3 text-right">Total Cost (ETB)</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grns.map((grn) => {
                const sup = suppliers.find((s) => s.id === grn.supplierId);
                const loc = locations.find((l) => l.id === grn.destinationLocationId);
                return (
                  <tr key={grn.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{grn.grnNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{sup?.name || 'EPSS'}</div>
                      <div className="text-slate-400 font-mono text-[10px]">{grn.invoiceNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDualDate(grn.receivedDate, language)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <Warehouse className="w-3 h-3 text-amber-600" />
                        {loc?.name || 'Central Store'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {grn.items.map((it, idx) => {
                        const prod = products.find((p) => p.id === it.productId);
                        return (
                          <div key={idx} className="text-[11px]">
                            <span className="font-medium text-slate-900">{prod?.brandName}</span>
                            <span className="text-slate-500 font-mono ml-1">
                              (Batch: {it.batchNumber} • Exp: {it.expiryDate})
                            </span>
                            <span className="text-emerald-700 font-bold ml-1">
                              x{it.quantityReceived} {prod?.baseUnit}s
                            </span>
                          </div>
                        );
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {sanitizePriceForRole(grn.totalCost, currentRole)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Received & Posted
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PO Tab Content */}
      {activeTab === 'PO' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
              <tr>
                <th className="px-4 py-3">PO Number</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Order Date</th>
                <th className="px-4 py-3">Expected Date</th>
                <th className="px-4 py-3">Requested Lines</th>
                <th className="px-4 py-3 text-right">Est. Cost (ETB)</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchaseOrders.map((po) => {
                const sup = suppliers.find((s) => s.id === po.supplierId);
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
                          <div key={idx} className="text-[11px]">
                            {prod?.brandName}: {it.quantityRequested} {prod?.baseUnit}s
                          </div>
                        );
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {sanitizePriceForRole(po.totalEstimatedCost, currentRole)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        {po.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Payables Tab Content */}
      {activeTab === 'PAYABLES' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
              <tr>
                <th className="px-4 py-3">Supplier Name</th>
                <th className="px-4 py-3">Contact Person</th>
                <th className="px-4 py-3">Direct Phone</th>
                <th className="px-4 py-3">TIN Number</th>
                <th className="px-4 py-3 text-right">Outstanding Balance (ETB)</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.map((sup) => (
                <tr key={sup.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">{sup.name}</td>
                  <td className="px-4 py-3 text-slate-700">{sup.contactPerson || '—'}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{sup.phone}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{sup.tinNumber || '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {sanitizePriceForRole(sup.balanceDue, currentRole)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        setSuppliers((prev) =>
                          prev.map((s) => (s.id === sup.id ? { ...s, balanceDue: 0 } : s))
                        );
                      }}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-semibold text-xs transition-colors border border-emerald-200"
                    >
                      Settle Payment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              <button onClick={() => setShowGrnModal(false)} className="text-slate-400 hover:text-white">✕</button>
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
                <span className="font-medium">Intake Destination:</span>
                <span className="font-bold text-amber-950 flex items-center gap-1">
                  <Warehouse className="w-4 h-4 text-amber-700" />
                  {storeLocation.name} ({storeLocation.code})
                </span>
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
                <label className="font-semibold text-slate-700 mb-1 block">Product / Item *</label>
                <select
                  value={grnProductId}
                  onChange={(e) => setGrnProductId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brandName} ({p.productType === 'MEDICINE' ? 'Medicine' : 'General'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Category Behavior Notice */}
              {selectedCategory && (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Category Rule: <strong>{selectedCategory.name}</strong></span>
                  <span className="font-semibold text-emerald-800">
                    {selectedCategory.trackExpiry ? 'Mandatory Expiration Date' : 'Exempt from Expiry'}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">
                    Batch Number {selectedCategory?.trackBatch ? '*' : '(Optional)'}
                  </label>
                  <input
                    type="text"
                    required={selectedCategory?.trackBatch}
                    placeholder="e.g. AMX-25-001"
                    value={grnBatchNumber}
                    onChange={(e) => setGrnBatchNumber(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
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
                    className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
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
              <button onClick={() => setShowPoModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreatePo} className="p-6 space-y-4 text-xs">
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
                <label className="font-semibold text-slate-700 mb-1 block">Order Notes & Specifications</label>
                <textarea
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="e.g. Fast-track delivery for cold chain insulin products..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 h-20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPoModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Generate PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
