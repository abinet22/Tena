import React, { useState } from 'react';
import {
  ShieldCheck, Database, Calendar, Users, MapPin, Pill,
  CheckCircle2, ArrowRight, Sparkles, Building2, Lock, Cpu,
  AlertTriangle, ArrowRightLeft, ShoppingCart, Truck, TrendingDown,
  Warehouse, Store, Check, Info, BellRing, Clock, ShieldAlert,
  AlertOctagon, Hourglass, Trash2, Tag, DollarSign, TrendingUp, BarChart3,
  FileDown, FileText, Printer, Download, ExternalLink, X, CheckSquare
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine, Legend
} from 'recharts';
import {
  Tenant, Product, Location, RoleCode, StockBalance,
  Category, Generic, Batch, SalesInvoice, Manufacturer, Supplier, AuditLog
} from '../types/pharmacy';
import { formatDualDate } from '../utils/ethiopianCalendar';
import { formatBaseQuantityInUnits } from '../utils/stockEngine';
import { generateEfdaExpiryPdf, formatDualDateAscii } from '../utils/efdaPdfExport';
import { createAuditLog } from '../utils/auditLogger';

interface OverviewViewProps {
  currentTenant: Tenant;
  currentLocation: Location;
  onSelectLocation?: (loc: Location) => void;
  products: Product[];
  batches?: Batch[];
  locations: Location[];
  stockBalances: StockBalance[];
  categories: Category[];
  generics?: Generic[];
  manufacturers?: Manufacturer[];
  suppliers?: Supplier[];
  salesInvoices?: SalesInvoice[];
  currentRole: RoleCode;
  language: 'en' | 'am';
  onNavigateTab: (tabId: string) => void;
  onOpenSuperAdmin: () => void;
  onAddAuditLog?: (entry: AuditLog) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  currentTenant,
  currentLocation,
  onSelectLocation,
  products,
  batches = [],
  locations,
  stockBalances,
  categories,
  generics = [],
  manufacturers = [],
  suppliers = [],
  salesInvoices = [],
  currentRole,
  language,
  onNavigateTab,
  onOpenSuperAdmin,
  onAddAuditLog,
}) => {
  const [reorderFilter, setReorderFilter] = useState<'AT_RISK' | 'BELOW' | 'NEARING' | 'ALL'>('AT_RISK');
  const [expiryFilter, setExpiryFilter] = useState<'ALL_90' | 'CRITICAL_30' | 'WARNING_60' | 'ATTENTION_90' | 'EXPIRED'>('ALL_90');

  // ------------------------------------------------------------------
  // EFDA Regulatory PDF Export State & Handlers
  // ------------------------------------------------------------------
  const [isEfdaPdfModalOpen, setIsEfdaPdfModalOpen] = useState(false);
  const [pdfScope, setPdfScope] = useState<'ALL_90' | 'CRITICAL_30' | 'WARNING_60' | 'ATTENTION_90' | 'EXPIRED'>('ALL_90');
  const [pdfLocationScope, setPdfLocationScope] = useState<'CURRENT' | 'ALL'>('CURRENT');
  const [pdfSignatoryName, setPdfSignatoryName] = useState('Rahel Tadesse');
  const [pdfSignatoryTitle, setPdfSignatoryTitle] = useState('Technical Director / Registered Pharmacist');
  const [pdfReportNotes, setPdfReportNotes] = useState(
    'Quarterly EFDA regulatory expiry audit conducted pursuant to EFDA Health Facility Standards and Directive No. 981/2023. Expired medicines segregated into locked quarantine pending authorized disposal.'
  );
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  const currentDate = new Date();
  const dualDate = formatDualDate(currentDate, language);
  const medicineCount = products.filter((p) => p.productType === 'MEDICINE').length;
  const generalCount = products.filter((p) => p.productType === 'GENERAL').length;
  const controlledCount = products.filter((p) => p.isControlled).length;

  // ------------------------------------------------------------------
  // Location-Aware Reorder Stock Calculation
  // ------------------------------------------------------------------
  const otherLocations = locations.filter((l) => l.id !== currentLocation.id);
  const storeLocation = locations.find((l) => l.type === 'STORE') || locations[0];

  const productStockStatus = products.map((prod) => {
    // Current location stock
    const currentLocStock = stockBalances
      .filter((b) => b.locationId === currentLocation.id && b.productId === prod.id)
      .reduce((sum, b) => sum + b.quantity, 0);

    // Stock in other locations (for transfer recommendations)
    const otherLocStock = stockBalances
      .filter((b) => b.locationId !== currentLocation.id && b.productId === prod.id)
      .reduce((sum, b) => sum + b.quantity, 0);

    const reorderLevel = prod.reorderLevel || 50;
    const isBelow = currentLocStock <= reorderLevel;
    const isNearing = currentLocStock > reorderLevel && currentLocStock <= Math.round(reorderLevel * 1.5);
    const ratio = reorderLevel > 0 ? (currentLocStock / reorderLevel) * 100 : 100;
    const deficit = reorderLevel - currentLocStock;

    return {
      product: prod,
      currentLocStock,
      otherLocStock,
      reorderLevel,
      isBelow,
      isNearing,
      isAtRisk: isBelow || isNearing,
      ratio: Math.min(100, Math.round(ratio)),
      deficit,
      formattedUnits: formatBaseQuantityInUnits(prod, currentLocStock),
    };
  });

  const belowCount = productStockStatus.filter((item) => item.isBelow).length;
  const nearingCount = productStockStatus.filter((item) => item.isNearing).length;
  const totalAtRiskCount = belowCount + nearingCount;

  // Filtered items for the Reorder Monitor table
  const displayedReorderItems = productStockStatus.filter((item) => {
    if (reorderFilter === 'AT_RISK') return item.isAtRisk;
    if (reorderFilter === 'BELOW') return item.isBelow;
    if (reorderFilter === 'NEARING') return item.isNearing;
    return true;
  });

  // ------------------------------------------------------------------
  // EFDA Expiry & Near-Expiration Batches Monitor (Next 90 Days)
  // ------------------------------------------------------------------
  const expiringBatches = batches
    .map((batch) => {
      const prod = products.find((p) => p.id === batch.productId);
      const cat = prod ? categories.find((c) => c.id === prod.categoryId) : undefined;
      // If category specifically exempts expiry tracking (e.g. diapers), skip
      if (cat && !cat.trackExpiry) return null;

      const expDate = new Date(batch.expiryDate);
      const diffTime = expDate.getTime() - currentDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Calculate physical stock for this batch across all locations & active location
      const totalBatchStock = stockBalances
        .filter((b) => b.batchId === batch.id)
        .reduce((sum, b) => sum + b.quantity, 0);

      const currentLocStock = stockBalances
        .filter((b) => b.batchId === batch.id && b.locationId === currentLocation.id)
        .reduce((sum, b) => sum + b.quantity, 0);

      // Only evaluate if stock > 0
      if (totalBatchStock <= 0) return null;

      // Classify into EFDA Regulatory Risk Tiers
      let tier: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'ATTENTION' | 'HEALTHY' = 'HEALTHY';
      if (diffDays <= 0) tier = 'EXPIRED';
      else if (diffDays <= 30) tier = 'CRITICAL';
      else if (diffDays <= 60) tier = 'WARNING';
      else if (diffDays <= 90) tier = 'ATTENTION';

      const isWithin90Days = diffDays <= 90;
      const unitValuation = Number(batch.sellingPrice || batch.costPrice || 0);
      const totalValueAtRisk = totalBatchStock * unitValuation;

      return {
        batch,
        product: prod,
        category: cat,
        diffDays,
        tier,
        isWithin90Days,
        totalBatchStock,
        currentLocStock,
        totalValueAtRisk,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null && item.isWithin90Days)
    .sort((a, b) => a.diffDays - b.diffDays); // FEFO order (earliest expiry first)

  const expiredCount = expiringBatches.filter((b) => b.tier === 'EXPIRED').length;
  const criticalCount = expiringBatches.filter((b) => b.tier === 'CRITICAL').length;
  const warningCount = expiringBatches.filter((b) => b.tier === 'WARNING').length;
  const attentionCount = expiringBatches.filter((b) => b.tier === 'ATTENTION').length;
  const totalExpiringCount = expiringBatches.length;
  const totalRiskValuation = expiringBatches.reduce((acc, b) => acc + b.totalValueAtRisk, 0);

  // Filtered batches for the Expiry Monitor
  const displayedExpiringBatches = expiringBatches.filter((item) => {
    if (expiryFilter === 'CRITICAL_30') return item.tier === 'CRITICAL';
    if (expiryFilter === 'WARNING_60') return item.tier === 'WARNING';
    if (expiryFilter === 'ATTENTION_90') return item.tier === 'ATTENTION';
    if (expiryFilter === 'EXPIRED') return item.tier === 'EXPIRED';
    return true; // ALL_90
  });

  // Batches matching the PDF Modal's selected scope and location scope
  const modalMatchingBatches = batches
    .map((batch) => {
      const prod = products.find((p) => p.id === batch.productId);
      const cat = prod ? categories.find((c) => c.id === prod.categoryId) : undefined;
      if (cat && !cat.trackExpiry) return null;

      const expDate = new Date(batch.expiryDate);
      const diffTime = expDate.getTime() - currentDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const balances = stockBalances.filter((b) => {
        if (b.batchId !== batch.id) return false;
        if (pdfLocationScope === 'CURRENT') return b.locationId === currentLocation.id;
        return true;
      });

      const totalQty = balances.reduce((sum, b) => sum + b.quantity, 0);
      if (totalQty <= 0) return null;

      let tier: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'ATTENTION' | 'HEALTHY' = 'HEALTHY';
      if (diffDays <= 0) tier = 'EXPIRED';
      else if (diffDays <= 30) tier = 'CRITICAL';
      else if (diffDays <= 60) tier = 'WARNING';
      else if (diffDays <= 90) tier = 'ATTENTION';

      if (diffDays > 90) return null;

      const unitVal = Number(batch.sellingPrice || batch.costPrice || 0);
      return {
        batch,
        product: prod,
        category: cat,
        diffDays,
        tier,
        totalQty,
        totalVal: totalQty * unitVal,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .filter((item) => {
      if (pdfScope === 'CRITICAL_30') return item.tier === 'CRITICAL';
      if (pdfScope === 'WARNING_60') return item.tier === 'WARNING';
      if (pdfScope === 'ATTENTION_90') return item.tier === 'ATTENTION';
      if (pdfScope === 'EXPIRED') return item.tier === 'EXPIRED';
      return true; // ALL_90
    });

  const modalMatchingCount = modalMatchingBatches.length;
  const modalExpiredCount = modalMatchingBatches.filter((b) => b.tier === 'EXPIRED').length;
  const modalCriticalCount = modalMatchingBatches.filter((b) => b.tier === 'CRITICAL').length;
  const modalTotalValuation = modalMatchingBatches.reduce((acc, b) => acc + b.totalVal, 0);

  const handleDownloadEfdaPdf = (previewOnly: boolean = false) => {
    setIsExportingPdf(true);
    try {
      const result = generateEfdaExpiryPdf({
        tenant: currentTenant,
        location: currentLocation,
        locations,
        products,
        batches,
        stockBalances,
        categories,
        generics,
        manufacturers,
        suppliers,
        scope: pdfScope,
        locationScope: pdfLocationScope,
        signatoryName: pdfSignatoryName,
        signatoryTitle: pdfSignatoryTitle,
        reportNotes: pdfReportNotes,
      });

      if (previewOnly) {
        const blobUrl = result.doc.output('bloburl');
        window.open(blobUrl, '_blank');
        setExportSuccessMessage(`EFDA Inspection PDF preview opened in a new browser tab (${result.totalBatches} batch records).`);
      } else {
        result.doc.save(result.filename);
        setExportSuccessMessage(`Downloaded official EFDA report: ${result.filename} (${result.totalBatches} batch records, ${result.totalValuation.toLocaleString()} ETB).`);
      }

      if (onAddAuditLog) {
        onAddAuditLog(
          createAuditLog({
            tenantId: currentTenant.id,
            userName: pdfSignatoryName || 'Technical Director',
            userRole: pdfSignatoryTitle || 'Responsible Pharmacist',
            action: 'EFDA_REPORT_EXPORT',
            entity: 'ComplianceReport',
            entityId: result.docId,
            entityName: `EFDA Directive No. 981/2023 Expiry Regulatory Report PDF`,
            category: 'COMPLIANCE',
            severity: 'INFO',
            locationId: currentLocation.id,
            locationName: currentLocation.name,
            efdaComplianceCode: 'EFDA-DIR-981/2023-REPORT',
            reason: `Exported official EFDA landscape inspection PDF (${result.totalBatches} batches expiring <= 90d, ${result.totalValuation.toLocaleString()} ETB valuation at risk). Notes: ${pdfReportNotes || 'Routine compliance check manifest'}.`,
            newValues: {
              format: 'PDF',
              documentId: result.docId,
              batchesAudited: result.totalBatches,
              totalValuation: result.totalValuation,
              scope: pdfScope,
            },
          })
        );
      }

      setTimeout(() => {
        setExportSuccessMessage(null);
      }, 7000);
    } catch (err: any) {
      console.error('PDF export error:', err);
      alert('Error generating EFDA PDF: ' + (err?.message || String(err)));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleQuickExportCurrentView = () => {
    try {
      const result = generateEfdaExpiryPdf({
        tenant: currentTenant,
        location: currentLocation,
        locations,
        products,
        batches,
        stockBalances,
        categories,
        generics,
        manufacturers,
        suppliers,
        scope: expiryFilter,
        locationScope: 'CURRENT',
        signatoryName: currentRole === 'ADMIN' ? 'Head Pharmacist & Admin' : 'Responsible Pharmacist',
        signatoryTitle: `${currentRole.replace('_', ' ')} • EFDA Licensee`,
        reportNotes: `Quick export for ${currentLocation.name} (${expiryFilter.replace('_', ' ')} window).`,
      });

      result.doc.save(result.filename);
      setExportSuccessMessage(`Downloaded ${result.filename} (${result.totalBatches} records, ${result.totalValuation.toLocaleString()} ETB).`);
      setTimeout(() => setExportSuccessMessage(null), 7000);
    } catch (err: any) {
      console.error('Quick PDF export error:', err);
      alert('Error generating PDF: ' + (err?.message || String(err)));
    }
  };

  // ------------------------------------------------------------------
  // 7-Day Sales Revenue Trend Calculation for Current Location (Recharts)
  // ------------------------------------------------------------------
  const [salesMetricView, setSalesMetricView] = useState<'REVENUE' | 'ORDERS' | 'COMBINED'>('REVENUE');

  // Compute 7 consecutive calendar days ending today (currentDate)
  const last7DaysData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - (6 - i));
    const dateKey = d.toISOString().split('T')[0]; // 'YYYY-MM-DD'

    // Formatted labels
    const dayName = d.toLocaleDateString(language === 'am' ? 'am-ET' : 'en-US', { weekday: 'short' });
    const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fullDateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    // Ethiopian Dual Date conversion
    const dualStr = formatDualDate(d, language);
    const ethiopianDateOnly = dualStr.includes('(') ? dualStr.split('(')[1].replace(')', '').trim() : dualStr;

    // Filter completed invoices strictly matching this specific calendar day AND current location
    const matchingInvoices = salesInvoices.filter((inv) => {
      if (inv.locationId !== currentLocation.id) return false;
      if (inv.status === 'RETURNED') return false;
      const invDateKey = (inv.createdAt || '').split('T')[0];
      return invDateKey === dateKey;
    });

    const dailyRevenue = matchingInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
    const ordersCount = matchingInvoices.length;

    // Payment channel breakdown for this day
    let cashAmount = 0;
    let telebirrAmount = 0;
    let cbeBirrAmount = 0;
    let creditAmount = 0;

    matchingInvoices.forEach((inv) => {
      inv.payments?.forEach((p) => {
        if (p.method === 'CASH') cashAmount += Number(p.amount) || 0;
        else if (p.method === 'TELEBIRR') telebirrAmount += Number(p.amount) || 0;
        else if (p.method === 'CBE_BIRR') cbeBirrAmount += Number(p.amount) || 0;
        else if (p.method === 'CREDIT') creditAmount += Number(p.amount) || 0;
      });
    });

    return {
      dateKey,
      dayName,
      displayDate,
      fullDateStr,
      ethiopianDate: ethiopianDateOnly,
      revenue: Math.round(dailyRevenue * 100) / 100,
      ordersCount,
      cashAmount: Math.round(cashAmount * 100) / 100,
      telebirrAmount: Math.round(telebirrAmount * 100) / 100,
      cbeBirrAmount: Math.round(cbeBirrAmount * 100) / 100,
      creditAmount: Math.round(creditAmount * 100) / 100,
    };
  });

  const total7DayRevenue = last7DaysData.reduce((acc, d) => acc + d.revenue, 0);
  const total7DayOrders = last7DaysData.reduce((acc, d) => acc + d.ordersCount, 0);
  const averageDailyRevenue = Math.round(total7DayRevenue / 7);
  const peakDay = [...last7DaysData].sort((a, b) => b.revenue - a.revenue)[0];

  // Channel totals for payment distribution
  const totalTelebirr = last7DaysData.reduce((acc, d) => acc + d.telebirrAmount, 0);
  const totalCash = last7DaysData.reduce((acc, d) => acc + d.cashAmount, 0);
  const totalCbeBirr = last7DaysData.reduce((acc, d) => acc + d.cbeBirrAmount, 0);
  const totalCredit = last7DaysData.reduce((acc, d) => acc + d.creditAmount, 0);

  // Day on day comparison (Today vs Yesterday)
  const todayRevenue = last7DaysData[6]?.revenue || 0;
  const yesterdayRevenue = last7DaysData[5]?.revenue || 0;
  const dayOnDayGrowth = yesterdayRevenue > 0
    ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
    : 0;

  const CustomSalesTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 text-xs space-y-2 min-w-[220px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <div className="font-extrabold text-slate-100">{data.fullDateStr}</div>
              <div className="text-[10px] text-emerald-400 font-medium">{data.ethiopianDate} (EC)</div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {currentLocation.code}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Sales Revenue:</span>
              <span className="font-black text-emerald-400 text-sm">
                {data.revenue.toLocaleString()} ETB
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Transactions:</span>
              <span className="font-bold text-slate-200">
                {data.ordersCount} invoice{data.ordersCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {(data.telebirrAmount > 0 || data.cashAmount > 0 || data.cbeBirrAmount > 0) && (
            <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[10px]">
              <div className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
                Payment Channels
              </div>
              {data.telebirrAmount > 0 && (
                <div className="flex items-center justify-between text-sky-300">
                  <span>📱 Telebirr:</span>
                  <span className="font-mono font-bold">{data.telebirrAmount.toLocaleString()} ETB</span>
                </div>
              )}
              {data.cashAmount > 0 && (
                <div className="flex items-center justify-between text-amber-300">
                  <span>💵 Cash:</span>
                  <span className="font-mono font-bold">{data.cashAmount.toLocaleString()} ETB</span>
                </div>
              )}
              {data.cbeBirrAmount > 0 && (
                <div className="flex items-center justify-between text-purple-300">
                  <span>🏦 CBE Birr:</span>
                  <span className="font-mono font-bold">{data.cbeBirrAmount.toLocaleString()} ETB</span>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-emerald-900/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Phases 1 & 2 Complete: Purchasing, Stock Transfers & Point of Sale</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            TenaPharm — Ethiopian Pharmacy SaaS
          </h2>

          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Multi-tenant pharmacy system tailored for Ethiopian retail and wholesale operations, featuring native PostgreSQL Row-Level Security (RLS) tenant isolation, EFDA compliance, dual-calendar (EC/GC) conversions, Store-to-Dispensary replenishment, FEFO batch-allocating POS, and Telebirr/CBE payment channels.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('POS')}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold rounded-xl text-xs transition-colors shadow-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Launch Point of Sale (POS)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigateTab('INVENTORY_TRANSFERS')}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs border border-slate-700 transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
              <span>Store &rarr; Dispensary Transfers</span>
            </button>

            <button
              onClick={() => onNavigateTab('PURCHASING')}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs border border-slate-700 transition-colors"
            >
              <Truck className="w-4 h-4 text-amber-400" />
              <span>Inbound GRN Intake</span>
            </button>

            <button
              onClick={() => onNavigateTab('AUDIT_LOGS')}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 font-semibold rounded-xl text-xs border border-indigo-700 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>EFDA Audit Trail</span>
            </button>

            <button
              onClick={onOpenSuperAdmin}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-900/80 hover:bg-violet-800 text-violet-200 font-semibold rounded-xl text-xs border border-violet-700 transition-colors"
            >
              <Building2 className="w-4 h-4 text-violet-300" />
              <span>Super Admin Portal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid (including Visual Location Reorder and EFDA Expiry Alert) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Active Location Reorder Status (Dynamic Visual Indicator) */}
        <div
          className={`p-4 rounded-2xl border shadow-2xs transition-all ${
            belowCount > 0
              ? 'bg-rose-50/70 border-rose-300 hover:border-rose-400'
              : totalAtRiskCount > 0
              ? 'bg-amber-50/70 border-amber-300 hover:border-amber-400'
              : 'bg-emerald-50/70 border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <BellRing
                className={`w-4 h-4 ${
                  belowCount > 0
                    ? 'text-rose-600 animate-bounce'
                    : totalAtRiskCount > 0
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              />
              Location Reorder Alert
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                belowCount > 0
                  ? 'bg-rose-200 text-rose-900 border border-rose-300'
                  : totalAtRiskCount > 0
                  ? 'bg-amber-200 text-amber-900 border border-amber-300'
                  : 'bg-emerald-200 text-emerald-900 border border-emerald-300'
              }`}
            >
              {belowCount > 0 ? 'Deficit Alert' : totalAtRiskCount > 0 ? 'Warning' : 'Adequate'}
            </span>
          </div>

          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-extrabold ${
                  belowCount > 0 ? 'text-rose-700' : totalAtRiskCount > 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {totalAtRiskCount}
              </span>
              <span className="text-xs font-medium text-slate-600">
                product{totalAtRiskCount === 1 ? '' : 's'} at risk
              </span>
            </div>

            <div className="text-[11px] text-slate-600 font-medium mt-1 truncate">
              📍 In <strong>{currentLocation.name}</strong>
            </div>

            <div className="flex items-center gap-2 mt-1.5 text-[10px] font-semibold">
              <span className="text-rose-700 bg-white/80 px-1.5 py-0.2 rounded border border-rose-200">
                {belowCount} Below Level
              </span>
              <span className="text-amber-700 bg-white/80 px-1.5 py-0.2 rounded border border-amber-200">
                {nearingCount} Nearing Level
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: EFDA Expiry Alert (Next 90 Days) */}
        <div
          className={`p-4 rounded-2xl border shadow-2xs transition-all ${
            expiredCount > 0
              ? 'bg-rose-50/80 border-rose-300'
              : criticalCount > 0
              ? 'bg-amber-50/80 border-amber-300'
              : 'bg-indigo-50/70 border-indigo-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <ShieldAlert
                className={`w-4 h-4 ${
                  expiredCount > 0
                    ? 'text-rose-600 animate-pulse'
                    : criticalCount > 0
                    ? 'text-amber-600'
                    : 'text-indigo-600'
                }`}
              />
              EFDA Expiry Monitor
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                expiredCount > 0
                  ? 'bg-rose-200 text-rose-900 border border-rose-300'
                  : criticalCount > 0
                  ? 'bg-amber-200 text-amber-900 border border-amber-300'
                  : 'bg-indigo-200 text-indigo-900'
              }`}
            >
              {expiredCount > 0 ? 'Quarantine Active' : criticalCount > 0 ? 'Critical ≤ 30d' : '≤ 90d Window'}
            </span>
          </div>

          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-extrabold ${
                  expiredCount > 0 ? 'text-rose-700' : criticalCount > 0 ? 'text-amber-700' : 'text-indigo-900'
                }`}
              >
                {totalExpiringCount}
              </span>
              <span className="text-xs font-medium text-slate-600">
                batche{totalExpiringCount === 1 ? '' : 's'} &le; 90 days
              </span>
            </div>

            <div className="text-[11px] text-slate-600 font-medium mt-1 truncate">
              Valuation at risk: <strong>{totalRiskValuation.toLocaleString()} ETB</strong>
            </div>

            <div className="flex items-center gap-2 mt-1.5 text-[10px] font-semibold">
              {expiredCount > 0 && (
                <span className="text-rose-800 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-300">
                  {expiredCount} Expired
                </span>
              )}
              <span className="text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200">
                {criticalCount} Critical (&le; 30d)
              </span>
              <span className="text-slate-600 bg-white/80 px-1.5 py-0.2 rounded border border-slate-200">
                {warningCount + attentionCount} &le; 90d
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Active Tenant */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Tenant</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5">
            <span className="text-sm font-bold text-slate-900 block truncate">{currentTenant.name}</span>
            <span className="text-[11px] text-emerald-600 font-medium">
              Plan: {currentTenant.plan} • {currentTenant.city}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">
              TIN: {currentTenant.tinNumber || '0029384756'}
            </span>
          </div>
        </div>

        {/* KPI 4: Dual Calendar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Dual Calendar</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2.5">
            <span className="text-xs font-bold text-slate-900 block leading-tight">{dualDate}</span>
            <span className="text-[10px] text-indigo-600 font-medium block mt-1">
              Ethiopian (EC) & Gregorian (GC) synced
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              13 Months of Sunshine (Pagume leap logic)
            </span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 7-DAY SALES REVENUE TREND LINE CHART (RECHARTS INTEGRATION) */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header Bar */}
        <div className="p-5 md:p-6 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    7-Day Sales Revenue Trend
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Location Active
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Total daily sales revenue trend over the last 7 calendar days for{' '}
                  <strong className="text-white">{currentLocation.name}</strong> ({currentLocation.code})
                </p>
              </div>
            </div>

            {/* Location Context & Switcher */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 bg-slate-800/90 text-slate-200 px-3 py-1 rounded-xl border border-slate-700 font-medium">
                {currentLocation.type === 'STORE' ? (
                  <Warehouse className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Store className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>
                  Active: <strong>{currentLocation.name}</strong> ({currentLocation.type === 'STORE' ? 'Central Warehouse' : 'Retail Dispensary'})
                </span>
              </span>

              {/* Quick toggle to other location */}
              {locations.length > 1 && onSelectLocation && (
                <div className="flex items-center gap-1">
                  {locations
                    .filter((l) => l.id !== currentLocation.id)
                    .map((otherLoc) => (
                      <button
                        key={otherLoc.id}
                        onClick={() => onSelectLocation(otherLoc)}
                        className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold transition-colors flex items-center gap-1"
                        title={`Switch view to ${otherLoc.name}`}
                      >
                        <ArrowRightLeft className="w-3 h-3 text-slate-400" />
                        <span>View {otherLoc.name.split(' ')[0]} Trend</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Metric View Controls */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl text-xs border border-slate-700">
            <button
              onClick={() => setSalesMetricView('REVENUE')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                salesMetricView === 'REVENUE'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Revenue (ETB)
            </button>
            <button
              onClick={() => setSalesMetricView('ORDERS')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                salesMetricView === 'ORDERS'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Orders Count
            </button>
            <button
              onClick={() => setSalesMetricView('COMBINED')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                salesMetricView === 'COMBINED'
                  ? 'bg-indigo-500 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Combined View
            </button>
          </div>
        </div>

        {/* 7-Day Performance KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-slate-50/60 border-b border-slate-200 text-xs">
          <div className="p-4">
            <div className="text-slate-500 font-medium">7-Day Total Revenue</div>
            <div className="text-xl md:text-2xl font-black text-slate-900 mt-1">
              {total7DayRevenue.toLocaleString()} <span className="text-xs font-semibold text-slate-500">ETB</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px]">
              {dayOnDayGrowth >= 0 ? (
                <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200">
                  ▲ +{dayOnDayGrowth}% vs yesterday
                </span>
              ) : (
                <span className="text-rose-700 font-bold bg-rose-100 px-1.5 py-0.2 rounded border border-rose-200">
                  ▼ {dayOnDayGrowth}% vs yesterday
                </span>
              )}
            </div>
          </div>

          <div className="p-4">
            <div className="text-slate-500 font-medium">Daily Average Sales</div>
            <div className="text-xl md:text-2xl font-black text-slate-900 mt-1">
              {averageDailyRevenue.toLocaleString()} <span className="text-xs font-semibold text-slate-500">ETB/day</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Normalized over 7 days
            </div>
          </div>

          <div className="p-4">
            <div className="text-slate-500 font-medium">Peak Sales Day</div>
            <div className="text-xl md:text-2xl font-black text-emerald-700 mt-1">
              {peakDay ? peakDay.revenue.toLocaleString() : 0} <span className="text-xs font-semibold text-slate-500">ETB</span>
            </div>
            <div className="text-[11px] text-slate-600 mt-1 font-medium">
              {peakDay ? `${peakDay.fullDateStr} (${peakDay.ethiopianDate})` : 'N/A'}
            </div>
          </div>

          <div className="p-4">
            <div className="text-slate-500 font-medium">Completed Transactions</div>
            <div className="text-xl md:text-2xl font-black text-slate-900 mt-1">
              {total7DayOrders} <span className="text-xs font-semibold text-slate-500">invoices</span>
            </div>
            <div className="text-[11px] text-indigo-700 font-semibold mt-1">
              Avg ticket: {total7DayOrders > 0 ? Math.round(total7DayRevenue / total7DayOrders).toLocaleString() : 0} ETB
            </div>
          </div>
        </div>

        {/* Recharts Line Chart Container */}
        <div className="p-5 md:p-6 bg-white">
          <div className="w-full h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last7DaysData} margin={{ top: 20, right: 24, left: 10, bottom: 8 }}>
                <defs>
                  <linearGradient id="salesRevenueGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#0d9488" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  dy={10}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k ETB` : `${val} ETB`)}
                  width={75}
                />
                {salesMetricView === 'COMBINED' && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#f59e0b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val} ord`}
                    width={45}
                  />
                )}
                <Tooltip content={<CustomSalesTooltip />} />
                {averageDailyRevenue > 0 && salesMetricView !== 'ORDERS' && (
                  <ReferenceLine
                    yAxisId="left"
                    y={averageDailyRevenue}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Avg: ${averageDailyRevenue.toLocaleString()} ETB`,
                      fill: '#64748b',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                )}
                {(salesMetricView === 'REVENUE' || salesMetricView === 'COMBINED') && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="Sales Revenue (ETB)"
                    stroke="url(#salesRevenueGradient)"
                    strokeWidth={3.5}
                    dot={{ fill: '#059669', stroke: '#ffffff', strokeWidth: 2.5, r: 5 }}
                    activeDot={{ fill: '#047857', stroke: '#ffffff', strokeWidth: 3, r: 8 }}
                    animationDuration={1200}
                  />
                )}
                {(salesMetricView === 'ORDERS' || salesMetricView === 'COMBINED') && (
                  <Line
                    yAxisId={salesMetricView === 'COMBINED' ? 'right' : 'left'}
                    type="monotone"
                    dataKey="ordersCount"
                    name="Transactions Count"
                    stroke="#f59e0b"
                    strokeWidth={salesMetricView === 'COMBINED' ? 2.5 : 3.5}
                    strokeDasharray={salesMetricView === 'COMBINED' ? '5 5' : undefined}
                    dot={{ fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2, r: 4 }}
                    activeDot={{ fill: '#d97706', stroke: '#ffffff', strokeWidth: 2.5, r: 7 }}
                    animationDuration={1200}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Payment Method Distribution Breakdown */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                7-Day Payment Channels:
              </span>

              {totalTelebirr > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 text-sky-900 border border-sky-200">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  <span className="font-bold">Telebirr:</span>
                  <span>{totalTelebirr.toLocaleString()} ETB</span>
                  <span className="text-[10px] text-sky-600 font-semibold">
                    ({Math.round((totalTelebirr / (total7DayRevenue || 1)) * 100)}%)
                  </span>
                </div>
              )}

              {totalCash > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="font-bold">Cash:</span>
                  <span>{totalCash.toLocaleString()} ETB</span>
                  <span className="text-[10px] text-amber-600 font-semibold">
                    ({Math.round((totalCash / (total7DayRevenue || 1)) * 100)}%)
                  </span>
                </div>
              )}

              {totalCbeBirr > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 text-purple-900 border border-purple-200">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span className="font-bold">CBE Birr:</span>
                  <span>{totalCbeBirr.toLocaleString()} ETB</span>
                  <span className="text-[10px] text-purple-600 font-semibold">
                    ({Math.round((totalCbeBirr / (total7DayRevenue || 1)) * 100)}%)
                  </span>
                </div>
              )}

              {totalCredit > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 text-indigo-900 border border-indigo-200">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <span className="font-bold">Customer Credit:</span>
                  <span>{totalCredit.toLocaleString()} ETB</span>
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigateTab('POS')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
              <span>Open POS & Record Sale</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* EXPIRING SOON ALERT WIDGET: EFDA COMPLIANCE MONITOR (REQUESTED) */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header Bar */}
        <div className="p-5 md:p-6 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    Expiring Soon: EFDA Regulatory Compliance & FEFO Monitor
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    &le; 90 Days Window
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Proactive expiry tracking: Batches nearing expiration must be prioritized via FEFO at POS or segregated for EFDA disposal protocol.
                </p>
              </div>
            </div>

            {/* Quick summary line */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                <span>Expired: <strong className="text-rose-400">{expiredCount}</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                <Hourglass className="w-3.5 h-3.5 text-amber-400" />
                <span>Critical (&le; 30d): <strong className="text-amber-400">{criticalCount}</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                <Clock className="w-3.5 h-3.5 text-yellow-400" />
                <span>Warning (31-60d): <strong className="text-yellow-400">{warningCount}</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Value at Risk: <strong className="text-white">{totalRiskValuation.toLocaleString()} ETB</strong></span>
              </span>
            </div>
          </div>

          {/* Controls: Filter Pills & EFDA Compliance Export */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl text-xs border border-slate-700">
              <button
                onClick={() => setExpiryFilter('ALL_90')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  expiryFilter === 'ALL_90'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                All &le; 90d ({expiringBatches.length})
              </button>
              <button
                onClick={() => setExpiryFilter('CRITICAL_30')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  expiryFilter === 'CRITICAL_30'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                &le; 30d ({criticalCount})
              </button>
              <button
                onClick={() => setExpiryFilter('WARNING_60')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  expiryFilter === 'WARNING_60'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                31-60d ({warningCount})
              </button>
              <button
                onClick={() => setExpiryFilter('ATTENTION_90')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  expiryFilter === 'ATTENTION_90'
                    ? 'bg-yellow-400 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                61-90d ({attentionCount})
              </button>
              <button
                onClick={() => setExpiryFilter('EXPIRED')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  expiryFilter === 'EXPIRED'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Expired ({expiredCount})
              </button>
            </div>

            {/* EFDA Regulatory PDF Export Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setPdfScope(expiryFilter);
                  setIsEfdaPdfModalOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                title="Configure and export official EFDA compliance report (PDF)"
              >
                <FileDown className="w-4 h-4 text-slate-950" />
                <span>Export EFDA Compliance PDF</span>
              </button>

              <button
                onClick={handleQuickExportCurrentView}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                title="Direct 1-click download of currently active view as PDF"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Quick PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Success Alert Banner for PDF Download */}
        {exportSuccessMessage && (
          <div className="p-3.5 bg-emerald-50 border-b border-emerald-200 text-emerald-950 text-xs flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{exportSuccessMessage}</span>
            </div>
            <button
              onClick={() => setExportSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Expiring Batches List */}
        {displayedExpiringBatches.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <div className="text-sm font-bold text-slate-800">
              No batches match the selected expiration filter!
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All active batches are within compliant shelf-life validity windows. FEFO auto-allocation remains active at Point of Sale.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayedExpiringBatches.map((item) => {
              const { batch, product, category, diffDays, tier, totalBatchStock, currentLocStock, totalValueAtRisk } = item;
              const gen = generics.find((g) => g.id === product?.genericId);

              // Progress bar countdown calculation (0 to 90 days)
              const remainingDaysRatio = Math.max(0, Math.min(100, Math.round((diffDays / 90) * 100)));

              return (
                <div
                  key={batch.id}
                  className={`p-4 md:p-5 transition-colors flex flex-wrap items-center justify-between gap-4 ${
                    tier === 'EXPIRED'
                      ? 'bg-rose-50/50 hover:bg-rose-50/70 border-l-4 border-rose-600'
                      : tier === 'CRITICAL'
                      ? 'bg-amber-50/50 hover:bg-amber-50/70 border-l-4 border-amber-500'
                      : 'hover:bg-slate-50 border-l-4 border-yellow-400'
                  }`}
                >
                  {/* Left: Product & Batch Identification */}
                  <div className="flex-1 min-w-[260px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {product?.brandName || 'Product'}
                      </span>

                      {/* Expiry Risk Badge */}
                      {tier === 'EXPIRED' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 border border-rose-300">
                          <AlertOctagon className="w-3 h-3 text-rose-700" />
                          EXPIRED ({Math.abs(diffDays)}d ago)
                        </span>
                      ) : tier === 'CRITICAL' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300">
                          <Hourglass className="w-3 h-3 text-rose-600" />
                          CRITICAL: {diffDays} DAYS LEFT
                        </span>
                      ) : tier === 'WARNING' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-700" />
                          WARNING: {diffDays} DAYS LEFT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-900 border border-yellow-300">
                          ATTENTION: {diffDays} DAYS LEFT
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      {gen && <span className="font-semibold text-slate-700">INN: {gen.name}</span>}
                      <span className="font-mono text-slate-800 font-bold bg-white px-1.5 py-0.2 rounded border border-slate-200">
                        Batch: {batch.batchNumber}
                      </span>
                      <span>Category: {category?.name || 'Medicine'}</span>
                      {product?.isControlled && (
                        <span className="text-[10px] font-bold text-rose-600">
                          Controlled EFDA Schedule
                        </span>
                      )}
                    </div>

                    {/* Expiration Date in Dual Calendar format */}
                    <div className="mt-2 text-[11px] text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-medium text-slate-700">
                        Expiry Date: <strong>{formatDualDate(batch.expiryDate, language)}</strong>
                      </span>
                      {batch.grnReference && (
                        <span className="text-slate-400 font-mono text-[10px]">
                          Intake Ref: {batch.grnReference}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle: Expiry Countdown Progress Bar & Stock at Risk */}
                  <div className="w-full md:w-64 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        {totalBatchStock.toLocaleString()} {product?.baseUnit}s in stock
                      </span>
                      <span
                        className={`font-bold ${
                          tier === 'EXPIRED' ? 'text-rose-700' : tier === 'CRITICAL' ? 'text-rose-600' : 'text-amber-700'
                        }`}
                      >
                        {totalValueAtRisk.toLocaleString()} ETB
                      </span>
                    </div>

                    {/* Countdown bar (Proportion of 90-day window remaining) */}
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          tier === 'EXPIRED'
                            ? 'bg-rose-700'
                            : tier === 'CRITICAL'
                            ? 'bg-rose-500'
                            : tier === 'WARNING'
                            ? 'bg-amber-500'
                            : 'bg-yellow-400'
                        }`}
                        style={{ width: `${tier === 'EXPIRED' ? 100 : remainingDaysRatio}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>
                        In {currentLocation.name}: <strong>{currentLocStock.toLocaleString()}</strong>
                      </span>
                      <span>
                        {tier === 'EXPIRED'
                          ? '⛔ PROHIBITED FROM SALE'
                          : `${diffDays} days before threshold`}
                      </span>
                    </div>
                  </div>

                  {/* Right: Action Buttons (Quarantine vs FEFO Dispensing) */}
                  <div className="flex items-center gap-2">
                    {tier === 'EXPIRED' ? (
                      <button
                        onClick={() => onNavigateTab('INVENTORY_TRANSFERS')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quarantine & Write-Off</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => onNavigateTab('POS')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Dispense at POS (FEFO)</span>
                        </button>

                        <button
                          onClick={() => onNavigateTab('INVENTORY_TRANSFERS')}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 transition-colors"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Rotate / Transfer</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* LOCATION-AWARE REORDER PROXIMITY & STOCK HEALTH MONITOR */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header Bar */}
        <div className="p-5 md:p-6 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Location Stock Reorder & Replenishment Monitor</span>
                  {totalAtRiskCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      {totalAtRiskCount} Alert{totalAtRiskCount === 1 ? '' : 's'}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time stock balance vs. reorder threshold evaluation for active location:
                </p>
              </div>
            </div>

            {/* Active Location Indicator Pill */}
            <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs">
              <span className="text-slate-500 font-medium">Monitoring Location:</span>
              <span
                className={`font-bold inline-flex items-center gap-1 ${
                  currentLocation.type === 'STORE' ? 'text-amber-800' : 'text-emerald-800'
                }`}
              >
                {currentLocation.type === 'STORE' ? (
                  <Warehouse className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Store className="w-3.5 h-3.5 text-emerald-600" />
                )}
                {currentLocation.name} ({currentLocation.code})
              </span>
              <span className="text-[10px] text-slate-400">
                [Switch in top header to inspect other location]
              </span>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setReorderFilter('AT_RISK')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                reorderFilter === 'AT_RISK'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All at Risk ({totalAtRiskCount})
            </button>
            <button
              onClick={() => setReorderFilter('BELOW')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                reorderFilter === 'BELOW'
                  ? 'bg-rose-100 text-rose-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Below Threshold ({belowCount})
            </button>
            <button
              onClick={() => setReorderFilter('NEARING')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                reorderFilter === 'NEARING'
                  ? 'bg-amber-100 text-amber-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approaching (&le; 150%) ({nearingCount})
            </button>
            <button
              onClick={() => setReorderFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                reorderFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Catalog ({products.length})
            </button>
          </div>
        </div>

        {/* Body Content */}
        {displayedReorderItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <div className="text-sm font-bold text-slate-800">
              No products at risk under current filter!
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All inventory levels at <strong>{currentLocation.name}</strong> are operating safely above their configured reorder thresholds.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayedReorderItems.map((item) => {
              const { product, currentLocStock, otherLocStock, reorderLevel, isBelow, isNearing, ratio, deficit } = item;
              const cat = categories.find((c) => c.id === product.categoryId);
              const gen = generics.find((g) => g.id === product.genericId);

              return (
                <div
                  key={product.id}
                  className={`p-4 md:p-5 transition-colors flex flex-wrap items-center justify-between gap-4 ${
                    isBelow
                      ? 'bg-rose-50/30 hover:bg-rose-50/50'
                      : isNearing
                      ? 'bg-amber-50/30 hover:bg-amber-50/50'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Left: Product Info */}
                  <div className="flex-1 min-w-[260px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{product.brandName}</span>
                      {isBelow ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          BELOW REORDER LEVEL
                        </span>
                      ) : isNearing ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          <TrendingDown className="w-3 h-3 text-amber-600" />
                          NEARING THRESHOLD (&le; 150%)
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          HEALTHY BUFFER
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      {gen && (
                        <span className="font-semibold text-slate-700">INN: {gen.name}</span>
                      )}
                      <span>Category: {cat?.name || 'General'}</span>
                      <span>Pack: {product.packSize || product.variantSize || 'Standard'}</span>
                      {product.isControlled && (
                        <span className="text-[10px] font-bold text-rose-600">
                          Controlled EFDA Schedule
                        </span>
                      )}
                    </div>

                    {/* Cross-Location Context Notice */}
                    <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-2">
                      <span className="font-medium">
                        Stock in other units: <strong>{otherLocStock.toLocaleString()} {product.baseUnit}s</strong>
                      </span>
                      {currentLocation.type === 'DISPENSARY' && otherLocStock > 0 && (
                        <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          ✓ Available in Store for transfer
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle: Visual Gauge Bar & Stock Level */}
                  <div className="w-full md:w-64 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        {currentLocStock.toLocaleString()} / {reorderLevel.toLocaleString()} {product.baseUnit}s
                      </span>
                      <span
                        className={`font-bold ${
                          isBelow ? 'text-rose-700' : isNearing ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {ratio}% of Level
                      </span>
                    </div>

                    {/* Progress Bar Gauge */}
                    <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isBelow
                            ? 'bg-rose-600'
                            : isNearing
                            ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, ratio)}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>0 Units</span>
                      <span>
                        {isBelow ? (
                          <strong className="text-rose-700">Deficit: -{deficit} {product.baseUnit}s</strong>
                        ) : isNearing ? (
                          <strong className="text-amber-700">Buffer: +{-deficit} {product.baseUnit}s left</strong>
                        ) : (
                          <span>Reorder Level: {reorderLevel}</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Right: Quick Action Buttons based on location type */}
                  <div className="flex items-center gap-2">
                    {currentLocation.type === 'DISPENSARY' ? (
                      otherLocStock > 0 ? (
                        <button
                          onClick={() => onNavigateTab('INVENTORY_TRANSFERS')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Transfer from Store</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onNavigateTab('PURCHASING')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Order from EPSS / Supplier</span>
                        </button>
                      )
                    ) : (
                      /* Store Location Actions */
                      <button
                        onClick={() => onNavigateTab('PURCHASING')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Create GRN / Requisition</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feature Pillar Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pillar 1: Multi-Tenancy & RLS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">PostgreSQL Row-Level Security (RLS)</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Single PostgreSQL database where all tables enforce <code>tenant_id</code>. RLS policies verify <code>current_setting('app.current_tenant_id')</code> to prevent cross-tenant data leaks. Super Admin manages subscriptions and payment authorizations.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Physical database separation verified</span>
          </div>
        </div>

        {/* Pillar 2: Customizable RBAC & Cashier Privacy */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">4 Tenant Roles & Cost Price Concealment</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Granular permissions for <strong>Admin</strong>, <strong>Inventory Manager</strong>, <strong>Sales Manager</strong>, and <strong>Cashier/Pharmacist</strong>. Dispensing cashiers are strictly blocked from seeing wholesale purchase costs and margins.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-indigo-700 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Active role: {currentRole}</span>
          </div>
        </div>

        {/* Pillar 3: Product & Drug Register */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
            <Pill className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">EFDA Medicine & General Catalog</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Support for Medicines (INN generic FK, dosage, strength, unit conversions: Box = Strips = Tablets, controlled flags) and General Goods (baby milk, diapers, cosmetics). Category flags drive batch and expiry requirements.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-teal-700 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Excel import/export enabled for masters</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* EFDA REGULATORY PDF EXPORT CONFIGURATION MODAL */}
      {/* ==================================================================== */}
      {isEfdaPdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6">
              {/* Ethiopian Flag Stripe */}
              <div className="absolute top-0 left-0 right-0 h-1.5 flex">
                <div className="h-full flex-1 bg-emerald-600"></div>
                <div className="h-full flex-1 bg-amber-400"></div>
                <div className="h-full flex-1 bg-rose-600"></div>
              </div>

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">
                        EFDA Batch Expiry Regulatory PDF Report
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Directive No. 981/2023
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Export an inspection-ready, signed compliance document for regulatory surveillance and quarantine audit.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEfdaPdfModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Facility & License Info Badge */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
                <div>
                  Facility: <strong className="text-white">{currentTenant.name}</strong>
                </div>
                <div>
                  EFDA License: <strong className="text-emerald-400">{currentTenant.licenseNumber || 'EFDA-DISP-AA-2024-998'}</strong>
                </div>
                <div>
                  TIN: <strong className="text-slate-200">{currentTenant.tinNumber || '0029384756'}</strong>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-slate-700 text-xs">
              {/* Report Scope Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  1. Surveillance Scope Filter
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'ALL_90', label: 'All ≤ 90 Days Window', badge: 'Standard Audit' },
                    { id: 'CRITICAL_30', label: 'Critical Only (≤ 30d)', badge: 'FEFO Urgent' },
                    { id: 'EXPIRED', label: 'Expired Batches Only', badge: 'Quarantine Form-D' },
                    { id: 'WARNING_60', label: 'Warning (31-60d)', badge: 'Rotation' },
                    { id: 'ATTENTION_90', label: 'Attention (61-90d)', badge: 'Reorder Freeze' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setPdfScope(option.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        pdfScope === option.id
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span>{option.label}</span>
                        {pdfScope === option.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">{option.badge}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Scope Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  2. Facility Location Scope
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPdfLocationScope('CURRENT')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      pdfLocationScope === 'CURRENT'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Current Location Only</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-1 truncate">
                      {currentLocation.name} ({currentLocation.code})
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPdfLocationScope('ALL')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      pdfLocationScope === 'ALL'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Warehouse className="w-3.5 h-3.5 text-indigo-600" />
                      <span>All Pharmacy Locations</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-1">
                      Consolidated: Central Store & Retail Dispensaries ({locations.length} units)
                    </div>
                  </button>
                </div>
              </div>

              {/* Real-time PDF Export Scope Summary */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="text-slate-500 font-medium">Matching Batch Records</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {modalMatchingCount} <span className="text-xs font-semibold text-slate-500">batches</span>
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 font-medium">Expired / Quarantine</div>
                  <div className="text-lg font-black text-rose-700 mt-0.5">
                    {modalExpiredCount}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 font-medium">Critical (≤ 30d)</div>
                  <div className="text-lg font-black text-amber-700 mt-0.5">
                    {modalCriticalCount}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 font-medium">Estimated Value at Risk</div>
                  <div className="text-lg font-black text-emerald-700 mt-0.5">
                    {modalTotalValuation.toLocaleString()} <span className="text-xs font-semibold text-slate-500">ETB</span>
                  </div>
                </div>
              </div>

              {/* Signatory Credentials & Inspection Notes */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    3. Signatory Endorsement & Pharmacy Official Seal
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    EFDA Directive Compliance Sign-off
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Lead Inspector / Auditor Name:
                    </label>
                    <input
                      type="text"
                      value={pdfSignatoryName}
                      onChange={(e) => setPdfSignatoryName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-emerald-500 bg-white"
                      placeholder="e.g. Rahel Tadesse"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Professional Title / Capacity:
                    </label>
                    <input
                      type="text"
                      value={pdfSignatoryTitle}
                      onChange={(e) => setPdfSignatoryTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-emerald-500 bg-white"
                      placeholder="e.g. Technical Director / Registered Pharmacist"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Regulatory Audit Notes / Directives:
                  </label>
                  <textarea
                    rows={2}
                    value={pdfReportNotes}
                    onChange={(e) => setPdfReportNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-emerald-500 bg-white"
                    placeholder="Audit findings, quarantine location, or supplier return instructions..."
                  />
                </div>
              </div>

              {/* EFDA Regulatory Information Box */}
              <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-[11px] text-amber-950 flex items-start gap-2.5 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>EFDA Legal Mandate Notice:</strong> In accordance with Ethiopian Food & Drug Authority Directive No. 981/2023, batch records nearing expiry must be logged with manufacturer and lot traceability. Expired products must be sealed in quarantine with dual signatures from the technical manager and inventory supervisor prior to disposal manifest issuance.
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Standard Landscape A4 • Official Signature & Seal Block included</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEfdaPdfModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs border border-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isExportingPdf}
                  onClick={() => handleDownloadEfdaPdf(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                  title="Open PDF preview in a new browser tab"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                  <span>Preview Tab</span>
                </button>

                <button
                  type="button"
                  disabled={isExportingPdf}
                  onClick={() => handleDownloadEfdaPdf(false)}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExportingPdf ? 'Generating PDF...' : 'Download Official PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
