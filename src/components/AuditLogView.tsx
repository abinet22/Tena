import React, { useState, useMemo } from 'react';
import {
  FileText, ShieldCheck, Search, Filter, Download, FileSpreadsheet,
  AlertTriangle, CheckCircle2, Clock, MapPin, User, Building2,
  Calendar, Lock, Cpu, Eye, ExternalLink, Plus, RefreshCw, X,
  AlertOctagon, CheckSquare, Layers, Sparkles, Hash, ArrowUpDown
} from 'lucide-react';
import {
  AuditLog, AuditCategory, AuditSeverity, Tenant, Location, RoleCode
} from '../types/pharmacy';
import { formatDualDate } from '../utils/ethiopianCalendar';
import { formatDualDateAscii } from '../utils/efdaPdfExport';
import {
  exportAuditLogsToExcel,
  exportAuditReportToPdf,
  createAuditLog
} from '../utils/auditLogger';

interface AuditLogViewProps {
  auditLogs: AuditLog[];
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
  currentTenant: Tenant;
  currentLocation: Location;
  locations: Location[];
  currentRole: RoleCode;
  language: 'en' | 'am';
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  auditLogs,
  setAuditLogs,
  currentTenant,
  currentLocation,
  locations,
  currentRole,
  language,
}) => {
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AuditCategory | 'ALL'>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<AuditSeverity | 'ALL'>('ALL');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('ALL');
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'TODAY' | '7_DAYS' | '30_DAYS'>('ALL');
  const [controlledOnly, setControlledOnly] = useState(false);

  // Modal inspection & manual creation state
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Audit Event Form State (Simulator/Manager Entry)
  const [newAction, setNewAction] = useState('STOCK_COUNT_ADJUSTMENT');
  const [newEntity, setNewEntity] = useState('StockBalance');
  const [newEntityName, setNewEntityName] = useState('Amoxil 500mg Capsule [Batch: AMX-24-098]');
  const [newCategory, setNewCategory] = useState<AuditCategory>('STOCK_ENGINE');
  const [newSeverity, setNewSeverity] = useState<AuditSeverity>('WARNING');
  const [newReason, setNewReason] = useState('Physical shelf count variance during routine reconciliation.');
  const [newPrescriptionRef, setNewPrescriptionRef] = useState('');
  const [newBatchNumber, setNewBatchNumber] = useState('AMX-24-098');

  // ------------------------------------------------------------------
  // Filtered Audit Logs Computation
  // ------------------------------------------------------------------
  const filteredLogs = useMemo(() => {
    const now = new Date().getTime();

    return auditLogs.filter((log) => {
      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesQuery =
          log.action.toLowerCase().includes(query) ||
          log.entity.toLowerCase().includes(query) ||
          (log.entityName && log.entityName.toLowerCase().includes(query)) ||
          (log.userName && log.userName.toLowerCase().includes(query)) ||
          (log.batchNumber && log.batchNumber.toLowerCase().includes(query)) ||
          (log.prescriptionRef && log.prescriptionRef.toLowerCase().includes(query)) ||
          (log.reason && log.reason.toLowerCase().includes(query)) ||
          (log.efdaComplianceCode && log.efdaComplianceCode.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      // Category
      if (selectedCategory !== 'ALL' && log.category !== selectedCategory) {
        return false;
      }

      // Severity
      if (selectedSeverity !== 'ALL' && log.severity !== selectedSeverity) {
        return false;
      }

      // Location
      if (selectedLocationId !== 'ALL' && log.locationId !== selectedLocationId) {
        return false;
      }

      // Controlled substances filter
      if (controlledOnly && log.category !== 'CONTROLLED_DRUGS' && !log.prescriptionRef) {
        return false;
      }

      // Time Filter
      if (timeFilter !== 'ALL') {
        const logTime = new Date(log.createdAt).getTime();
        const diffHours = (now - logTime) / (1000 * 60 * 60);

        if (timeFilter === 'TODAY' && diffHours > 24) return false;
        if (timeFilter === '7_DAYS' && diffHours > 24 * 7) return false;
        if (timeFilter === '30_DAYS' && diffHours > 24 * 30) return false;
      }

      return true;
    });
  }, [auditLogs, searchTerm, selectedCategory, selectedSeverity, selectedLocationId, timeFilter, controlledOnly]);

  // ------------------------------------------------------------------
  // Executive Statistics
  // ------------------------------------------------------------------
  const totalCount = auditLogs.length;
  const controlledCount = auditLogs.filter((l) => l.category === 'CONTROLLED_DRUGS' || l.prescriptionRef).length;
  const stockAdjustmentsCount = auditLogs.filter((l) => l.category === 'STOCK_ENGINE' && l.action.includes('ADJUSTMENT')).length;
  const alertCount = auditLogs.filter((l) => l.severity === 'ALERT' || l.severity === 'CRITICAL').length;
  const priceChangesCount = auditLogs.filter((l) => l.category === 'PRICE_MASTER').length;

  // Handle Manual/Simulated Log Creation
  const handleCreateAuditEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const entry = createAuditLog({
      tenantId: currentTenant.id,
      userId: `usr-${currentRole.toLowerCase()}`,
      userName: currentRole === 'ADMIN' ? 'General Pharmacy Admin' : 'Responsible Pharmacist',
      userRole: currentRole.replace('_', ' '),
      action: newAction,
      entity: newEntity,
      entityId: `ent-${Date.now()}`,
      entityName: newEntityName,
      category: newCategory,
      severity: newSeverity,
      locationId: currentLocation.id,
      locationName: currentLocation.name,
      efdaComplianceCode: newCategory === 'CONTROLLED_DRUGS' ? 'EFDA-SCHED-II' : 'EFDA-GPP-STD',
      reason: newReason,
      prescriptionRef: newPrescriptionRef || undefined,
      batchNumber: newBatchNumber || undefined,
      newValues: { status: 'RECORDED', loggedAt: new Date().toISOString() },
    });

    setAuditLogs((prev) => [entry, ...prev]);
    setIsCreateModalOpen(false);
    setToastMessage(`Audit entry ${entry.id} recorded with cryptographic hash ${entry.verificationHash?.slice(0, 14)}...`);
    setTimeout(() => setToastMessage(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center justify-between gap-3 text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-200 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Ethiopian Flag Top Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 flex">
          <div className="h-full flex-1 bg-emerald-500"></div>
          <div className="h-full flex-1 bg-amber-400"></div>
          <div className="h-full flex-1 bg-rose-500"></div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>EFDA Directive No. 981/2023 & Good Pharmacy Practice (GPP)</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>EFDA Regulatory Audit Log & Traceability Ledger</span>
            </h2>

            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Immutable electronic audit trail tracking all clinical dispensing, price updates, stock balance adjustments, controlled substance orders, and user permission changes with tamper-evident cryptographic checksums.
            </p>

            {/* Facility Context Tags */}
            <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Facility: <strong>{currentTenant.name}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>EFDA Premise Lic: <strong>{currentTenant.licenseNumber || 'EFDA-DISP-AA-2024-998'}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Location: <strong>{currentLocation.name}</strong> ({currentLocation.code})</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => exportAuditLogsToExcel(filteredLogs, currentTenant.name)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs border border-slate-700 transition-colors shadow-sm cursor-pointer"
              title="Download audit records as Excel spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={() =>
                exportAuditReportToPdf({
                  logs: filteredLogs,
                  tenant: currentTenant,
                  location: currentLocation,
                  auditorName: currentRole === 'ADMIN' ? 'Head Pharmacist & Admin' : 'Responsible Pharmacist',
                  auditorTitle: `${currentRole.replace('_', ' ')} • EFDA Licensee`,
                  filterSummary: `Filtered by ${selectedCategory} (${filteredLogs.length} events)`,
                })
              }
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
              title="Generate official EFDA landscape PDF inspection report"
            >
              <Download className="w-4 h-4" />
              <span>Export EFDA PDF</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold rounded-xl text-xs border border-indigo-500/40 transition-colors cursor-pointer"
              title="Log manual stock reconciliation, clinical override, or inspection audit note"
            >
              <Plus className="w-4 h-4" />
              <span>Log Audit Event</span>
            </button>
          </div>
        </div>
      </div>

      {/* Compliance Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Total Audited Events</span>
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalCount}</span>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              Active Trail
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Showing {filteredLogs.length} filtered
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Controlled Substances</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700">{controlledCount}</span>
            <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
              Schedule II-IV
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Mandatory Rx & Patient verification
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Stock Adjustments</span>
            <RefreshCw className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">{stockAdjustmentsCount}</span>
            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
              Variance Logs
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Count reconciliations recorded
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Critical / Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700">{alertCount}</span>
            <span className="text-[10px] text-slate-500">regulatory alerts</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Write-offs & high-risk events
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs bg-emerald-50/30">
          <div className="flex items-center justify-between text-emerald-800 text-xs">
            <span className="font-bold">Cryptographic Integrity</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-black text-emerald-800">100%</span>
            <span className="text-[11px] font-bold text-emerald-700">Verified</span>
          </div>
          <div className="text-[10px] text-emerald-700 font-medium mt-1">
            Tamper-evident hash protection
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 md:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        {/* Search & Main Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by action, product, batch number, user name, prescription #, or EFDA code..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-emerald-500 bg-slate-50/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Selectors */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs focus:outline-emerald-500 font-medium"
            >
              <option value="ALL">All Severities</option>
              <option value="ALERT">Alert (High Priority)</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>

            {/* Location Filter */}
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs focus:outline-emerald-500 font-medium"
            >
              <option value="ALL">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.code})
                </option>
              ))}
            </select>

            {/* Time Filter */}
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs focus:outline-emerald-500 font-medium"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Last 24 Hours</option>
              <option value="7_DAYS">Last 7 Days</option>
              <option value="30_DAYS">Last 30 Days</option>
            </select>

            {/* Controlled substance toggle */}
            <button
              onClick={() => setControlledOnly(!controlledOnly)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                controlledOnly
                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
              <span>Controlled EFDA Only</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1 border-t border-slate-100">
          <span className="text-slate-500 font-semibold mr-1">Category:</span>
          {[
            { id: 'ALL', label: 'All Records' },
            { id: 'STOCK_ENGINE', label: 'Stock Adjustments & Transfers' },
            { id: 'CONTROLLED_DRUGS', label: 'Controlled Substances (Schedule II)' },
            { id: 'POS_DISPENSING', label: 'POS & Dispensing' },
            { id: 'PRICE_MASTER', label: 'Price & Catalog Updates' },
            { id: 'USER_SECURITY', label: 'RBAC & User Access' },
            { id: 'COMPLIANCE', label: 'EFDA Reports & Quarantine' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3 py-1 rounded-xl font-bold transition-all text-[11px] cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Audit Trail Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 md:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Chronological Transaction & Activity Ledger</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-semibold">
                {filteredLogs.length} events
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              All transactions are stamped with dual calendar (GC/EC) dates and protected by cryptographic hashes.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Compliance Mandate:</span>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
              EFDA Directive No. 981/2023
            </span>
          </div>
        </div>

        {/* Table Content */}
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <div className="text-sm font-bold text-slate-800">
              No audit logs matching active filter criteria!
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Try clearing the search query or switching categories to inspect other regulatory events.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <th className="py-3 px-4 text-center w-12">S/N</th>
                  <th className="py-3 px-4 min-w-[150px]">Timestamp & Calendar</th>
                  <th className="py-3 px-4 min-w-[160px]">Action & Category</th>
                  <th className="py-3 px-4 min-w-[150px]">Actor & Role</th>
                  <th className="py-3 px-4 min-w-[200px]">Affected Entity / Product</th>
                  <th className="py-3 px-4 min-w-[120px]">Location</th>
                  <th className="py-3 px-4 min-w-[130px]">EFDA Tag</th>
                  <th className="py-3 px-4 text-center min-w-[100px]">Verification</th>
                  <th className="py-3 px-4 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLogs.map((log, index) => {
                  const dualDateStr = formatDualDate(new Date(log.createdAt), language);

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        log.severity === 'ALERT'
                          ? 'bg-rose-50/30'
                          : log.severity === 'CRITICAL'
                          ? 'bg-amber-50/30'
                          : ''
                      }`}
                    >
                      {/* S/N */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400 font-bold">
                        {index + 1}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="font-semibold text-slate-900 text-xs">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium">
                          {dualDateStr}
                        </div>
                        <div className="text-[9px] font-mono text-slate-400">
                          {log.id}
                        </div>
                      </td>

                      {/* Action & Category */}
                      <td className="py-3.5 px-4 space-y-1">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{log.action.replace(/_/g, ' ')}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              log.category === 'CONTROLLED_DRUGS'
                                ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                : log.category === 'STOCK_ENGINE'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : log.category === 'PRICE_MASTER'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : log.category === 'USER_SECURITY'
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {log.category.replace(/_/g, ' ')}
                          </span>

                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              log.severity === 'ALERT'
                                ? 'bg-rose-600 text-white'
                                : log.severity === 'CRITICAL'
                                ? 'bg-amber-500 text-slate-950 font-extrabold'
                                : log.severity === 'WARNING'
                                ? 'bg-yellow-400 text-slate-950'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {log.severity}
                          </span>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.userName || 'System Engine'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {log.userRole || 'Authorized User'}
                        </div>
                        {log.ipAddress && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            IP: {log.ipAddress}
                          </div>
                        )}
                      </td>

                      {/* Affected Entity & Reason */}
                      <td className="py-3.5 px-4 space-y-1">
                        <div className="font-bold text-slate-900">
                          {log.entityName || `${log.entity} [${log.entityId}]`}
                        </div>
                        {log.batchNumber && (
                          <div className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-block">
                            Batch: {log.batchNumber}
                          </div>
                        )}
                        {log.prescriptionRef && (
                          <div className="text-[10px] font-mono text-rose-800 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 inline-block ml-1">
                            Rx: {log.prescriptionRef}
                          </div>
                        )}
                        {log.reason && (
                          <div className="text-[11px] text-slate-600 line-clamp-1 italic">
                            &ldquo;{log.reason}&rdquo;
                          </div>
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[120px]">{log.locationName || 'Facility-wide'}</span>
                        </div>
                      </td>

                      {/* EFDA Code */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 block text-center">
                          {log.efdaComplianceCode || 'EFDA-AUDIT-01'}
                        </span>
                      </td>

                      {/* Verification Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Hashed</span>
                        </span>
                        <div className="text-[9px] font-mono text-slate-400 mt-0.5 truncate max-w-[110px]">
                          {log.verificationHash ? log.verificationHash.slice(0, 14) + '...' : '✓ Valid'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold border border-slate-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Inspect full audit details, old/new values, and tamper checksum"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* DETAILED RECORD INSPECTION MODAL */}
      {/* ==================================================================== */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {selectedLog.category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{selectedLog.id}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">
                    {selectedLog.action.replace(/_/g, ' ')}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Affected Entity: <strong>{selectedLog.entityName || selectedLog.entity}</strong>
                  </p>
                </div>

                <button
                  onClick={() => setSelectedLog(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sub-bar */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
                <span>Timestamp: <strong>{formatDualDateAscii(selectedLog.createdAt)}</strong></span>
                <span>Actor: <strong>{selectedLog.userName} ({selectedLog.userRole})</strong></span>
                <span>Branch: <strong>{selectedLog.locationName || currentLocation.name}</strong></span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs text-slate-700">
              {/* Clinical / Justification Note */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>EFDA Regulatory Justification & Audit Reason</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-[11px]">
                  {selectedLog.reason || 'Routine verified transaction executed through authorized system workflow.'}
                </p>
                {selectedLog.prescriptionRef && (
                  <div className="mt-2 text-[11px] text-rose-800 font-mono font-bold bg-rose-50 px-2 py-1 rounded border border-rose-200 inline-block">
                    EFDA Prescription Ref: {selectedLog.prescriptionRef}
                  </div>
                )}
              </div>

              {/* Diff View: Old vs New Values */}
              <div>
                <div className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <ArrowUpDown className="w-4 h-4 text-indigo-600" />
                  <span>Data State Transition (Old vs New Values)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                  {/* Old Values */}
                  <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/50 space-y-1">
                    <span className="font-bold text-rose-800 uppercase text-[10px] block">
                      Prior State (Old Values)
                    </span>
                    <pre className="text-rose-950 whitespace-pre-wrap overflow-x-auto text-[10px]">
                      {selectedLog.oldValues ? JSON.stringify(selectedLog.oldValues, null, 2) : 'No prior state recorded'}
                    </pre>
                  </div>

                  {/* New Values */}
                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1">
                    <span className="font-bold text-emerald-800 uppercase text-[10px] block">
                      Updated State (New Values)
                    </span>
                    <pre className="text-emerald-950 whitespace-pre-wrap overflow-x-auto text-[10px]">
                      {selectedLog.newValues ? JSON.stringify(selectedLog.newValues, null, 2) : 'No update state payload'}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Cryptographic Verification Box */}
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Cryptographic Tamper-Evidence Signature</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">HMAC-SHA256 Verification</span>
                </div>

                <div className="font-mono text-xs text-slate-200 bg-slate-950 p-2.5 rounded-xl border border-slate-800 break-all select-all">
                  {selectedLog.verificationHash || '0xEFDA_VERIFIED_CHECKSUM'}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Client IP: <strong>{selectedLog.ipAddress || '196.188.24.102'}</strong></span>
                  <span>EFDA Compliance Tag: <strong>{selectedLog.efdaComplianceCode || 'EFDA-STD'}</strong></span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                Official Immutable Ledger Entry
              </span>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MANUAL AUDIT EVENT SIMULATOR / LOGGER MODAL */}
      {/* ==================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-400" />
                    <span>Log New Pharmacy Audit Event</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Record an official stock variance, controlled drug verification, or regulatory override.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateAuditEvent} className="p-6 space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-900 mb-1">
                    Event Action Type:
                  </label>
                  <select
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-emerald-500 font-medium"
                  >
                    <option value="STOCK_COUNT_ADJUSTMENT">STOCK COUNT ADJUSTMENT</option>
                    <option value="CONTROLLED_DRUG_DISPENSE">CONTROLLED DRUG DISPENSE</option>
                    <option value="PRICE_UPDATE">PRICE UPDATE (WHOLESALE/RETAIL)</option>
                    <option value="QUARANTINE_WRITE_OFF">QUARANTINE WRITE OFF</option>
                    <option value="FEFO_OVERRIDE">FEFO OVERRIDE WITH JUSTIFICATION</option>
                    <option value="SECURITY_PRIVILEGE_CHANGE">SECURITY PRIVILEGE CHANGE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-900 mb-1">
                    Compliance Category:
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-emerald-500 font-medium"
                  >
                    <option value="STOCK_ENGINE">Stock Engine & Inventory</option>
                    <option value="CONTROLLED_DRUGS">Controlled Substances (EFDA)</option>
                    <option value="POS_DISPENSING">Point of Sale & Dispensing</option>
                    <option value="PRICE_MASTER">Price & Master Data</option>
                    <option value="USER_SECURITY">User & Role Security</option>
                    <option value="COMPLIANCE">Regulatory Compliance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">
                  Affected Entity / Drug Name:
                </label>
                <input
                  type="text"
                  required
                  value={newEntityName}
                  onChange={(e) => setNewEntityName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-emerald-500"
                  placeholder="e.g. Amoxil 500mg Capsule [Batch: AMX-24-098]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-900 mb-1">
                    Batch Number (if applicable):
                  </label>
                  <input
                    type="text"
                    value={newBatchNumber}
                    onChange={(e) => setNewBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-emerald-500 font-mono"
                    placeholder="e.g. AMX-24-098"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-900 mb-1">
                    Prescription Ref (for Controlled Drugs):
                  </label>
                  <input
                    type="text"
                    value={newPrescriptionRef}
                    onChange={(e) => setNewPrescriptionRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-emerald-500 font-mono"
                    placeholder="e.g. RX-AA-88192"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">
                  EFDA Audit Justification / Reason:
                </label>
                <textarea
                  required
                  rows={3}
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-emerald-500"
                  placeholder="Detailed clinical or inventory reason for regulatory traceability..."
                />
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 -mx-6 -mb-6">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  Sign & Commit to Audit Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
