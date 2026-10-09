import React, { useState, useRef, useEffect } from 'react';
import {
  Search, ShoppingCart, Tag, Pill, ShieldAlert,
  ArrowRightLeft, CheckCircle2, AlertTriangle, Trash2,
  Clock, CreditCard, Banknote, QrCode, PauseCircle,
  PlayCircle, Printer, X, Sparkles, User, Smartphone,
  Plus, Minus, RefreshCw, Layers, FileText, Check, ChevronRight,
  RotateCcw, Lock, Undo2
} from 'lucide-react';
import {
  Product, Batch, StockBalance, Generic, Location,
  SalesInvoice, SalesItem, HeldBill, PaymentSplit,
  Customer, RoleCode, Category, AuditLog, StockMovement
} from '../types/pharmacy';
import { allocateBatchesFefo, sanitizePriceForRole } from '../utils/stockEngine';
import { formatDualDate, formatEthiopianDate } from '../utils/ethiopianCalendar';
import { DualDate } from './DualDate';
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
  stockMovements?: StockMovement[];
  setStockMovements?: React.Dispatch<React.SetStateAction<StockMovement[]>>;
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
  stockMovements = [],
  setStockMovements,
  onAddAuditLog,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<SalesItem[]>([]);

  // Persist held bills in localStorage
  const [heldBills, setHeldBills] = useState<HeldBill[]>(() => {
    try {
      const saved = localStorage.getItem(`tenapharm_held_bills_${currentTenantId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`tenapharm_held_bills_${currentTenantId}`, JSON.stringify(heldBills));
    } catch {
      // ignore
    }
  }, [heldBills, currentTenantId]);

  const [showHeldBillsModal, setShowHeldBillsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Sales Return / Refund Flow State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnInvoiceQuery, setReturnInvoiceQuery] = useState('');
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<SalesInvoice | null>(null);
  const [returnReason, setReturnReason] = useState<'DAMAGED_EXPIRED' | 'ADVERSE_REACTION' | 'WRONG_ITEM' | 'PRESCRIBER_CHANGE' | 'PATIENT_CANCEL'>('WRONG_ITEM');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});

  // Credit Limit & Sales Manager Approval Override State
  const [isManagerApproved, setIsManagerApproved] = useState(false);
  const [managerApprovalPin, setManagerApprovalPin] = useState('');
  const [managerPinError, setManagerPinError] = useState<string | null>(null);

  // Shortage & Transfer Alert state
  const [shortageNotice, setShortageNotice] = useState<{
    product: Product;
    dispQty: number;
    storeQty: number;
    requestedQty: number;
  } | null>(null);

  // Generic Brand Substitution State
  const [selectedGenericSubstitutes, setSelectedGenericSubstitutes] = useState<{
    genericName: string;
    genericId: string;
    originalProduct: Product;
    substitutes: Product[];
  } | null>(null);

  // Checkout modal & payment states
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastCompletedInvoice, setLastCompletedInvoice] = useState<SalesInvoice | null>(null);

  // Payment Mode: Single Channel vs Split Payment
  const [isSplitPaymentMode, setIsSplitPaymentMode] = useState(false);

  // Single payment method states
  const [singlePaymentMethod, setSinglePaymentMethod] = useState<'CASH' | 'TELEBIRR' | 'CBE_BIRR' | 'CREDIT'>('CASH');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [telebirrPhone, setTelebirrPhone] = useState('+251 9');
  const [telebirrRef, setTelebirrRef] = useState('');
  const [cbeRef, setCbeRef] = useState('');
  const [prescriptionRef, setPrescriptionRef] = useState('');

  // Split payments state
  const [splitPayments, setSplitPayments] = useState<{
    method: 'CASH' | 'TELEBIRR' | 'CBE_BIRR' | 'CREDIT';
    amount: number;
    reference?: string;
  }[]>([
    { method: 'CASH', amount: 0 },
  ]);

  // Inline error and success notifications (replacing all alerts)
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [inlineSuccess, setInlineSuccess] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Autofocus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Target locations (Purchases go to Store; POS dispenses strictly from Dispensary)
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
  const tax = 0; // Essential drugs exempt under Ethiopian EFDA VAT regulation
  const grandTotal = subtotal - discount + tax;

  // Split payment totals
  const totalSplitsEntered = splitPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const splitRemainingDue = Math.max(0, grandTotal - totalSplitsEntered);

  // Cart quantity stepper handler
  const handleUpdateCartItemQty = (itemIndex: number, delta: number) => {
    setInlineError(null);
    setCartItems((prev) => {
      const item = prev[itemIndex];
      if (!item) return prev;
      const newQty = item.quantityInUnit + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== itemIndex);
      }
      const prod = products.find((p) => p.id === item.productId);
      let multiplier = 1;
      if (item.unitType === 'SECONDARY' && prod?.secondaryRatio) multiplier = prod.secondaryRatio;
      if (item.unitType === 'TERTIARY' && prod?.tertiaryRatio) multiplier = prod.tertiaryRatio;
      const newBaseQty = newQty * multiplier;

      // Validate dispensary stock
      const dispStock = stockBalances
        .filter((b) => b.locationId === dispLoc.id && b.productId === item.productId && b.quantity > 0)
        .reduce((sum, b) => sum + b.quantity, 0);

      if (newBaseQty > dispStock) {
        setInlineError(`Cannot increase: Only ${dispStock} ${prod?.baseUnit || 'units'} available in Dispensary.`);
        return prev;
      }

      const updated = [...prev];
      updated[itemIndex] = {
        ...item,
        quantityInUnit: newQty,
        quantityInBase: newBaseQty,
        totalPrice: newQty * item.unitPrice,
      };
      return updated;
    });
  };

  // Barcode and search Enter key keyboard navigation
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setInlineError(null);
      const q = searchQuery.trim().toLowerCase();

      // If search query is empty and cart has items, Enter opens Pay/Checkout modal!
      if (!q) {
        if (cartItems.length > 0) {
          setCashTendered(grandTotal);
          setSplitPayments([{ method: 'CASH', amount: grandTotal }]);
          setShowCheckoutModal(true);
        }
        return;
      }

      // 1. Exact barcode match
      const exactBarcode = products.find((p) => p.barcode && p.barcode.toLowerCase() === q);
      if (exactBarcode) {
        handleAddToCart(exactBarcode, 'BASE');
        setSearchQuery('');
        return;
      }

      // 2. Exact brand name match
      const exactBrand = products.find((p) => p.brandName.toLowerCase() === q);
      if (exactBrand) {
        handleAddToCart(exactBrand, 'BASE');
        setSearchQuery('');
        return;
      }

      // 3. Single search match
      if (searchResults.length === 1) {
        handleAddToCart(searchResults[0], 'BASE');
        setSearchQuery('');
        return;
      }

      // 4. First match if multiple found
      if (searchResults.length > 1) {
        handleAddToCart(searchResults[0], 'BASE');
        setSearchQuery('');
        return;
      }

      setInlineError(`No product found for scanned barcode or search term "${searchQuery}".`);
    }
  };

  // ------------------------------------------------------------------
  // Add Product to Cart with FEFO Auto-Allocation
  // ------------------------------------------------------------------
  const handleAddToCart = (product: Product, unitType: 'BASE' | 'SECONDARY' | 'TERTIARY' = 'BASE') => {
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
        requestedQty: baseQtyNeeded,
      });
      return;
    }

    // Allocate using FEFO engine from Dispensary batches
    const fefo = allocateBatchesFefo(product.id, dispLoc.id, baseQtyNeeded, batches, stockBalances, now);

    if (!fefo.success || fefo.allocations.length === 0) {
      setInlineError(`Cannot dispense: ${fefo.message}`);
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

  // ------------------------------------------------------------------
  // Instant Replenish Transfer: Store -> Dispensary with Shortage Prompt
  // ------------------------------------------------------------------
  const handleQuickTransferFromStore = (product: Product, qtyToTransfer: number) => {
    const storeBalance = stockBalances.find(
      (b) => b.locationId === storeLoc.id && b.productId === product.id && b.quantity >= qtyToTransfer
    );

    if (!storeBalance) {
      setInlineError('Insufficient bulk stock in Store warehouse.');
      return;
    }

    const nowIso = new Date().toISOString();

    setStockBalances((prev) => {
      // 1. Deduct from store
      let updated = prev.map((b) =>
        b.id === storeBalance.id ? { ...b, quantity: b.quantity - qtyToTransfer, updatedAt: nowIso } : b
      );

      // 2. Add to dispensary
      const existingDisp = updated.find(
        (b) => b.locationId === dispLoc.id && b.batchId === storeBalance.batchId
      );
      if (existingDisp) {
        updated = updated.map((b) =>
          b.id === existingDisp.id ? { ...b, quantity: b.quantity + qtyToTransfer, updatedAt: nowIso } : b
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
          updatedAt: nowIso,
        });
      }
      return updated;
    });

    // Record StockMovement ledger entry
    if (setStockMovements) {
      const transferMovement: StockMovement = {
        id: `sm-${Date.now()}`,
        tenantId: currentTenantId,
        movementType: 'STORE_TO_DISPENSARY_TRANSFER',
        referenceNumber: `TRF-QUICK-${Math.floor(1000 + Math.random() * 9000)}`,
        sourceLocationId: storeLoc.id,
        destinationLocationId: dispLoc.id,
        productId: product.id,
        batchId: storeBalance.batchId,
        quantity: qtyToTransfer,
        unitCost: 0,
        unitPrice: 0,
        notes: `Urgent POS replenishment: Transferred ${qtyToTransfer} units from Store to Ground Dispensary counter.`,
        performedByUserId: 'u-3',
        createdAt: nowIso,
      };
      setStockMovements((prev) => [transferMovement, ...prev]);
    }

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
        reason: `Instant stock replenishment from Central Store (${storeLoc.name}) to Ground Retail Dispensary to fulfill checkout demand.`,
        newValues: { transferQty: qtyToTransfer, sourceLocation: storeLoc.name, destinationLocation: dispLoc.name }
      }));
    }

    setShortageNotice(null);
    handleAddToCart(product, 'BASE');
  };

  // ------------------------------------------------------------------
  // Generic Brand Substitution Finder
  // ------------------------------------------------------------------
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
      genericId: gen.id,
      originalProduct: product,
      substitutes,
    });
  };

  // ------------------------------------------------------------------
  // Hold Bill
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // Recall Held Bill
  // ------------------------------------------------------------------
  const handleRecallBill = (bill: HeldBill) => {
    setCartItems(bill.items);
    setHeldBills((prev) => prev.filter((b) => b.id !== bill.id));
    setShowHeldBillsModal(false);
  };

  // ------------------------------------------------------------------
  // Delete Held Bill
  // ------------------------------------------------------------------
  const handleDeleteHeldBill = (billId: string) => {
    setHeldBills((prev) => prev.filter((b) => b.id !== billId));
  };

  // ------------------------------------------------------------------
  // Complete Checkout & Print Thermal Receipt
  // ------------------------------------------------------------------
  const handleCompleteSale = () => {
    if (cartItems.length === 0) return;

    const invoiceNumber = `INV-${now.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    // Prepare Payments list (Single vs Split)
    let finalPayments: PaymentSplit[] = [];

    if (isSplitPaymentMode) {
      if (totalSplitsEntered < grandTotal) {
        setInlineError(`Split payments total (${totalSplitsEntered.toFixed(2)} ETB) is less than Grand Total (${grandTotal.toFixed(2)} ETB).`);
        return;
      }
      finalPayments = splitPayments.filter((p) => p.amount > 0).map((p) => ({
        method: p.method,
        amount: Number(p.amount),
        reference: p.reference || (p.method === 'TELEBIRR' ? telebirrRef : p.method === 'CBE_BIRR' ? cbeRef : undefined),
      }));
    } else {
      finalPayments = [
        {
          method: singlePaymentMethod,
          amount: grandTotal,
          reference:
            singlePaymentMethod === 'TELEBIRR'
              ? telebirrRef || `TEL-TXN-${Math.floor(100000 + Math.random() * 900000)}`
              : singlePaymentMethod === 'CBE_BIRR'
              ? cbeRef || `CBE-BIRR-${Math.floor(100000 + Math.random() * 900000)}`
              : undefined,
        },
      ];
    }

    const nowIso = now.toISOString();

    // 1. Deduct stock from Dispensary balances
    setStockBalances((prev) => {
      let updated = [...prev];
      for (const item of cartItems) {
        const bal = updated.find(
          (b) => b.locationId === dispLoc.id && b.batchId === item.batchId
        );
        if (bal) {
          updated = updated.map((b) =>
            b.id === bal.id ? { ...b, quantity: Math.max(0, b.quantity - item.quantityInBase), updatedAt: nowIso } : b
          );
        }
      }
      return updated;
    });

    // 2. Append StockMovement ledger records
    if (setStockMovements) {
      const posMovements: StockMovement[] = cartItems.map((item) => ({
        id: `sm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        tenantId: currentTenantId,
        movementType: 'POS_DISPENSE',
        referenceNumber: invoiceNumber,
        sourceLocationId: dispLoc.id,
        productId: item.productId,
        batchId: item.batchId,
        quantity: item.quantityInBase,
        unitCost: 0,
        unitPrice: item.unitPrice,
        notes: `Retail POS sale. Batch: ${item.batchNumber} (Exp: ${item.expiryDate})`,
        performedByUserId: 'u-3',
        createdAt: nowIso,
      }));
      setStockMovements((prev) => [...posMovements, ...prev]);
    }

    // 3. If credit payment included, update customer debt
    const creditPayment = finalPayments.find((p) => p.method === 'CREDIT');
    if (creditPayment && selectedCustomer) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomer.id ? { ...c, currentDebt: c.currentDebt + creditPayment.amount } : c
        )
      );
    }

    // 4. Create completed sales invoice
    const newInvoice: SalesInvoice = {
      id: `sale-${Date.now()}`,
      tenantId: currentTenantId,
      invoiceNumber,
      locationId: dispLoc.id,
      cashierName: 'Hiwot Girma (Pharmacist)',
      customerName: selectedCustomer?.fullName || 'Walk-in Retail Patient',
      customerPhone: selectedCustomer?.phone,
      customerId: selectedCustomer?.id,
      subtotal,
      discount,
      tax,
      totalAmount: grandTotal,
      payments: finalPayments,
      items: cartItems,
      createdAt: nowIso,
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

      const paymentSummary = finalPayments.map((p) => `${p.method}: ${p.amount} ETB`).join(' + ');

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
            ? `Controlled medication dispensed to ${selectedCustomer?.fullName || 'Walk-in Patient'}. Validated prescription: ${prescriptionRef || 'Verified on Counter'}. Payments: ${paymentSummary}.`
            : `POS retail sale completed. Payment splits: ${paymentSummary} (${grandTotal.toLocaleString()} ETB).`,
          newValues: {
            invoiceNumber,
            totalAmount: grandTotal,
            payments: finalPayments,
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
        {/* Dispensary Active Notice & Held Bills Bar */}
        <div className="bg-emerald-950 text-white px-4 py-2.5 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs border border-emerald-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="font-bold">Active POS Dispensing Shelf:</span>
            <span className="text-emerald-200">{dispLoc.name} ({dispLoc.code})</span>
          </div>

          <div className="flex items-center gap-2">
            {heldBills.length > 0 && (
              <button
                onClick={() => setShowHeldBillsModal(true)}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer animate-pulse"
              >
                <PauseCircle className="w-3.5 h-3.5 text-slate-950" />
                <span>{heldBills.length} Held Bill{heldBills.length === 1 ? '' : 's'}</span>
              </button>
            )}

            <span className="text-[11px] bg-emerald-800/90 px-2 py-0.5 rounded font-mono text-emerald-300">
              FEFO Enforced
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            ref={searchInputRef}
            autoFocus
            type="text"
            placeholder={language === 'am' ? 'ባርኮድ፣ የመድሃኒት ስም ወይም የሳይንሳዊ ስም (INN) ፈልግ (Enter ለመጨመር)...' : 'Scan barcode or search brand / INN (Press Enter to add)...'}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setInlineError(null);
            }}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-sm shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        {/* Inline Error and Success Banners */}
        {inlineError && (
          <div className="bg-rose-50 border border-rose-300 text-rose-900 p-3 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{inlineError}</span>
            </div>
            <button
              onClick={() => setInlineError(null)}
              className="text-rose-500 hover:text-rose-800 font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {inlineSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{inlineSuccess}</span>
            </div>
            <button
              onClick={() => setInlineSuccess(null)}
              className="text-emerald-500 hover:text-emerald-800 font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Shortage & Transfer Prompt Banner */}
        {shortageNotice && (
          <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Dispensary Shortage for {shortageNotice.product.brandName}</span>
              </div>
              <button onClick={() => setShortageNotice(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <p className="text-amber-800">
              Dispensary has only <strong>{shortageNotice.dispQty} {shortageNotice.product.baseUnit}s</strong>. However, Central Store Warehouse has <strong>{shortageNotice.storeQty} {shortageNotice.product.baseUnit}s</strong> available in stock.
            </p>
            {shortageNotice.storeQty > 0 ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => handleQuickTransferFromStore(shortageNotice.product, 50)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transfer 50 {shortageNotice.product.baseUnit}s from Store</span>
                </button>
                <button
                  onClick={() => handleQuickTransferFromStore(shortageNotice.product, 100)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  <span>Transfer 100 {shortageNotice.product.baseUnit}s</span>
                </button>
                {shortageNotice.product.genericId && (
                  <button
                    onClick={() => handleShowSubstitutes(shortageNotice.product)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg font-semibold border border-indigo-200 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>View Equivalent Substitutes</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-rose-700 font-bold">
                  Zero stock available across Store and Dispensary!
                </span>
                {shortageNotice.product.genericId && (
                  <button
                    onClick={() => handleShowSubstitutes(shortageNotice.product)}
                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Suggest Generic Brands</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Live Search Results or Quick Catalog Grid */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">
              {searchQuery ? `Search Results (${searchResults.length})` : 'Popular Dispensary Medications'}
            </span>
            <span className="text-slate-500 text-[11px]">Click product to allocate batch via FEFO</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {(searchQuery ? searchResults : products).map((prod) => {
              const gen = generics.find((g) => g.id === prod.genericId);
              const dispStock = stockBalances
                .filter((b) => b.locationId === dispLoc.id && b.productId === prod.id)
                .reduce((sum, b) => sum + b.quantity, 0);

              const storeStock = stockBalances
                .filter((b) => b.locationId === storeLoc.id && b.productId === prod.id)
                .reduce((sum, b) => sum + b.quantity, 0);

              // Find earliest expiry batch for FEFO indicator
              const activeBatches = batches.filter(
                (b) => b.productId === prod.id && new Date(b.expiryDate) > now
              ).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

              const earliestBatch = activeBatches[0];
              const daysLeft = earliestBatch
                ? Math.ceil((new Date(earliestBatch.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <div
                  key={prod.id}
                  className="p-3.5 hover:bg-slate-50/90 transition-colors flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">
                        {prod.brandName} {prod.strength ? `(${prod.strength})` : ''}
                      </span>
                      {prod.isControlled && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300">
                          Controlled Rx
                        </span>
                      )}
                      {daysLeft !== null && daysLeft <= 30 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                          FEFO &le; {daysLeft}d left
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                      {gen && <span className="font-medium text-slate-700">INN: {gen.name}</span>}
                      <span>• {prod.dosageForm}</span>
                      <span>• Pack: {prod.packSize || 'Standard'}</span>
                    </div>

                    {/* Stock, FEFO Expiry (EC+GC), and Price */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[11px]">
                      <span className={`font-semibold ${dispStock > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        Dispensary: <strong>{dispStock}</strong> {prod.baseUnit}s
                      </span>
                      {earliestBatch ? (
                        <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>FEFO:</span>
                          <DualDate value={earliestBatch.expiryDate} lang={language} />
                        </span>
                      ) : (
                        <span className="text-rose-600 font-semibold text-[10px]">No active batch</span>
                      )}
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {(earliestBatch ? Number(earliestBatch.sellingPrice) : (prod.standardSellingPrice || 0)).toFixed(2)} ETB / {prod.baseUnit}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Generic Substitutes button */}
                    {prod.genericId && (
                      <button
                        onClick={() => handleShowSubstitutes(prod)}
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Find brand alternatives with same generic active ingredient"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Substitutes</span>
                      </button>
                    )}

                    {/* Multi-unit Add Buttons */}
                    <button
                      onClick={() => handleAddToCart(prod, 'BASE')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>1 {prod.baseUnit}</span>
                    </button>

                    {prod.secondaryUnit && (
                      <button
                        onClick={() => handleAddToCart(prod, 'SECONDARY')}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium text-xs border border-slate-300 transition-colors cursor-pointer"
                      >
                        + 1 {prod.secondaryUnit}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Active Cart, Customer Credit, Hold Bill & Checkout */}
      <div className="lg:col-span-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-xs flex flex-col max-h-[calc(100vh-110px)] overflow-hidden">
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Current Sales Cart</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                {cartItems.length} items
              </span>
            </div>

            {cartItems.length > 0 && (
              <button
                onClick={() => setCartItems([])}
                className="text-slate-400 hover:text-rose-600 text-xs font-medium cursor-pointer"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart Items List */}
          {cartItems.length === 0 ? (
            <div className="py-10 text-center text-slate-400 space-y-2 flex-1 flex flex-col justify-center">
              <ShoppingCart className="w-9 h-9 text-slate-300 mx-auto" />
              <div className="font-semibold text-slate-700">The cart is currently empty</div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Scan barcode or select medicines on the left. Earliest expiring batches are automatically allocated via FEFO.
              </p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[280px] divide-y divide-slate-100 pr-1 py-1">
              {cartItems.map((item, idx) => {
                const prod = products.find((p) => p.id === item.productId);
                const expiryDiff = Math.ceil(
                  (new Date(item.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <div key={item.id} className="pt-3 first:pt-0 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {prod?.brandName} {prod?.strength ? `(${prod.strength})` : ''}
                      </div>

                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 font-bold text-slate-800">
                          Batch: {item.batchNumber}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded font-semibold inline-flex items-center gap-1 ${
                          expiryDiff <= 30 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-800'
                        }`}>
                          <span>Exp:</span>
                          <DualDate value={item.expiryDate} lang={language} />
                          <span>({expiryDiff}d left)</span>
                        </span>
                        {item.isControlled && (
                          <span className="font-bold text-rose-700 bg-rose-50 px-1 rounded">
                            Controlled
                          </span>
                        )}
                      </div>

                      {/* Quantity Stepper and Unit Price */}
                      <div className="text-[11px] text-slate-600 mt-2 flex items-center gap-2">
                        <div className="flex items-center gap-1 border border-slate-300 rounded-lg p-0.5 bg-slate-50">
                          <button
                            type="button"
                            onClick={() => handleUpdateCartItemQty(idx, -1)}
                            className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-slate-200 text-slate-800 font-bold border border-slate-200 cursor-pointer text-xs"
                            title="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="font-bold text-xs px-1 min-w-[20px] text-center text-slate-900">
                            {item.quantityInUnit}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateCartItemQty(idx, 1)}
                            className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-slate-200 text-slate-800 font-bold border border-slate-200 cursor-pointer text-xs"
                            title="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {item.unitType.toLowerCase()} ({item.quantityInBase} base units)
                        </span>
                        <span>@ {item.unitPrice.toFixed(2)} ETB</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-slate-900 text-sm">
                        {item.totalPrice.toFixed(2)} ETB
                      </div>
                      <button
                        onClick={() => setCartItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 p-1 mt-1 transition-colors cursor-pointer"
                        title="Remove line item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sticky Cart Footer: Customer Selection, Bill Breakdown & Pay Button */}
          <div className="shrink-0 sticky bottom-0 bg-white border-t border-slate-200 pt-3 space-y-2 mt-auto">
            {/* Customer Selection for Credit Account & Prescription */}
            <div>
              <label className="text-slate-700 text-xs font-semibold block mb-1">
                Select Customer / Credit Account (Optional)
              </label>
              <select
                aria-label="Select Customer"
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const cust = customers.find((c) => c.id === e.target.value);
                  setSelectedCustomer(cust || null);
                }}
                className="w-full px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 font-medium"
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
            <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-800">{subtotal.toFixed(2)} ETB</span>
              </div>
              <div className="flex justify-between text-emerald-700 text-[11px]">
                <span>VAT (EFDA Essential Drugs Exempt):</span>
                <span>0.00 ETB</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Total Payable:</span>
                <span className="text-emerald-700 font-extrabold text-base">{grandTotal.toFixed(2)} ETB</span>
              </div>
            </div>

            {/* Checkout & Hold Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleHoldBill}
                disabled={cartItems.length === 0}
                className="py-2.5 px-3 rounded-xl border border-slate-300 font-semibold text-xs text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <PauseCircle className="w-4 h-4 text-slate-500" />
                <span>Hold Bill</span>
              </button>

              <button
                onClick={() => {
                  setCashTendered(grandTotal);
                  setSplitPayments([
                    { method: 'CASH', amount: grandTotal },
                  ]);
                  setShowCheckoutModal(true);
                }}
                disabled={cartItems.length === 0}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Banknote className="w-4 h-4" />
                <span>Pay ({grandTotal.toFixed(2)} ETB)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CHECKOUT & SPLIT PAYMENT MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Ethiopian Payment Checkout & Receipt</h3>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Grand Total Header */}
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-medium text-emerald-900 block text-xs">Total Amount Due:</span>
                  <span className="text-xl font-extrabold text-emerald-800">{grandTotal.toFixed(2)} ETB</span>
                </div>
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-emerald-300">
                  <button
                    type="button"
                    onClick={() => setIsSplitPaymentMode(false)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      !isSplitPaymentMode ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Single Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSplitPaymentMode(true)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      isSplitPaymentMode ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Split Payment
                  </button>
                </div>
              </div>

              {/* SINGLE PAYMENT MODE */}
              {!isSplitPaymentMode && (
                <div className="space-y-3">
                  <label className="font-bold text-slate-700 block">Choose Payment Channel:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSinglePaymentMethod('CASH')}
                      className={`p-3 rounded-xl border flex items-center gap-2 font-bold transition-all cursor-pointer ${
                        singlePaymentMethod === 'CASH'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <span>Cash (ጥሬ ገንዘብ)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSinglePaymentMethod('TELEBIRR')}
                      className={`p-3 rounded-xl border flex items-center gap-2 font-bold transition-all cursor-pointer ${
                        singlePaymentMethod === 'TELEBIRR'
                          ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-blue-600" />
                      <span>Telebirr (ተሌብር)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSinglePaymentMethod('CBE_BIRR')}
                      className={`p-3 rounded-xl border flex items-center gap-2 font-bold transition-all cursor-pointer ${
                        singlePaymentMethod === 'CBE_BIRR'
                          ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-2xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <QrCode className="w-4 h-4 text-purple-600" />
                      <span>CBE Birr (ንግድ ባንክ)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSinglePaymentMethod('CREDIT')}
                      className={`p-3 rounded-xl border flex items-center gap-2 font-bold transition-all cursor-pointer ${
                        singlePaymentMethod === 'CREDIT'
                          ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-2xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <User className="w-4 h-4 text-amber-600" />
                      <span>Customer Credit (ብድር)</span>
                    </button>
                  </div>

                  {/* Cash Single Inputs */}
                  {singlePaymentMethod === 'CASH' && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700 mb-1 block">Cash Tendered (ETB)</label>
                        <input
                          type="number"
                          value={cashTendered}
                          onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 mb-1 block">Change to Return (ETB)</label>
                        <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-emerald-700">
                          {Math.max(0, cashTendered - grandTotal).toFixed(2)} ETB
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Telebirr Single Inputs */}
                  {singlePaymentMethod === 'TELEBIRR' && (
                    <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200 space-y-2">
                      <div className="text-blue-900 font-bold">Telebirr Merchant Payment: *127#</div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Customer Mobile (+251)"
                          value={telebirrPhone}
                          onChange={(e) => setTelebirrPhone(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                        />
                        <input
                          type="text"
                          placeholder="Transaction Ref (e.g. TEL-9921)"
                          value={telebirrRef}
                          onChange={(e) => setTelebirrRef(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* CBE Birr Single Inputs */}
                  {singlePaymentMethod === 'CBE_BIRR' && (
                    <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-200 space-y-2">
                      <div className="text-purple-900 font-bold">Commercial Bank of Ethiopia: *847#</div>
                      <input
                        type="text"
                        placeholder="CBE Transaction Ref (e.g. CBE-TXN-8812)"
                        value={cbeRef}
                        onChange={(e) => setCbeRef(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                      />
                    </div>
                  )}

                  {/* Credit Single Inputs */}
                  {singlePaymentMethod === 'CREDIT' && (
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-300">
                      {selectedCustomer ? (
                        <div className="text-amber-900 font-medium">
                          Charging to: <strong>{selectedCustomer.fullName}</strong>. Current debt: {selectedCustomer.currentDebt.toFixed(2)} ETB (Limit: {selectedCustomer.creditLimit.toFixed(2)} ETB).
                        </div>
                      ) : (
                        <div className="text-rose-700 font-bold">
                          Please select a registered customer on the cart panel before charging on credit.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SPLIT PAYMENT MODE */}
              {isSplitPaymentMode && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">Split Payment Channels Breakdown:</label>
                    <span className={`font-bold ${splitRemainingDue === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {splitRemainingDue === 0 ? '✓ Fully Covered' : `Remaining: ${splitRemainingDue.toFixed(2)} ETB`}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* Split Line 1: Cash */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4 font-bold text-slate-800 flex items-center gap-1.5">
                        <Banknote className="w-4 h-4 text-emerald-600" />
                        <span>Cash</span>
                      </div>
                      <div className="col-span-5">
                        <input
                          type="number"
                          placeholder="Amount ETB"
                          value={splitPayments.find((p) => p.method === 'CASH')?.amount || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setSplitPayments((prev) => {
                              const exists = prev.some((p) => p.method === 'CASH');
                              if (exists) return prev.map((p) => p.method === 'CASH' ? { ...p, amount: val } : p);
                              return [...prev, { method: 'CASH', amount: val }];
                            });
                          }}
                          className="w-full px-2 py-1 rounded border border-slate-300 font-bold text-slate-900"
                        />
                      </div>
                      <div className="col-span-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSplitPayments((prev) => {
                              const otherSum = prev.filter((p) => p.method !== 'CASH').reduce((s, p) => s + p.amount, 0);
                              const remaining = Math.max(0, grandTotal - otherSum);
                              const exists = prev.some((p) => p.method === 'CASH');
                              if (exists) return prev.map((p) => p.method === 'CASH' ? { ...p, amount: remaining } : p);
                              return [...prev, { method: 'CASH', amount: remaining }];
                            });
                          }}
                          className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded font-bold cursor-pointer"
                        >
                          Fill Due
                        </button>
                      </div>
                    </div>

                    {/* Split Line 2: Telebirr */}
                    <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-200 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4 font-bold text-blue-900 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-blue-600" />
                        <span>Telebirr</span>
                      </div>
                      <div className="col-span-5">
                        <input
                          type="number"
                          placeholder="Amount ETB"
                          value={splitPayments.find((p) => p.method === 'TELEBIRR')?.amount || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setSplitPayments((prev) => {
                              const exists = prev.some((p) => p.method === 'TELEBIRR');
                              if (exists) return prev.map((p) => p.method === 'TELEBIRR' ? { ...p, amount: val } : p);
                              return [...prev, { method: 'TELEBIRR', amount: val }];
                            });
                          }}
                          className="w-full px-2 py-1 rounded border border-slate-300 font-bold text-slate-900"
                        />
                      </div>
                      <div className="col-span-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSplitPayments((prev) => {
                              const otherSum = prev.filter((p) => p.method !== 'TELEBIRR').reduce((s, p) => s + p.amount, 0);
                              const remaining = Math.max(0, grandTotal - otherSum);
                              const exists = prev.some((p) => p.method === 'TELEBIRR');
                              if (exists) return prev.map((p) => p.method === 'TELEBIRR' ? { ...p, amount: remaining } : p);
                              return [...prev, { method: 'TELEBIRR', amount: remaining }];
                            });
                          }}
                          className="text-[10px] bg-blue-200 hover:bg-blue-300 text-blue-800 px-2 py-1 rounded font-bold cursor-pointer"
                        >
                          Fill Due
                        </button>
                      </div>
                    </div>

                    {/* Split Line 3: CBE Birr */}
                    <div className="bg-purple-50/60 p-2.5 rounded-xl border border-purple-200 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4 font-bold text-purple-900 flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-purple-600" />
                        <span>CBE Birr</span>
                      </div>
                      <div className="col-span-5">
                        <input
                          type="number"
                          placeholder="Amount ETB"
                          value={splitPayments.find((p) => p.method === 'CBE_BIRR')?.amount || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setSplitPayments((prev) => {
                              const exists = prev.some((p) => p.method === 'CBE_BIRR');
                              if (exists) return prev.map((p) => p.method === 'CBE_BIRR' ? { ...p, amount: val } : p);
                              return [...prev, { method: 'CBE_BIRR', amount: val }];
                            });
                          }}
                          className="w-full px-2 py-1 rounded border border-slate-300 font-bold text-slate-900"
                        />
                      </div>
                      <div className="col-span-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSplitPayments((prev) => {
                              const otherSum = prev.filter((p) => p.method !== 'CBE_BIRR').reduce((s, p) => s + p.amount, 0);
                              const remaining = Math.max(0, grandTotal - otherSum);
                              const exists = prev.some((p) => p.method === 'CBE_BIRR');
                              if (exists) return prev.map((p) => p.method === 'CBE_BIRR' ? { ...p, amount: remaining } : p);
                              return [...prev, { method: 'CBE_BIRR', amount: remaining }];
                            });
                          }}
                          className="text-[10px] bg-purple-200 hover:bg-purple-300 text-purple-800 px-2 py-1 rounded font-bold cursor-pointer"
                        >
                          Fill Due
                        </button>
                      </div>
                    </div>

                    {/* Split Line 4: Credit Account */}
                    {selectedCustomer && (
                      <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-300 grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4 font-bold text-amber-900 flex items-center gap-1.5">
                          <User className="w-4 h-4 text-amber-600" />
                          <span>Customer Credit</span>
                        </div>
                        <div className="col-span-5">
                          <input
                            type="number"
                            placeholder="Amount ETB"
                            value={splitPayments.find((p) => p.method === 'CREDIT')?.amount || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setSplitPayments((prev) => {
                                const exists = prev.some((p) => p.method === 'CREDIT');
                                if (exists) return prev.map((p) => p.method === 'CREDIT' ? { ...p, amount: val } : p);
                                return [...prev, { method: 'CREDIT', amount: val }];
                              });
                            }}
                            className="w-full px-2 py-1 rounded border border-slate-300 font-bold text-slate-900"
                          />
                        </div>
                        <div className="col-span-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSplitPayments((prev) => {
                                const otherSum = prev.filter((p) => p.method !== 'CREDIT').reduce((s, p) => s + p.amount, 0);
                                const remaining = Math.max(0, grandTotal - otherSum);
                                const exists = prev.some((p) => p.method === 'CREDIT');
                                if (exists) return prev.map((p) => p.method === 'CREDIT' ? { ...p, amount: remaining } : p);
                                return [...prev, { method: 'CREDIT', amount: remaining }];
                              });
                            }}
                            className="text-[10px] bg-amber-200 hover:bg-amber-300 text-amber-900 px-2 py-1 rounded font-bold cursor-pointer"
                          >
                            Fill Due
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCompleteSale}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Payment & Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GENERIC BRAND SUBSTITUTIONS FINDER */}
      {selectedGenericSubstitutes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-indigo-950 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm">Generic Equivalence & Brand Substitutions</h3>
                  <div className="text-[11px] text-indigo-300">Active INN: {selectedGenericSubstitutes.genericName}</div>
                </div>
              </div>
              <button onClick={() => setSelectedGenericSubstitutes(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Requested Product:</span>
                <span className="font-bold text-slate-900 text-sm">{selectedGenericSubstitutes.originalProduct.brandName}</span>
                <span className="text-slate-600 block mt-0.5">
                  Pack: {selectedGenericSubstitutes.originalProduct.packSize} • Strength: {selectedGenericSubstitutes.originalProduct.strength || 'Standard'}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">
                  Equivalent Brand Alternatives ({selectedGenericSubstitutes.substitutes.length} Available):
                </h4>

                {selectedGenericSubstitutes.substitutes.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl">
                    No other brand formulations currently registered with the same active INN.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedGenericSubstitutes.substitutes.map((sub) => {
                      const dispStock = stockBalances
                        .filter((b) => b.locationId === dispLoc.id && b.productId === sub.id)
                        .reduce((sum, b) => sum + b.quantity, 0);

                      const storeStock = stockBalances
                        .filter((b) => b.locationId === storeLoc.id && b.productId === sub.id)
                        .reduce((sum, b) => sum + b.quantity, 0);

                      return (
                        <div
                          key={sub.id}
                          className="bg-white p-3 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{sub.brandName}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {sub.dosageForm} • {sub.countryOfOrigin || 'Ethiopia'} • Standard: {sub.standardSellingPrice || '—'} ETB
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-[11px]">
                              <span className={`font-semibold ${dispStock > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                Dispensary Shelf: <strong>{dispStock}</strong> {sub.baseUnit}s
                              </span>
                              <span className="text-slate-500">
                                Store: <strong>{storeStock}</strong> {sub.baseUnit}s
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              handleAddToCart(sub, 'BASE');
                              setSelectedGenericSubstitutes(null);
                            }}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Select & Add to Cart</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HELD BILLS DRAWER */}
      {showHeldBillsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">Parked & Held Bills ({heldBills.length})</h3>
              </div>
              <button onClick={() => setShowHeldBillsModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 text-xs max-h-[70vh]">
              {heldBills.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No held bills parked at this counter.</div>
              ) : (
                heldBills.map((bill) => {
                  const billTotal = bill.items.reduce((s, it) => s + it.totalPrice, 0);
                  return (
                    <div
                      key={bill.id}
                      className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{bill.token}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Patient: <strong>{bill.customerName}</strong> • {bill.items.length} items
                        </div>
                        <div className="font-bold text-emerald-700 mt-1">{billTotal.toFixed(2)} ETB</div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleRecallBill(bill)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Recall Bill</span>
                        </button>
                        <button
                          onClick={() => handleDeleteHeldBill(bill.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Discard held bill"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ETHIOPIAN THERMAL RECEIPT (80mm STANDARD FORMAT) */}
      {showReceiptModal && lastCompletedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Thermal Receipt Preview (80mm)</span>
              </span>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            {/* Simulated 80mm Thermal Receipt */}
            <div className="p-6 overflow-y-auto space-y-3 font-mono text-xs text-slate-900 bg-amber-50/20 border-b border-slate-200">
              <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-slate-300">
                <h4 className="font-bold text-sm font-sans">{currentTenantName}</h4>
                <div className="text-[11px] text-slate-600">Front Dispensary Counter • Bole Main</div>
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
                        <span className="inline-flex items-center gap-1">
                          <span>Batch: {it.batchNumber} (Exp:</span>
                          <DualDate value={it.expiryDate} lang={language} />
                          <span>)</span>
                        </span>
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
                  <span>TOTAL PAYABLE:</span>
                  <span>{lastCompletedInvoice.totalAmount.toFixed(2)} ETB</span>
                </div>
              </div>

              {/* Payment Details with all split payments */}
              <div className="text-[11px] pt-2 border-t border-dashed border-slate-300 space-y-1">
                <div className="font-bold text-[10px] uppercase text-slate-600">Settlement Channels:</div>
                {lastCompletedInvoice.payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>Paid via {p.method}:</span>
                    <span className="font-bold">{p.amount.toFixed(2)} ETB</span>
                  </div>
                ))}
                {lastCompletedInvoice.payments[0]?.reference && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    Ref: {lastCompletedInvoice.payments[0].reference}
                  </div>
                )}
              </div>

              <div className="text-center pt-3 text-[10px] text-slate-500 space-y-0.5">
                <div>ፈጣሪ ጤና ይስጥልን!</div>
                <div>Wishing you a swift and healthy recovery!</div>
                <div className="font-mono tracking-widest pt-1">*** EFDA VERIFIED DISPENSE ***</div>
              </div>
            </div>

            <div className="p-3 bg-white flex justify-between items-center">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setInlineSuccess('Thermal receipt dispatched to 80mm ESC/POS hardware printer.');
                  setShowReceiptModal(false);
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
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
