import React, { useState } from 'react';
import { X, Building2, ShieldCheck, CheckCircle2, AlertTriangle, Plus, CreditCard, Ban } from 'lucide-react';
import { Tenant, SubscriptionPlan, SubscriptionStatus } from '../types/pharmacy';

interface SuperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenants: Tenant[];
  onUpdateTenantStatus: (tenantId: string, status: SubscriptionStatus, paymentRef?: string) => void;
  onAddTenant: (newTenant: Omit<Tenant, 'id'>) => void;
  language: 'en' | 'am';
}

export const SuperAdminModal: React.FC<SuperAdminModalProps> = ({
  isOpen,
  onClose,
  tenants,
  onUpdateTenantStatus,
  onAddTenant,
  language,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [paymentRefInput, setPaymentRefInput] = useState<Record<string, string>>({});

  // New tenant form state
  const [name, setName] = useState('');
  const [city, setCity] = useState('Addis Ababa');
  const [region, setRegion] = useState('Addis Ababa');
  const [subCity, setSubCity] = useState('Bole');
  const [phone, setPhone] = useState('+251 ');
  const [email, setEmail] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [plan, setPlan] = useState<SubscriptionPlan>('PROFESSIONAL');

  if (!isOpen) return null;

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    onAddTenant({
      name,
      slug,
      tinNumber: tinNumber || '0011223344',
      licenseNumber: licenseNumber || 'EFDA/LIC/NEW/2026',
      region,
      city,
      subCity,
      woreda: '01',
      phone,
      email,
      plan,
      status: 'ACTIVE',
      paymentReference: 'CBE-INIT-' + Math.floor(100000 + Math.random() * 900000),
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      useEthiopianCalendar: true,
      defaultLanguage: 'am',
    });

    setShowAddForm(false);
    setName('');
    setEmail('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {language === 'am' ? 'ሱፐር አድሚን - የፋርማሲዎችና ሰብስክሪፕሽን አስተዳደር' : 'Super Admin - Pharmacy Tenants & Billing'}
              </h2>
              <p className="text-xs text-slate-300">
                Manage SaaS tenant subscriptions, manual CBE/Telebirr payment approvals, and activations.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Registered Pharmacy Tenants ({tenants.length})
              </h3>
              <p className="text-xs text-slate-500">
                Single database architecture with PostgreSQL Row-Level Security isolation.
              </p>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Register New Pharmacy
            </button>
          </div>

          {/* Add Tenant Form */}
          {showAddForm && (
            <form onSubmit={handleCreateTenant} className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Register New Ethiopian Pharmacy Tenant
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Pharmacy Trade Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Medhanialem Community Pharmacy"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">City / Region *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Addis Ababa, Hawassa, Adama..."
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">EFDA License Number</label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="EFDA/LIC/AA/2026/..."
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">TIN Number (Ethiopian Tax ID)</label>
                  <input
                    type="text"
                    value={tinNumber}
                    onChange={(e) => setTinNumber(e.target.value)}
                    placeholder="10-digit TIN"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Admin Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pharmacist@pharmacy.et"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Subscription Plan</label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value as SubscriptionPlan)}
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="STARTER">Starter (Single Dispensary)</option>
                    <option value="PROFESSIONAL">Professional (Store + Dispensary)</option>
                    <option value="ENTERPRISE">Enterprise (Multi-branch + EFDA API)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Provision Tenant
                </button>
              </div>
            </form>
          )}

          {/* Tenants List */}
          <div className="space-y-3">
            {tenants.map((ten) => {
              const currentRef = paymentRefInput[ten.id] ?? (ten.paymentReference || '');
              return (
                <div
                  key={ten.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{ten.name}</span>
                        <span className="text-[11px] font-mono text-slate-400">/{ten.slug}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            ten.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : ten.status === 'TRIAL'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {ten.status}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {ten.plan} Plan
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span>📍 {ten.city}, {ten.region} ({ten.subCity || 'Bole'})</span>
                        <span>📞 {ten.phone}</span>
                        <span>✉️ {ten.email}</span>
                        <span>EFDA: {ten.licenseNumber || 'EFDA/LIC/0982'}</span>
                        <span>TIN: {ten.tinNumber || '0029384756'}</span>
                      </div>
                    </div>

                    {/* Quick Status Toggles */}
                    <div className="flex items-center gap-2">
                      {ten.status !== 'ACTIVE' ? (
                        <button
                          onClick={() => onUpdateTenantStatus(ten.id, 'ACTIVE', currentRef || 'MANUAL-APPROVAL')}
                          className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Activate
                        </button>
                      ) : (
                        <button
                          onClick={() => onUpdateTenantStatus(ten.id, 'SUSPENDED')}
                          className="flex items-center gap-1 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Suspend
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Manual Payment Verification (Telebirr / CBE) */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-2.5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-slate-500" />
                      <span className="font-medium text-slate-700">Manual Payment Confirmation:</span>
                      <input
                        type="text"
                        placeholder="e.g. CBE-TXN-88392 or Telebirr Ref"
                        value={currentRef}
                        onChange={(e) =>
                          setPaymentRefInput({ ...paymentRefInput, [ten.id]: e.target.value })
                        }
                        className="px-2 py-1 bg-white rounded border border-slate-300 text-slate-800 text-xs w-56 focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        onClick={() => {
                          onUpdateTenantStatus(ten.id, 'ACTIVE', currentRef);
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium text-xs transition-colors"
                      >
                        Confirm & Renew
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Payment Ref: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{ten.paymentReference || 'None on file'}</code>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
          >
            Close Super Admin
          </button>
        </div>
      </div>
    </div>
  );
};
