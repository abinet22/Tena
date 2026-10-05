import React, { useState, useMemo } from 'react';
import {
  ShieldCheck, Building2, Users, CreditCard, DollarSign,
  Search, Filter, Plus, CheckCircle2, AlertTriangle, Ban,
  Eye, RefreshCw, Smartphone, Mail, MapPin, ExternalLink,
  Layers, ArrowRight, ShieldAlert, Sparkles, Check, X
} from 'lucide-react';
import { Tenant, User, SubscriptionPlan, SubscriptionStatus } from '../types/pharmacy';
import { formatDualDate } from '../utils/ethiopianCalendar';

interface SaasAdminViewProps {
  tenants: Tenant[];
  users: User[];
  currentTenant: Tenant;
  onSelectTenant: (tenant: Tenant) => void;
  onUpdateTenantStatus: (tenantId: string, status: SubscriptionStatus, paymentRef?: string) => void;
  onUpdateTenantPlan: (tenantId: string, plan: SubscriptionPlan) => void;
  onAddTenant: (newTenant: Omit<Tenant, 'id'>) => void;
  language: 'en' | 'am';
}

export const SaasAdminView: React.FC<SaasAdminViewProps> = ({
  tenants,
  users,
  currentTenant,
  onSelectTenant,
  onUpdateTenantStatus,
  onUpdateTenantPlan,
  onAddTenant,
  language,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'ALL'>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTenantDetails, setSelectedTenantDetails] = useState<Tenant | null>(null);

  // New tenant form in modal
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('Addis Ababa');
  const [newRegion, setNewRegion] = useState('Addis Ababa');
  const [newSubCity, setNewSubCity] = useState('Bole');
  const [newPhone, setNewPhone] = useState('+251 911 ');
  const [newEmail, setNewEmail] = useState('');
  const [newTin, setNewTin] = useState('');
  const [newLicense, setNewLicense] = useState('');
  const [newPlan, setNewPlan] = useState<SubscriptionPlan>('PROFESSIONAL');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Plan pricing constants in Ethiopian Birr
  const planRates: Record<SubscriptionPlan, number> = {
    STARTER: 2500,
    PROFESSIONAL: 4900,
    ENTERPRISE: 9500,
  };

  // Filtered tenants computation
  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesQuery =
          tenant.name.toLowerCase().includes(query) ||
          tenant.city.toLowerCase().includes(query) ||
          tenant.tinNumber.toLowerCase().includes(query) ||
          tenant.licenseNumber.toLowerCase().includes(query) ||
          tenant.email.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      if (statusFilter !== 'ALL' && tenant.status !== statusFilter) {
        return false;
      }

      if (regionFilter !== 'ALL' && tenant.region !== regionFilter) {
        return false;
      }

      return true;
    });
  }, [tenants, searchTerm, statusFilter, regionFilter]);

  // Executive Platform Metrics
  const totalPharmacies = tenants.length;
  const activePharmacies = tenants.filter((t) => t.status === 'ACTIVE').length;
  const trialPharmacies = tenants.filter((t) => t.status === 'TRIAL').length;
  const pendingPharmacies = tenants.filter((t) => t.status === 'PENDING_PAYMENT' || t.status === 'PENDING_VERIFICATION').length;
  const suspendedPharmacies = tenants.filter((t) => t.status === 'SUSPENDED').length;

  const totalMonthlyMrr = tenants
    .filter((t) => t.status === 'ACTIVE')
    .reduce((acc, t) => acc + (planRates[t.plan] || 0), 0);

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    onAddTenant({
      name: newName,
      slug,
      tinNumber: newTin || '00' + Math.floor(10000000 + Math.random() * 90000000),
      licenseNumber: newLicense || 'EFDA/LIC/' + Math.floor(1000 + Math.random() * 9000) + '/2026',
      region: newRegion,
      city: newCity,
      subCity: newSubCity,
      woreda: '01',
      phone: newPhone,
      email: newEmail,
      plan: newPlan,
      status: 'ACTIVE',
      paymentReference: 'CBE-SAAS-APPROVE-' + Math.floor(100000 + Math.random() * 900000),
      paymentMethod: 'CBE_BIRR',
      paymentAmount: planRates[newPlan],
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      useEthiopianCalendar: true,
      defaultLanguage: 'am',
      registeredAt: new Date().toISOString(),
    });

    setIsAddModalOpen(false);
    setNewName('');
    setNewEmail('');
    setToastMsg(`Pharmacy "${newName}" provisioned and activated by SaaS Admin!`);
    setTimeout(() => setToastMsg(null), 5000);
  };

  const handleToggleAccess = (tenant: Tenant) => {
    const nextStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    onUpdateTenantStatus(tenant.id, nextStatus, tenant.paymentReference);
    setToastMsg(`Status for "${tenant.name}" set to ${nextStatus}.`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {toastMsg && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span className="font-bold">{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-emerald-200 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Ethiopian Flag Top Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5 flex">
          <div className="h-full flex-1 bg-emerald-500"></div>
          <div className="h-full flex-1 bg-amber-400"></div>
          <div className="h-full flex-1 bg-rose-500"></div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
              <span>SaaS Platform Administration & Licensing Hub</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>National Pharmacy Tenants & Access Control</span>
            </h2>

            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Global administration console for TenaPharm platform owners. Monitor all registered pharmacies across Ethiopia, approve subscription payments, grant or suspend access, and switch context to manage isolated shop configurations.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Active Managing Pharmacy: <strong>{currentTenant.name}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Location: {currentTenant.city}, {currentTenant.region}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Provision New Pharmacy</span>
            </button>
          </div>
        </div>
      </div>

      {/* Platform Executive Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Total Registered Shops</span>
            <Building2 className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalPharmacies}</span>
            <span className="text-[10px] text-slate-500 font-bold">Ethiopia-wide</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Across 5 regional states
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-800 text-xs">
            <span className="font-bold">Active Subscriptions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{activePharmacies}</span>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">
              Paid / GPP
            </span>
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-1">
            Compliant with EFDA
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Pending Onboarding</span>
            <Smartphone className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">{pendingPharmacies}</span>
            <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.2 rounded">
              Payment/Verify
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Awaiting Telebirr/CBE confirmation
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-medium">Active Trials</span>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700">{trialPharmacies}</span>
            <span className="text-[10px] text-slate-500">30-day trials</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Free onboarding window
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs bg-violet-50/20">
          <div className="flex items-center justify-between text-violet-800 text-xs">
            <span className="font-bold">Monthly SaaS Revenue</span>
            <DollarSign className="w-4 h-4 text-violet-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-black text-violet-900">
              {totalMonthlyMrr.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-violet-700">ETB/mo</span>
          </div>
          <div className="text-[10px] text-violet-600 font-medium mt-1">
            Estimated platform MRR
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search pharmacy name, city, TIN, EFDA license, or email..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-emerald-500 bg-slate-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
          >
            <option value="ALL">All Account Statuses</option>
            <option value="ACTIVE">Active (Authorized)</option>
            <option value="PENDING_PAYMENT">Pending Payment</option>
            <option value="PENDING_VERIFICATION">Pending Email Verification</option>
            <option value="TRIAL">Trial Period</option>
            <option value="SUSPENDED">Suspended / Blocked</option>
          </select>

          {/* Region Filter */}
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
          >
            <option value="ALL">All Regions</option>
            <option value="Addis Ababa">Addis Ababa</option>
            <option value="Oromia">Oromia</option>
            <option value="Sidama">Sidama</option>
            <option value="Amhara">Amhara</option>
          </select>
        </div>
      </div>

      {/* Registered Pharmacy Tenants Directory Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 md:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Registered Pharmacy Directory ({filteredTenants.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Control access permissions, approve Ethiopian payment slips, and manage distinct company inventory configurations.
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            Multi-Tenant Isolation: Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <th className="py-3 px-4 text-center w-12">S/N</th>
                <th className="py-3 px-4 min-w-[200px]">Pharmacy Facility</th>
                <th className="py-3 px-4 min-w-[140px]">City & Region</th>
                <th className="py-3 px-4 min-w-[130px]">EFDA Premise Lic</th>
                <th className="py-3 px-4 min-w-[120px]">Plan & Fee</th>
                <th className="py-3 px-4 min-w-[120px]">Status</th>
                <th className="py-3 px-4 min-w-[150px]">Payment Reference</th>
                <th className="py-3 px-4 text-center min-w-[180px]">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTenants.map((tenant, idx) => {
                const isCurrentActive = currentTenant.id === tenant.id;
                const tenantUsersCount = users.filter((u) => u.tenantId === tenant.id).length;

                return (
                  <tr
                    key={tenant.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isCurrentActive ? 'bg-emerald-50/40 font-medium' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400 font-bold">
                      {idx + 1}
                    </td>

                    {/* Facility */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span>{tenant.name}</span>
                        {isCurrentActive && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-600 text-white">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>ID: <code className="font-mono text-slate-600">{tenant.id}</code></span>
                        <span>•</span>
                        <span>{tenantUsersCount} users</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                        {tenant.email}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{tenant.city}</div>
                      <div className="text-[11px] text-slate-500">
                        {tenant.subCity ? `${tenant.subCity}, ` : ''}{tenant.region}
                      </div>
                    </td>

                    {/* EFDA License */}
                    <td className="py-3.5 px-4 space-y-0.5">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 block truncate">
                        {tenant.licenseNumber}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 block">
                        TIN: {tenant.tinNumber}
                      </span>
                    </td>

                    {/* Plan & Fee */}
                    <td className="py-3.5 px-4 space-y-0.5">
                      <span className="font-bold text-slate-900 block">
                        {tenant.plan}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700">
                        {planRates[tenant.plan]?.toLocaleString()} ETB/mo
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          tenant.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : tenant.status === 'PENDING_PAYMENT'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : tenant.status === 'PENDING_VERIFICATION'
                            ? 'bg-sky-100 text-sky-800 border border-sky-300'
                            : tenant.status === 'TRIAL'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {tenant.status === 'ACTIVE' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {tenant.status === 'PENDING_PAYMENT' && <CreditCard className="w-3 h-3 text-amber-600" />}
                        {tenant.status === 'PENDING_VERIFICATION' && <Mail className="w-3 h-3 text-sky-600" />}
                        {tenant.status === 'SUSPENDED' && <Ban className="w-3 h-3 text-rose-600" />}
                        <span>{tenant.status.replace('_', ' ')}</span>
                      </span>
                    </td>

                    {/* Payment Reference */}
                    <td className="py-3.5 px-4 space-y-0.5">
                      {tenant.paymentReference ? (
                        <>
                          <span className="font-mono text-[10px] font-bold text-slate-800 block truncate">
                            {tenant.paymentReference}
                          </span>
                          <span className="text-[9px] text-emerald-600 font-semibold block">
                            Method: {tenant.paymentMethod || 'BANK'}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No payment ref</span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Switch to this pharmacy */}
                        <button
                          onClick={() => {
                            onSelectTenant(tenant);
                            setToastMsg(`Active workspace context switched to "${tenant.name}".`);
                            setTimeout(() => setToastMsg(null), 4000);
                          }}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Switch active system context to manage this pharmacy's medicine categories and stock"
                        >
                          <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Manage Shop</span>
                        </button>

                        {/* Approve / Activate Toggle */}
                        {tenant.status !== 'ACTIVE' ? (
                          <button
                            onClick={() => {
                              onUpdateTenantStatus(tenant.id, 'ACTIVE', tenant.paymentReference || 'SAAS-MANUAL-ACTIVATION');
                              setToastMsg(`Approved & activated "${tenant.name}"!`);
                              setTimeout(() => setToastMsg(null), 4000);
                            }}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Approve registration and give immediate active system access"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Activate</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleAccess(tenant)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Suspend pharmacy access"
                          >
                            <Ban className="w-3.5 h-3.5 text-rose-600" />
                            <span>Suspend</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PHARMACY MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Provision New Pharmacy (SaaS Admin)</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pharmacy Trade Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. St. Paul Referral Outpost Pharmacy"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">TIN Number</label>
                  <input
                    type="text"
                    value={newTin}
                    onChange={(e) => setNewTin(e.target.value)}
                    placeholder="e.g. 0044881122"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">EFDA License Number</label>
                  <input
                    type="text"
                    value={newLicense}
                    onChange={(e) => setNewLicense(e.target.value)}
                    placeholder="e.g. EFDA/LIC/AA/2026/0122"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Region</label>
                  <select
                    value={newRegion}
                    onChange={(e) => {
                      setNewRegion(e.target.value);
                      setNewCity(e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500"
                  >
                    <option value="Addis Ababa">Addis Ababa</option>
                    <option value="Oromia">Oromia</option>
                    <option value="Sidama">Sidama</option>
                    <option value="Amhara">Amhara</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sub-City</label>
                  <input
                    type="text"
                    value={newSubCity}
                    onChange={(e) => setNewSubCity(e.target.value)}
                    placeholder="e.g. Kirkos"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="contact@stpaulpharm.et"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Subscription Plan</label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500 font-bold"
                  >
                    <option value="STARTER">Starter (2,500 ETB/mo)</option>
                    <option value="PROFESSIONAL">Professional (4,900 ETB/mo)</option>
                    <option value="ENTERPRISE">Enterprise (9,500 ETB/mo)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-sm"
                >
                  Provision & Activate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
