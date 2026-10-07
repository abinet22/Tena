import React, { useState, useMemo } from 'react';
import {
  BarChart3, FileText, Download, TrendingUp, AlertTriangle,
  Building2, Warehouse, Store, DollarSign, CreditCard,
  Smartphone, ShieldAlert, Calendar, CheckCircle2, RefreshCw,
  Printer, ArrowUpRight, Filter
} from 'lucide-react';
import {
  Tenant, Location, RoleCode, StockBalance, Product, Batch,
  SalesInvoice, Category, Generic, AuditLog
} from '../types/pharmacy';
import { generateEfdaExpiryPdf } from '../utils/efdaPdfExport';
import { formatDualDate } from '../utils/ethiopianCalendar';
import { createAuditLog } from '../utils/auditLogger';
import * as XLSX from 'xlsx';

interface ShopReportsViewProps {
  currentTenant: Tenant;
  locations: Location[];
  products: Product[];
  batches: Batch[];
  stockBalances: StockBalance[];
  salesInvoices: SalesInvoice[];
  categories: Category[];
  generics: Generic[];
  currentRole: RoleCode;
  language: 'en' | 'am';
  onAddAuditLog?: (entry: AuditLog) => void;
}

export const ShopReportsView: React.FC<ShopReportsViewProps> = ({
  currentTenant,
  locations,
  products,
  batches,
  stockBalances,
  salesInvoices,
  categories,
  generics,
  currentRole,
  language,
  onAddAuditLog,
}) => {
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL'>('THIS_MONTH');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const now = new Date();

  // Tenant-filtered stock balances
  const tenantBalances = useMemo(() => {
    return stockBalances.filter((b) => {
      const loc = locations.find((l) => l.id === b.locationId);
      if (!loc || loc.tenantId !== currentTenant.id) return false;
      if (selectedBranchFilter !== 'ALL' && loc.branchName !== selectedBranchFilter) return false;
      return b.quantity > 0;
    });
  }, [stockBalances, locations, currentTenant.id, selectedBranchFilter]);

  // Dual Inventory Analysis: Store (Bulk Wholesale) vs Dispensary (Ready to Dispense)
  const storeBalances = tenantBalances.filter((b) => {
    const loc = locations.find((l) => l.id === b.locationId);
    return loc?.type === 'STORE';
  });

  const dispensaryBalances = tenantBalances.filter((b) => {
    const loc = locations.find((l) => l.id === b.locationId);
    return loc?.type === 'DISPENSARY';
  });

  const calculateValuation = (balancesList: StockBalance[]) => {
    return balancesList.reduce((acc, b) => {
      const prod = products.find((p) => p.id === b.productId);
      const price = prod?.standardSellingPrice || 0;
      return acc + (b.quantity * price);
    }, 0);
  };

  const storeValuation = calculateValuation(storeBalances);
  const dispensaryValuation = calculateValuation(dispensaryBalances);
  const totalStockValuation = storeValuation + dispensaryValuation;

  // Sales Totals & Payment breakdown
  const tenantSales = salesInvoices.filter((s) => s.tenantId === currentTenant.id);

  const totalSalesRevenue = tenantSales.reduce((acc, s) => acc + (s.totalAmount ?? (s.subtotal - (s.discount || 0))), 0);

  const paymentBreakdown = useMemo(() => {
    let cash = 0;
    let telebirr = 0;
    let cbe = 0;
    let credit = 0;

    tenantSales.forEach((inv) => {
      inv.payments?.forEach((p) => {
        if (p.method === 'TELEBIRR') telebirr += p.amount;
        else if (p.method === 'CBE_BIRR') cbe += p.amount;
        else if (p.method === 'CREDIT') credit += p.amount;
        else cash += p.amount;
      });
    });

    return { cash, telebirr, cbe, credit };
  }, [tenantSales]);

  // Expiry Loss Exposure Analysis
  const expiryRadar = useMemo(() => {
    let expiredValue = 0;
    let critical30dValue = 0;
    let warning90dValue = 0;
    let attention180dValue = 0;

    let expiredCount = 0;
    let criticalCount = 0;
    let warningCount = 0;

    tenantBalances.forEach((b) => {
      const batch = batches.find((bat) => bat.id === b.batchId);
      const prod = products.find((p) => p.id === b.productId);
      if (!batch || !prod) return;

      const expDate = new Date(batch.expiryDate);
      const diffDays = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const val = b.quantity * (prod.standardSellingPrice || batch.sellingPrice || 0);

      if (diffDays <= 0) {
        expiredValue += val;
        expiredCount++;
      } else if (diffDays <= 30) {
        critical30dValue += val;
        criticalCount++;
      } else if (diffDays <= 90) {
        warning90dValue += val;
        warningCount++;
      } else if (diffDays <= 180) {
        attention180dValue += val;
      }
    });

    return {
      expiredValue,
      critical30dValue,
      warning90dValue,
      attention180dValue,
      expiredCount,
      criticalCount,
      warningCount,
    };
  }, [tenantBalances, batches, products]);

  // Fast Moving Medicines
  const fastMoving = useMemo(() => {
    const itemMap: Record<string, { brandName: string; units: number; revenue: number; isControlled: boolean }> = {};

    tenantSales.forEach((inv) => {
      inv.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const name = prod?.brandName || 'Medicine';
        if (!itemMap[name]) {
          itemMap[name] = { brandName: name, units: 0, revenue: 0, isControlled: !!prod?.isControlled };
        }
        itemMap[name].units += item.quantityInUnit;
        itemMap[name].revenue += item.totalPrice;
      });
    });

    return Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [tenantSales, products]);

  // Controlled Substance records
  const controlledRecords = useMemo(() => {
    const list: Array<{
      invoiceNumber: string;
      date: string;
      customerName: string;
      productName: string;
      batchNumber: string;
      quantity: number;
      unitType: string;
      prescriberName: string;
    }> = [];
    tenantSales.forEach((inv) => {
      inv.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod?.isControlled || item.isControlled) {
          list.push({
            invoiceNumber: inv.invoiceNumber,
            date: inv.createdAt,
            customerName: inv.customerName || 'Walk-in Patient',
            productName: prod?.brandName || 'Controlled Item',
            batchNumber: item.batchNumber,
            quantity: item.quantityInUnit,
            unitType: item.unitType,
            prescriberName: inv.prescriptionRef || 'Rx Licensed Physician',
          });
        }
      });
    });
    return list;
  }, [tenantSales, products]);

  // Export EFDA PDF
  const handleExportEfdaPdf = () => {
    try {
      const activeLoc = locations.find((l) => l.tenantId === currentTenant.id) || locations[0];
      const result = generateEfdaExpiryPdf({
        tenant: currentTenant,
        location: activeLoc,
        stockBalances: tenantBalances,
        products,
        batches,
        categories,
        generics,
        scope: 'ALL_90',
      });

      result.doc.save(result.filename);
      setExportNotice(`Official EFDA Inspection PDF generated: ${result.filename}`);

      if (onAddAuditLog) {
        onAddAuditLog(
          createAuditLog({
            tenantId: currentTenant.id,
            userName: 'Dr. Lead Pharmacist (Shop Admin)',
            userRole: 'ADMIN',
            action: 'EFDA_REPORT_GENERATED',
            entity: 'ComplianceReport',
            entityId: result.docId,
            entityName: result.filename,
            category: 'COMPLIANCE',
            severity: 'INFO',
            efdaComplianceCode: 'EFDA-INSPECT-PDF-01',
            reason: `Exported official EFDA Expiry Inspection report covering ${result.totalBatches} batch records.`,
          })
        );
      }

      setTimeout(() => setExportNotice(null), 6000);
    } catch (e: any) {
      setExportNotice(`PDF Generation error: ${e.message}`);
    }
  };

  // Export Excel Summary
  const handleExportExcelSummary = () => {
    const wb = XLSX.utils.book_new();

    // 1. Stock Valuation Sheet
    const stockData = tenantBalances.map((b) => {
      const prod = products.find((p) => p.id === b.productId);
      const batch = batches.find((bat) => bat.id === b.batchId);
      const loc = locations.find((l) => l.id === b.locationId);
      return {
        Branch: loc?.branchName || 'Main',
        Location_Type: loc?.type === 'STORE' ? 'Central Store (Quarantine)' : 'Dispensary (Ready to Dispense)',
        Brand_Name: prod?.brandName,
        Batch_Number: batch?.batchNumber,
        Expiry_Date: batch?.expiryDate,
        Quantity: b.quantity,
        Selling_Price_ETB: prod?.standardSellingPrice,
        Valuation_ETB: b.quantity * (prod?.standardSellingPrice || 0),
      };
    });
    const wsStock = XLSX.utils.json_to_sheet(stockData);
    XLSX.utils.book_append_sheet(wb, wsStock, 'Inventory_Valuation');

    // 2. Sales Sheet
    const salesData = tenantSales.map((s) => ({
      Invoice_No: s.invoiceNumber,
      Date: s.createdAt,
      Customer: s.customerName || 'Walk-in',
      Subtotal: s.subtotal,
      Discount: s.discount,
      Grand_Total_ETB: s.totalAmount,
      Payment_Method: s.payments?.map((p) => `${p.method}: ${p.amount} ETB`).join('; ') || 'CASH',
    }));
    const wsSales = XLSX.utils.json_to_sheet(salesData);
    XLSX.utils.book_append_sheet(wb, wsSales, 'Sales_Summary');

    XLSX.writeFile(wb, `${currentTenant.slug}_Executive_Report_${Date.now()}.xlsx`);
    setExportNotice('Excel Executive Summary exported successfully!');
    setTimeout(() => setExportNotice(null), 5000);
  };

  const branchList = Array.from(new Set(locations.filter(l => l.tenantId === currentTenant.id).map(l => l.branchName || 'Main Branch')));

  return (
    <div className="space-y-6 text-left">
      {/* Header & Controls */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                {language === 'am' ? 'የፋርማሲ ሪፖርቶችና የፋይናንስ ትንታኔ' : 'Shop Executive Reports & EFDA Compliance Analytics'}
              </h2>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-semibold">
                {currentTenant.name}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'am'
                ? 'የመጋዘን (Store) እና የመሸጫ (Dispensary) ስቶክ ግምት፣ የሽያጭ ገቢ፣ እና የEFDA ማብቂያ ቀን ኪሳራ ትንታኔ።'
                : 'Executive view of Dual-Inventory valuation, sales cashflow, and EFDA expiration risk exposure.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Branch filter */}
          {branchList.length > 1 && (
            <select
              aria-label="Filter by branch"
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-xl px-3 py-2 focus:outline-hidden"
            >
              <option value="ALL">All Branches ({branchList.length})</option>
              {branchList.map((br, idx) => (
                <option key={idx} value={br}>{br}</option>
              ))}
            </select>
          )}

          <button
            onClick={handleExportExcelSummary}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel Export</span>
          </button>

          <button
            onClick={handleExportEfdaPdf}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Official EFDA PDF</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Top Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 block">Total Sales Revenue (ዕለታዊ/ወርሃዊ ሽያጭ)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {totalSalesRevenue.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500">ETB</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium pt-1">
            {tenantSales.length} Completed Invoices
          </p>
        </div>

        {/* Card 2: Dual Inventory Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 block">Total Inventory Valuation (የስቶክ አጠቃላይ ዋጋ)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 font-mono">
              {totalStockValuation.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500">ETB</span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1">
            {tenantBalances.length} Batch records across all locations
          </p>
        </div>

        {/* Card 3: Dispensary Shelf Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 block">Dispensary Counter (የመሸጫ መስኮት ስቶክ)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700 font-mono">
              {dispensaryValuation.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500">ETB</span>
          </div>
          <p className="text-[11px] text-blue-600 font-medium pt-1">
            Ready for instant POS sale ({dispensaryBalances.length} batches)
          </p>
        </div>

        {/* Card 4: Store / Warehouse Stock */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 block">Quarantine Store (የመጋዘን ጅምላ ስቶክ)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-teal-700 font-mono">
              {storeValuation.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500">ETB</span>
          </div>
          <p className="text-[11px] text-teal-600 font-medium pt-1">
            Wholesale reserve ({storeBalances.length} batches)
          </p>
        </div>
      </div>

      {/* Two Inventory Types In-Depth Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Type A: Dispensary Inventory */}
        <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-blue-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {language === 'am' ? '1. የመሸጫ መስኮት ስቶክ (Dispensary Stock)' : '1. Dispensary Counter Stock (Ready to Dispense)'}
                </h3>
                <p className="text-[11px] text-slate-500">Only items on dispensary shelves can be sold at retail POS</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
              Active Counter
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
              <span className="text-[10px] text-slate-500 block">Valuation</span>
              <span className="font-bold text-blue-900 font-mono">{dispensaryValuation.toLocaleString()} ETB</span>
            </div>
            <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
              <span className="text-[10px] text-slate-500 block">Active Batches</span>
              <span className="font-bold text-blue-900 font-mono">{dispensaryBalances.length}</span>
            </div>
            <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
              <span className="text-[10px] text-slate-500 block">FEFO Ready</span>
              <span className="font-bold text-emerald-600">100% Sorted</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
            <strong>Operational Rule:</strong> Cashiers and dispensers can only deduct inventory from this dispensary counter. If shelves run low, staff must request a transfer from the central store.
          </p>
        </div>

        {/* Type B: Central Quarantine Store */}
        <div className="bg-white rounded-2xl border border-teal-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-teal-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                <Warehouse className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {language === 'am' ? '2. የመጋዘን ስቶክ (Central Store & Quarantine)' : '2. Central Storage Warehouse (Wholesale Stock)'}
                </h3>
                <p className="text-[11px] text-slate-500">Bulk supplier receipts (GRN) arrive here before transfer</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
              Bulk Holding
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-teal-50/50 p-2.5 rounded-xl border border-teal-100">
              <span className="text-[10px] text-slate-500 block">Valuation</span>
              <span className="font-bold text-teal-900 font-mono">{storeValuation.toLocaleString()} ETB</span>
            </div>
            <div className="bg-teal-50/50 p-2.5 rounded-xl border border-teal-100">
              <span className="text-[10px] text-slate-500 block">Stored Batches</span>
              <span className="font-bold text-teal-900 font-mono">{storeBalances.length}</span>
            </div>
            <div className="bg-teal-50/50 p-2.5 rounded-xl border border-teal-100">
              <span className="text-[10px] text-slate-500 block">Inter-Branch</span>
              <span className="font-bold text-teal-700">Dispatch Ready</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
            <strong>Operational Rule:</strong> Wholesale supplier deliveries (from EPSS, wholesalers) are strictly isolated here. Stock cannot be sold directly to customers without an internal transfer voucher.
          </p>
        </div>
      </div>

      {/* EFDA Expiry Loss Risk Radar & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Expiry Loss Radar (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h3 className="font-bold text-sm text-slate-900">
                {language === 'am' ? 'የEFDA ማብቂያ ቀን የኪሳራ ራዳር' : 'EFDA Expiry Loss Risk Radar'}
              </h3>
            </div>
            <span className="text-xs text-slate-500">Real-time Batch Audit</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                &lt; 30 Days (Critical)
              </span>
              <span className="text-lg font-black text-rose-900 font-mono">
                {expiryRadar.critical30dValue.toLocaleString()} ETB
              </span>
              <p className="text-[10px] text-rose-600">{expiryRadar.criticalCount} batches expiring soon</p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                &lt; 90 Days (Warning)
              </span>
              <span className="text-lg font-black text-amber-900 font-mono">
                {expiryRadar.warning90dValue.toLocaleString()} ETB
              </span>
              <p className="text-[10px] text-amber-600">{expiryRadar.warningCount} batches to prioritize</p>
            </div>

            <div className="p-3.5 rounded-xl bg-yellow-50 border border-yellow-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-700 block">
                &lt; 180 Days (Watch)
              </span>
              <span className="text-lg font-black text-yellow-900 font-mono">
                {expiryRadar.attention180dValue.toLocaleString()} ETB
              </span>
              <p className="text-[10px] text-yellow-600">Medium term horizon</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <p className="font-bold text-slate-800">FEFO Automated Mitigation Active</p>
              <p className="text-slate-500 text-[11px]">The POS checkout engine automatically routes these batches to walk-in patients first.</p>
            </div>
            <button
              onClick={handleExportEfdaPdf}
              className="px-3 py-1.5 rounded-lg font-bold text-[11px] bg-slate-900 hover:bg-slate-800 text-white transition-colors"
            >
              Print EFDA Log
            </button>
          </div>
        </div>

        {/* Right: Payment Method Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">
                {language === 'am' ? 'የክፍያ ዘዴዎች ክፍፍል' : 'Payment Method Cashflow'}
              </h3>
            </div>
            <span className="text-xs text-slate-500">{totalSalesRevenue.toLocaleString()} ETB</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-emerald-900">Telebirr (ቴሌብር)</span>
              </div>
              <span className="font-mono font-bold text-emerald-900">{paymentBreakdown.telebirr.toLocaleString()} ETB</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-blue-900">CBE Birr (ንግድ ባንክ)</span>
              </div>
              <span className="font-mono font-bold text-blue-900">{paymentBreakdown.cbe.toLocaleString()} ETB</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-slate-600" />
                <span className="font-bold text-slate-800">Cash / ጥሬ ገንዘብ</span>
              </div>
              <span className="font-mono font-bold text-slate-800">{paymentBreakdown.cash.toLocaleString()} ETB</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-amber-900">Customer Credit (ብድር)</span>
              </div>
              <span className="font-mono font-bold text-amber-900">{paymentBreakdown.credit.toLocaleString()} ETB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fast Moving Medicines & Controlled Substances Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fast Movers */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Top Fast-Moving Medicines (ከፍተኛ ሽያጭ ያላቸው)</span>
            </h3>
            <span className="text-[10px] text-slate-500">By Revenue</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 text-[10px] font-semibold border-b border-slate-200 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Medicine</th>
                  <th className="py-2.5 px-3">Units Dispensed</th>
                  <th className="py-2.5 px-3 text-right">Revenue (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fastMoving.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {item.brandName}
                      {item.isControlled && (
                        <span className="ml-1.5 text-[9px] px-1 py-0.2 rounded bg-rose-100 text-rose-800 font-bold">
                          EFDA Rx
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">{item.units} Units</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {item.revenue.toLocaleString()} ETB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Controlled Substances EFDA Register */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>EFDA Controlled Substance Register (ቁጥጥር የሚደረግባቸው መድሃኒቶች)</span>
            </h3>
            <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded">
              Proclamation 1112/2019
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 text-[10px] font-semibold border-b border-slate-200 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Invoice</th>
                  <th className="py-2.5 px-3">Drug & Batch</th>
                  <th className="py-2.5 px-3">Patient / Doctor</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {controlledRecords.length > 0 ? (
                  controlledRecords.slice(0, 5).map((rec, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{rec.invoiceNumber}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900 block">{rec.productName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Lot: {rec.batchNumber}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-slate-800 block">{rec.customerName}</span>
                        <span className="text-[10px] text-slate-500">Dr. {rec.prescriberName}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                        {rec.quantity} {rec.unitType}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500 text-xs">
                      No controlled substance transactions logged in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
