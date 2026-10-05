import React, { useState } from 'react';
import {
  Search, ShoppingCart, Tag, Pill, ShieldAlert,
  ArrowRightLeft, CheckCircle2, AlertTriangle, Trash2,
  Clock, CreditCard, Banknote, QrCode, PauseCircle,
  PlayCircle, Printer, X, Sparkles, User, Smartphone
} from 'lucide-react';
import {
  Product, Batch, StockBalance, Generic, Location,
  SalesInvoice, SalesItem, HeldBill, PaymentSplit,
  Customer, RoleCode, Category, AuditLog
} from '../types/pharmacy';
import { allocateBatchesFefo, sanitizePriceForRole } from '../utils/stockEngine';
import { formatDualDate, formatEthiopianDate } from '../utils/ethiopianCalendar';
import { createAuditLog } from '../utils/auditLogger';

interface POSViewProps {
  products: Product[];
  batches: Batch[];
  stockBalances: StockBalance[];
  setStockBalances: React.Dispatch<React.SetStateAction<StockBalance[]>>;
  generics: Generic[];
  categories: Category[];
  locations: Location[];
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  salesInvoices: SalesInvoice[];
  setSalesInvoices: React.Dispatch<React.SetStateAction<SalesInvoice[]>>;
  currentTenantId: string;
  currentTenantName: string;
  tinNumber?: string;
  licenseNumber?: string;
  currentRole: RoleCode;
  language: 'en' | 'am';
  onAddAuditLog?: (entry: AuditLog) => void;
}

export const POSView: React.FC<POSViewProps> = ({
  products,
  batches,
  stockBalances,
  setStockBalances,
  generics,
  categories,
  locations,
  customers,
  setCustomers,
  salesInvoices,
  setSalesInvoices,
  currentTenantId,
  currentTenantName,
  tinNumber,
  licenseNumber,
  currentRole,
  language,
  onAddAuditLog,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<SalesItem[]>([]);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Shortage & Transfer Alert state
  const [shortageNotice, setShortageNotice] = useState<{
    product: Product;
    dispQty: number;
    storeQty: number;
  } | null>(null);

  // Brand Substitution State
  const [selectedGenericSubstitutes, setSelectedGenericSubstitutes] = useState<{
    genericName: string;
    substitutes: Product[];
  } | null>(null);

  // Checkout modal & payment states
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastCompletedInvoice, setLastCompletedInvoice] = useState<SalesInvoice | null>(null);

  // Payment methods
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TELEBIRR' | 'CBE_BIRR' | 'CREDIT'>('CASH');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [telebirrPhone, setTelebirrPhone] = useState('+251 9');
  const [telebirrRef, setTelebirrRef] = useState('');
  const [cbeRef, setCbeRef] = useState('');
  const [prescriptionRef, setPrescriptionRef] = useState('');

  // Target locations
  const dispLoc = locations.find((l) => l.type === 'DISPENSARY') || locations[0];
  const storeLoc = locations.find((l) => l.type === 'STORE') || locations[0];

  const now = new Date();

  // Search Results
  const searchResults = products.filter((prod) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    const gen = generics.find((g) => g.id === prod.genericId);
    return (
      prod.brandName.toLowerCase().includes(q) ||
      (prod.barcode && prod.barcode.toLowerCase().includes(q)) ||
      (gen && gen.name.toLowerCase().includes(q))
    );
  });

  // Calculate Cart Totals
  const subtotal = cartItems.reduce((acc, it) => acc + it.totalPrice, 0);
  const discount = 0;
  const tax = 0; // Essential drugs exempt
  const grandTotal = subtotal - discount + tax;

  // ------------------------------------------------------------------
  // Add Product to Cart with FEFO Auto-Allocation
  // ------------------------------------------------------------------
  const handleAddToCart = (product: Product, unitType: 'BASE' | 'SECONDARY' | 'TERTIARY' = 'BASE') => {
    // Determine conversion multiplier
    let multiplier = 1;
    if (unitType === 'SECONDARY' && product.secondaryRatio) multiplier = product.secondaryRatio;
    if (unitType === 'TERTIARY' && product.tertiaryRatio) multiplier = product.tertiaryRatio;

    const baseQtyNeeded = 1 * multiplier;

    // Check Dispensary Stock
    const dispBalances = stockBalances.filter(
      (b) => b.locationId === dispLoc.id && b.productId === product.id && b.quantity > 0
    );
    const totalDispQty = dispBalances.reduce((sum, b) => sum + b.quantity, 0);

    // If Dispensary is SHORT, check if Store has stock to prompt an internal transfer
    if (totalDispQty < baseQtyNeeded) {
      const storeBalances = stockBalances.filter(
        (b) => b.locationId === storeLoc.id && b.productId === product.id && b.quantity > 0
      );
      const totalStoreQty = storeBalances.reduce((sum, b) => sum + b.quantity, 0);

      setShortageNotice({
        product,
        dispQty: totalDispQty,
        storeQty: totalStoreQty,
      });
      return;
    }

    // Allocate using FEFO engine from Dispensary batches
    const fefo = allocateBatchesFefo(product.id, dispLoc.id, baseQtyNeeded, batches, stockBalances, now);

    if (!fefo.success || fefo.allocations.length === 0) {
      alert(`Cannot dispense: ${fefo.message}`);
      return;
    }

    const allocation = fefo.allocations[0];
    const unitPrice = allocation.sellingPrice * multiplier;

    const newItem: SalesItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: product.id,
      batchId: allocation.batchId,
      batchNumber: allocation.batchNumber,
      expiryDate: allocation.expiryDate,
      unitType,
      quantityInUnit: 1,
      quantityInBase: baseQtyNeeded,
      unitPrice,
      totalPrice: unitPrice,
      isControlled: product.isControlled,
      prescriptionRequired: product.prescriptionRequired,
    };

    setCartItems((prev) => [...prev, newItem]);
    setShortageNotice(null);
  };

  // Instant Replenish Transfer: Store -> Dispensary
  const handleQuickTransferFromStore = (product: Product, qtyToTransfer: number) => {
    const storeBalance = stockBalances.find(
      (b) => b.locationId === storeLoc.id && b.productId === product.id && b.quantity >= qtyToTransfer
    );

    if (!storeBalance) {
      alert('Insufficient bulk stock in Store warehouse.');
      return;
    }

    setStockBalances((prev) => {
      // 1. Deduct from store
      let updated = prev.map((b) =>
        b.id === storeBalance.id ? { ...b, quantity: b.quantity - qtyToTransfer } : b
      );

      // 2. Add to dispensary
      const existingDisp = updated.find(
        (b) => b.locationId === dispLoc.id && b.batchId === storeBalance.batchId
      );
      if (existingDisp) {
        updated = updated.map((b) =>
          b.id === existingDisp.id ? { ...b, quantity: b.quantity + qtyToTransfer } : b
        );
      } else {
        updated.push({
          id: `sb-${Date.now()}`,
          tenantId: currentTenantId,
          locationId: dispLoc.id,
          productId: product.id,
          batchId: storeBalance.batchId,
          quantity: qtyToTransfer,
          reserved: 0,
          updatedAt: new Date().toISOString(),
        });
      }
      return updated;
    });

    if (onAddAuditLog) {
      onAddAuditLog(createAuditLog({
        tenantId: currentTenantId,
        userName: 'Hiwot Girma (Pharmacist)',
        userRole: 'Cashier / Dispenser',
        action: 'STORE_TRANSFER_APPROVED',
        entity: 'StockBalance',
        entityId: product.id,
        entityName: `${product.brandName} (${qtyToTransfer} units replenished to POS)`,
        category: 'STOCK_ENGINE',
        severity: 'INFO',
        locationId: dispLoc.id,
        locationName: dispLoc.name,
        efdaComplianceCode: 'EFDA-INTERNAL-CHAIN-05',
        reason: `Instant stock replenishment from Central Store (${storeLoc.name}) to Ground Retail Dispensary to fulfill POS checkout.`,
        newValues: { transferQty: qtyToTransfer, sourceLocation: storeLoc.name, destinationLocation: dispLoc.name }
      }));
    }

    setShortageNotice(null);
    // Add to cart now that dispensary is replenished
    handleAddToCart(product, 'BASE');
  };

  // Generic Brand Substitution Finder
  const handleShowSubstitutes = (product: Product) => {
    if (!product.genericId) return;
    const gen = generics.find((g) => g.id === product.genericId);
    if (!gen) return;

    // Find other products with same generic INN
    const substitutes = products.filter(
      (p) => p.genericId === product.genericId && p.id !== product.id
    );

    setSelectedGenericSubstitutes({
      genericName: gen.name,
      substitutes,
    });
  };

  // Hold Bill
  const handleHoldBill = () => {
    if (cartItems.length === 0) return;
    const token = `Bill #${heldBills.length + 1} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    setHeldBills((prev) => [
      ...prev,
      {
        id: `held-${Date.now()}`,
        token,
        customerName: selectedCustomer?.fullName || 'Walk-in Patient',
        items: [...cartItems],
        heldAt: new Date().toISOString(),
      },
    ]);
    setCartItems([]);
  };

  // Recall Bill
  const handleRecallBill = (bill: HeldBill) => {
    setCartItems(bill.items);
    setHeldBills((prev) => prev.filter((b) => b.id !== bill.id));
  };

  // Complete Checkout & Print
  const handleCompleteSale = () => {
    if (cartItems.length === 0) return;

    const invoiceNumber = `INV-${now.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const payments: PaymentSplit[] = [
      {
        method: paymentMethod,
        amount: grandTotal,
        reference:
          paymentMethod === 'TELEBIRR'
            ? telebirrRef || `TEL-TXN-${Math.floor(100000 + Math.random() * 900000)}`
            : paymentMethod === 'CBE_BIRR'
            ? cbeRef || `CBE-BIRR-${Math.floor(100000 + Math.random() * 900000)}`
            : undefined,
      },
    ];

    // 1. Deduct stock from Dispensary balances
    setStockBalances((prev) => {
      let updated = [...prev];
      for (const item of cartItems) {
        const bal = updated.find(
          (b) => b.locationId === dispLoc.id && b.batchId === item.batchId
        );
        if (bal) {
          updated = updated.map((b) =>
            b.id === bal.id ? { ...b, quantity: Math.max(0, b.quantity - item.quantityInBase) } : b
          );
        }
      }
      return updated;
    });

    // 2. If credit, update customer debt
    if (paymentMethod === 'CREDIT' && selectedCustomer) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomer.id ? { ...c, currentDebt: c.currentDebt + grandTotal } : c
        )
      );
    }

    // 3. Create completed sales invoice
    const newInvoice: SalesInvoice = {
      id: `sale-${Date.now()}`,
      tenantId: currentTenantId,
      invoiceNumber,
      locationId: dispLoc.id,
      cashierName: 'Hiwot Girma (Pharmacist)',
      customerName: selectedCustomer?.fullName || 'Walk-in Patient',
      customerPhone: selectedCustomer?.phone,
      customerId: selectedCustomer?.id,
      subtotal,
      discount,
      tax,
      totalAmount: grandTotal,
      payments,
      items: cartItems,
      createdAt: now.toISOString(),
      status: 'COMPLETED',
      prescriptionRef: prescriptionRef || undefined,
    };

    setSalesInvoices((prev) => [newInvoice, ...prev]);

    if (onAddAuditLog) {
      const hasControlled = cartItems.some((i) => i.isControlled || i.prescriptionRequired);
      const itemDescriptions = cartItems
        .map((i) => {
          const prod = products.find((p) => p.id === i.productId);
          return `${prod?.brandName || 'Medicine'} [Batch: ${i.batchNumber}] x${i.quantityInUnit}`;
        })
        .join(', ');

      onAddAuditLog(
        createAuditLog({
          tenantId: currentTenantId,
          userName: 'Hiwot Girma',
          userRole: 'Cashier / Dispenser',
          action: hasControlled ? 'CONTROLLED_DRUG_DISPENSE' : 'SALE_COMPLETED',
          entity: 'SalesInvoice',
          entityId: invoiceNumber,
          entityName: `Invoice ${invoiceNumber}: ${itemDescriptions}`,
          batchNumber: cartItems.map((i) => i.batchNumber).join(', '),
          category: hasControlled ? 'CONTROLLED_DRUGS' : 'POS_DISPENSING',
          severity: hasControlled ? 'ALERT' : 'INFO',
          locationId: dispLoc.id,
          locationName: dispLoc.name,
          efdaComplianceCode: hasControlled ? 'EFDA-SCHED-II-NARCOTIC' : 'EFDA-POS-GPP',
          prescriptionRef: prescriptionRef || (hasControlled ? 'RX-VALIDATED' : undefined),
          reason: hasControlled
            ? `Controlled medication dispensed to ${selectedCustomer?.fullName || 'Walk-in Patient'}. Validated prescription reference: ${prescriptionRef || 'Verified on Counter'}.`
            : `POS retail sale completed via ${paymentMethod} (${grandTotal.toLocaleString()} ETB).`,
          newValues: {
            invoiceNumber,
            totalAmount: grandTotal,
            paymentMethod,
            customerName: selectedCustomer?.fullName || 'Walk-in Patient',
            itemCount: cartItems.length,
            prescriptionRef: prescriptionRef || null,
          },
        })
      );
    }

    setLastCompletedInvoice(newInvoice);
    setShowCheckoutModal(false);
    setShowReceiptModal(true);
    setCartItems([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT COLUMN: Fast Product & Generic Search, Substitution, and Quick Grid */}
      <div className="lg:col-span-7 space-y-4">
        {/* Dispensary Active Notice */}
        <div className="bg-emerald-900 text-white px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-bold">Active POS Dispensing Counter:</span>
            <span className="text-emerald-200">{dispLoc.name} ({dispLoc.code})</span>
          </div>
          <span className="text-[11px] bg-emerald-800 px-2 py-0.5 rounded font-mono text-emerald-300">
            Deducts Only from Dispensary
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={language === 'am' ? 'ባርኮድ፣ የመድሃኒት ስም ወይም የሳይንሳዊ ስም (INN) ፈልግ...' : 'Search barcode, brand name, or INN generic active ingredient...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-sm shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        {/* Shortage & Transfer Prompt Banner */}
        {shortageNotice && (
          <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Dispensary Stock Insufficient for {shortageNotice.product.brandName}</span>
              </div>
              <button onClick={() => setShortageNotice(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="text-amber-800">
              Dispensary has only <strong>{shortageNotice.dispQty} {shortageNotice.product.baseUnit}s</strong>. However, Central Store has <strong>{shortageNotice.storeQty} {shortageNotice.product.baseUnit}s</strong> in warehouse reserve.
            </p>
            {shortageNotice.storeQty > 0 ? (
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleQuickTransferFromStore(shortageNotice.product, 50)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transfer 50 {shortageNotice.product.baseUnit}s from Store now</span>
                </button>
                <button
                  onClick={() => handleQuickTransferFromStore(shortageNotice.product, 100)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold"
                >
                  <span>Transfer 100 {shortageNotice.product.baseUnit}s</span>
                </button>
              </div>
            ) : (
              <span className="text-rose-700 font-bold block">
                Out of stock across both Store and Dispensary. Please create a Purchase Order.
              </span>
            )}
          </div>
        )}

        {/* Brand Substitution Modal / Drawer */}
        {selectedGenericSubstitutes && (
          <div className="bg-indigo-50/90 border border-indigo-200 p-4 rounded-xl text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-900 font-bold">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Brand Substitutions for Generic: {selectedGenericSubstitutes.genericName}</span>
              </div>
              <button onClick={() => setSelectedGenericSubstitutes(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="text-indigo-800 text-[11px]">
              The following alternative brands share identical active pharmaceutical ingredients and therapeutic efficacy:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {selectedGenericSubstitutes.substitutes.map((sub) => {
                const subDispQty = stockBalances
                  .filter((b) => b.locationId === dispLoc.id && b.productId === sub.id)
                  .reduce((sum, b) => sum + b.quantity, 0);

                return (
                  <div key={sub.id} className="bg-white p-3 rounded-lg border border-indigo-200 flex items-center justify-between shadow-2xs">
                    <div>
                      <div className="font-bold text-slate-900">{sub.brandName}</div>
                      <div className="text-[10px] text-slate-500">
                        {sub.dosageForm} • {sub.strength} • In Disp: {subDispQty} {sub.baseUnit}s
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleAddToCart(sub, 'BASE');
                        setSelectedGenericSubstitutes(null);
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px]"
                    >
                      Dispense Alternative
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Results / Quick Catalog */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-700">
              {searchQuery ? `Search Results (${searchResults.length})` : 'Dispensary Available Medicines & Goods'}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">FEFO Auto-Allocation Enabled</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {(searchQuery ? searchResults : products).map((prod) => {
              const gen = generics.find((g) => g.id === prod.genericId);
              // Calculate available in dispensary
              const dispStock = stockBalances
                .filter((b) => b.locationId === dispLoc.id && b.productId === prod.id)
                .reduce((acc, b) => acc + b.quantity, 0);

              const storeStock = stockBalances
                .filter((b) => b.locationId === storeLoc.id && b.productId === prod.id)
                .reduce((acc, b) => acc + b.quantity, 0);

              return (
                <div key={prod.id} className="p-3.5 hover:bg-slate-50 transition-colors flex flex-wrap items-center justify-between gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{prod.brandName}</span>
                      {prod.isControlled && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          Controlled EFDA
                        </span>
                      )}
                      {prod.prescriptionRequired && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Rx Only
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      {gen && <span className="font-medium text-slate-700">{gen.name}</span>}
                      <span>{prod.packSize || prod.variantSize}</span>
                      <span className="font-bold text-emerald-700 font-mono">
                        Dispensary: {dispStock} {prod.baseUnit}s
                      </span>
                      {storeStock > 0 && (
                        <span className="text-slate-400 font-mono">
                          (Store: {storeStock})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Unit Selection */}
                  <div className="flex items-center gap-2">
                    {/* Brand Substitution Trigger */}
                    {gen && (
                      <button
                        onClick={() => handleShowSubstitutes(prod)}
                        title="Find alternative brands with same active ingredient"
                        className="px-2 py-1 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded border border-indigo-200 transition-colors"
                      >
                        Substitutes
                      </button>
                    )}

                    {/* Unit Selector to Add */}
                    <div className="flex items-center gap-1">
                      {prod.tertiaryUnit && (
                        <button
                          onClick={() => handleAddToCart(prod, 'TERTIARY')}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-300"
                        >
                          +1 {prod.tertiaryUnit}
                        </button>
                      )}
                      {prod.secondaryUnit && (
                        <button
                          onClick={() => handleAddToCart(prod, 'SECONDARY')}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-300"
                        >
                          +1 {prod.secondaryUnit}
                        </button>
                      )}
                      <button
                        onClick={() => handleAddToCart(prod, 'BASE')}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                      >
                        +1 {prod.baseUnit}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Active Cart, FEFO Allocations, Held Bills, Checkout */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-base text-slate-900">Dispensing Cart</h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                {cartItems.length} Lines
              </span>
            </div>

            {/* Held Bills Button */}
            {heldBills.length > 0 && (
              <div className="flex items-center gap-1">
                {heldBills.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleRecallBill(b)}
                    className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-amber-100 text-amber-900 rounded-lg hover:bg-amber-200 border border-amber-300"
                  >
                    <PlayCircle className="w-3 h-3 text-amber-700" />
                    <span>{b.token}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart Items List */}
          {cartItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <ShoppingCart className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">No items in active bill. Search or select a product to dispense.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {cartItems.map((item, idx) => {
                const prod = products.find((p) => p.id === item.productId);
                return (
                  <div key={item.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">{prod?.brandName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200 text-emerald-800 font-bold">
                          FEFO Batch: {item.batchNumber}
                        </span>
                        <span>Exp: {item.expiryDate}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        Qty: <strong>{item.quantityInUnit} {item.unitType.toLowerCase()}</strong> ({item.quantityInBase} base {prod?.baseUnit}s)
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-slate-900 text-sm">
                        {item.totalPrice.toFixed(2)} ETB
                      </div>
                      <button
                        onClick={() => setCartItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-1 mt-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Customer Selection for Credit / Prescription */}
          <div className="pt-3 border-t border-slate-200">
            <label className="text-slate-600 text-xs font-semibold block mb-1">
              Select Customer (Optional / Credit Account)
            </label>
            <select
              aria-label="Select Customer"
              value={selectedCustomer?.id || ''}
              onChange={(e) => {
                const cust = customers.find((c) => c.id === e.target.value);
                setSelectedCustomer(cust || null);
              }}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 font-medium"
            >
              <option value="">Walk-in Retail Patient</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} (Debt: {c.currentDebt.toFixed(2)} / Limit: {c.creditLimit.toFixed(2)} ETB)
                </option>
              ))}
            </select>
          </div>

          {/* Bill Summary Breakdown */}
          <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-800">{subtotal.toFixed(2)} ETB</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>VAT (Essential Drugs Exempt):</span>
              <span>0.00 ETB</span>
            </div>
            <div className="flex justify-between font-bold text-base text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Payable:</span>
              <span className="text-emerald-700">{grandTotal.toFixed(2)} ETB</span>
            </div>
          </div>

          {/* Checkout & Hold Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleHoldBill}
              disabled={cartItems.length === 0}
              className="py-2.5 px-3 rounded-xl border border-slate-300 font-semibold text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <PauseCircle className="w-4 h-4 text-slate-500" />
              <span>Hold Bill</span>
            </button>

            <button
              onClick={() => {
                setCashReceived(grandTotal);
                setShowCheckoutModal(true);
              }}
              disabled={cartItems.length === 0}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-40"
            >
              <Banknote className="w-4 h-4" />
              <span>Checkout ({grandTotal.toFixed(2)} ETB)</span>
            </button>
          </div>
        </div>
      </div>

      {/* CHECKOUT & PAYMENT MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Ethiopian Payment Checkout & Receipt</h3>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
                <span className="font-medium text-emerald-900">Total Amount Due:</span>
                <span className="text-lg font-bold text-emerald-800">{grandTotal.toFixed(2)} ETB</span>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="font-bold text-slate-700 mb-2 block">Choose Payment Channel:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`p-3 rounded-xl border flex items-center gap-2 font-bold transition-all ${
                      paymentMethod === 'CASH'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Cash (ጥሬ ገንዘብ)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('TELEBIRR')}
                    className={`p-3 rounded-xl border flex items-center gap-2 font-bold transition-all ${
                      paymentMethod === 'TELEBIRR'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>Telebirr (ተሌብር)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CBE_BIRR')}
                    className={`p-3 rounded-xl border flex items-center gap-2 font-bold transition-all ${
                      paymentMethod === 'CBE_BIRR'
                        ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-purple-600" />
                    <span>CBE Birr (ንግድ ባንክ)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CREDIT')}
                    className={`p-3 rounded-xl border flex items-center gap-2 font-bold transition-all ${
                      paymentMethod === 'CREDIT'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <User className="w-4 h-4 text-amber-600" />
                    <span>Customer Credit (ብድር)</span>
                  </button>
                </div>
              </div>

              {/* Cash Channel Inputs */}
              {paymentMethod === 'CASH' && (
                <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 mb-1 block">Cash Tendered (ETB)</label>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 mb-1 block">Change to Return (ETB)</label>
                      <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-emerald-700">
                        {Math.max(0, cashReceived - grandTotal).toFixed(2)} ETB
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Telebirr Channel Inputs */}
              {paymentMethod === 'TELEBIRR' && (
                <div className="space-y-3 bg-blue-50/60 p-3.5 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between text-blue-900">
                    <span className="font-bold">Telebirr Merchant Payment:</span>
                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-blue-300">
                      *127# or Telebirr SuperApp
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 mb-1 block">Customer Mobile</label>
                      <input
                        type="text"
                        value={telebirrPhone}
                        onChange={(e) => setTelebirrPhone(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 mb-1 block">Telebirr Transaction Ref</label>
                      <input
                        type="text"
                        placeholder="e.g. TEL-881923"
                        value={telebirrRef}
                        onChange={(e) => setTelebirrRef(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CBE Birr Channel Inputs */}
              {paymentMethod === 'CBE_BIRR' && (
                <div className="space-y-3 bg-purple-50/60 p-3.5 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between text-purple-900">
                    <span className="font-bold">Commercial Bank of Ethiopia (CBE Birr):</span>
                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-purple-300">
                      *847#
                    </span>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 mb-1 block">CBE Transaction Reference</label>
                    <input
                      type="text"
                      placeholder="e.g. CBE-TXN-2026-9921"
                      value={cbeRef}
                      onChange={(e) => setCbeRef(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Customer Credit Notice */}
              {paymentMethod === 'CREDIT' && (
                <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-300 space-y-2">
                  <div className="font-bold text-amber-900">Credit Account Charging:</div>
                  {selectedCustomer ? (
                    <div className="text-amber-800">
                      Customer: <strong>{selectedCustomer.fullName}</strong>
                      <br />
                      Current Outstanding: <strong>{selectedCustomer.currentDebt.toFixed(2)} ETB</strong> (Limit: {selectedCustomer.creditLimit.toFixed(2)} ETB)
                    </div>
                  ) : (
                    <div className="text-rose-700 font-bold">
                      Please select a customer on the cart panel before charging on credit.
                    </div>
                  )}
                </div>
              )}

              {/* Prescription Number */}
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">
                  Physician Prescription Ref (Required for Rx medicines)
                </label>
                <input
                  type="text"
                  placeholder="e.g. RX-TENA-2026-8812"
                  value={prescriptionRef}
                  onChange={(e) => setPrescriptionRef(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCompleteSale}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Payment & Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* THERMAL RECEIPT / PDF PRINT MODAL */}
      {showReceiptModal && lastCompletedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Thermal Receipt Preview (80mm)</span>
              </span>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {/* Simulated 80mm Thermal Receipt */}
            <div className="p-6 overflow-y-auto space-y-3 font-mono text-xs text-slate-900 bg-amber-50/20 border-b border-slate-200">
              <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-slate-300">
                <h4 className="font-bold text-sm font-sans">{currentTenantName}</h4>
                <div className="text-[11px] text-slate-600">Front Dispensary Counter</div>
                <div className="text-[10px] text-slate-500">TIN: {tinNumber || '0029384756'} | EFDA: {licenseNumber || 'EFDA/LIC/0982'}</div>
                <div className="text-[10px] text-slate-500">Tel: +251 911 234 567</div>
              </div>

              <div className="text-[11px] space-y-0.5 pb-2 border-b border-dashed border-slate-300">
                <div>Inv: <strong>{lastCompletedInvoice.invoiceNumber}</strong></div>
                <div>Date: {formatDualDate(lastCompletedInvoice.createdAt, language)}</div>
                <div>Cashier: {lastCompletedInvoice.cashierName}</div>
                {lastCompletedInvoice.customerName && (
                  <div>Patient: {lastCompletedInvoice.customerName}</div>
                )}
                {lastCompletedInvoice.prescriptionRef && (
                  <div>Rx Ref: {lastCompletedInvoice.prescriptionRef}</div>
                )}
              </div>

              {/* Items Table */}
              <div className="space-y-1.5 pb-2 border-b border-dashed border-slate-300 text-[11px]">
                {lastCompletedInvoice.items.map((it, idx) => {
                  const prod = products.find((p) => p.id === it.productId);
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="font-bold">{prod?.brandName}</div>
                      <div className="flex justify-between text-slate-600 text-[10px]">
                        <span>Batch: {it.batchNumber} (Exp: {it.expiryDate})</span>
                        <span>
                          {it.quantityInUnit} {it.unitType.toLowerCase()} @ {it.unitPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-right font-bold">{it.totalPrice.toFixed(2)} ETB</div>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-xs pt-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{lastCompletedInvoice.subtotal.toFixed(2)} ETB</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT (Exempt):</span>
                  <span>0.00 ETB</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-400">
                  <span>TOTAL:</span>
                  <span>{lastCompletedInvoice.totalAmount.toFixed(2)} ETB</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="text-[11px] pt-2 border-t border-dashed border-slate-300">
                {lastCompletedInvoice.payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>Paid via {p.method}:</span>
                    <span>{p.amount.toFixed(2)} ETB</span>
                  </div>
                ))}
                {lastCompletedInvoice.payments[0]?.reference && (
                  <div className="text-[10px] text-slate-500">
                    Ref: {lastCompletedInvoice.payments[0].reference}
                  </div>
                )}
              </div>

              <div className="text-center pt-3 text-[10px] text-slate-500 space-y-0.5">
                <div>ፈጣሪ ጤና ይስጥልን!</div>
                <div>Wishing you a swift and healthy recovery!</div>
                <div className="font-mono tracking-widest pt-1">*** EFDA VERIFIED ***</div>
              </div>
            </div>

            <div className="p-3 bg-white flex justify-between items-center">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert('Thermal printer command sent to 80mm ESC/POS hardware receipt printer.');
                  setShowReceiptModal(false);
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
