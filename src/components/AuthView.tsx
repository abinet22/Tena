import React, { useState } from 'react';
import {
  Lock, Mail, Phone, Building2, ShieldCheck, CheckCircle2,
  AlertTriangle, ArrowRight, Eye, EyeOff, Sparkles, CreditCard,
  Smartphone, RefreshCw, Key, UserCheck, HelpCircle, X,
  ExternalLink, QrCode, Send, ArrowLeft, Check, Copy, CheckSquare
} from 'lucide-react';
import {
  Tenant, User, SubscriptionPlan, SubscriptionStatus, RoleCode
} from '../types/pharmacy';
import { formatDualDate } from '../utils/ethiopianCalendar';

export type AuthMode = 'LOGIN' | 'REGISTER' | 'PAYMENT' | 'VERIFICATION';

interface AuthViewProps {
  initialMode?: AuthMode;
  onClose?: () => void;
  tenants: Tenant[];
  users: User[];
  onLoginSuccess: (user: User, tenant?: Tenant) => void;
  onRegisterTenant: (newTenantData: Omit<Tenant, 'id'>, adminUserData: Omit<User, 'id' | 'tenantId'>) => { tenant: Tenant; user: User };
  onUpdateTenantPayment: (tenantId: string, paymentMethod: 'TELEBIRR' | 'CBE_BIRR' | 'CHAPA_BANK', paymentRef: string, amount: number) => void;
  onVerifyTenantAccount: (tenantId: string, activationCode: string) => boolean;
  language: 'en' | 'am';
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'LOGIN',
  onClose,
  tenants,
  users,
  onLoginSuccess,
  onRegisterTenant,
  onUpdateTenantPayment,
  onVerifyTenantAccount,
  language,
}) => {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);

  // ------------------------------------------------------------------
  // Login Form State
  // ------------------------------------------------------------------
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginRoleFilter, setLoginRoleFilter] = useState<'ALL' | 'SAAS_ADMIN' | 'PHARMACY_STAFF'>('ALL');

  // ------------------------------------------------------------------
  // Registration Form State (Wizard)
  // ------------------------------------------------------------------
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [pharmacyName, setPharmacyName] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [region, setRegion] = useState('Addis Ababa');
  const [city, setCity] = useState('Addis Ababa');
  const [subCity, setSubCity] = useState('Bole');
  const [woreda, setWoreda] = useState('03');
  const [pharmacyPhone, setPharmacyPhone] = useState('+251 911 ');
  const [pharmacyEmail, setPharmacyEmail] = useState('');

  // Admin account details
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('+251 912 ');
  const [adminPassword, setAdminPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('PROFESSIONAL');
  const [regError, setRegError] = useState<string | null>(null);

  // ------------------------------------------------------------------
  // Payment Flow State
  // ------------------------------------------------------------------
  const [paymentTenantId, setPaymentTenantId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'TELEBIRR' | 'CBE_BIRR' | 'CHAPA_BANK'>('TELEBIRR');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(4900);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // ------------------------------------------------------------------
  // Verification / Email Code State
  // ------------------------------------------------------------------
  const [verifyTenantId, setVerifyTenantId] = useState<string>('');
  const [enteredCode, setEnteredCode] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [simulatedEmailOpen, setSimulatedEmailOpen] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // Track currently onboarding tenant
  const activeOnboardingTenant = tenants.find((t) => t.id === (paymentTenantId || verifyTenantId));

  // Plan pricing constants in Ethiopian Birr
  const planPrices: Record<SubscriptionPlan, { etb: number; name: string; desc: string; maxLocs: string }> = {
    STARTER: {
      etb: 2500,
      name: 'Starter Community Pharmacy',
      desc: 'Ideal for independent retail counters & neighborhood drugstores',
      maxLocs: '1 Dispensary Counter',
    },
    PROFESSIONAL: {
      etb: 4900,
      name: 'Growth & Multi-Location',
      desc: 'Store + Dispensary replenishment, FEFO POS, and EFDA expiry audit tools',
      maxLocs: '1 Store Warehouse + 2 Dispensary Branches',
    },
    ENTERPRISE: {
      etb: 9500,
      name: 'Hospital & Wholesale Network',
      desc: 'Unlimited locations, wholesale supply dispatches, custom RLS, and priority support',
      maxLocs: 'Unlimited Branches & Storage Warehouses',
    },
  };

  // ------------------------------------------------------------------
  // Login Handler
  // ------------------------------------------------------------------
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    setTimeout(() => {
      const emailQuery = loginEmail.trim().toLowerCase();
      const matchedUser = users.find(
        (u) => u.email.toLowerCase() === emailQuery || (emailQuery.includes('admin') && u.isPlatformAdmin)
      );

      if (!matchedUser) {
        setLoginError('No user account found with this email address. Please check credentials or register your pharmacy.');
        setLoginLoading(false);
        return;
      }

      if (matchedUser.password && loginPassword && matchedUser.password !== loginPassword) {
        setLoginError('Invalid password. Default demo password is "password123" or "admin123".');
        setLoginLoading(false);
        return;
      }

      // Check tenant status if not platform super admin
      if (!matchedUser.isPlatformAdmin) {
        const tenant = tenants.find((t) => t.id === matchedUser.tenantId);
        if (tenant) {
          if (tenant.status === 'PENDING_PAYMENT') {
            setPaymentTenantId(tenant.id);
            setPaymentAmount(planPrices[tenant.plan]?.etb || 4900);
            setAuthMode('PAYMENT');
            setLoginLoading(false);
            return;
          }
          if (tenant.status === 'PENDING_VERIFICATION') {
            setVerifyTenantId(tenant.id);
            setAuthMode('VERIFICATION');
            setLoginLoading(false);
            return;
          }
          if (tenant.status === 'SUSPENDED') {
            setLoginError(`Account for "${tenant.name}" is currently SUSPENDED by the SaaS Super Admin. Contact support@tenapharm.et.`);
            setLoginLoading(false);
            return;
          }
        }
      }

      const tenant = tenants.find((t) => t.id === matchedUser.tenantId);
      onLoginSuccess(matchedUser, tenant);
      setLoginLoading(false);
      if (onClose) onClose();
    }, 400);
  };

  // Quick Demo Login Helper
  const handleQuickLogin = (email: string) => {
    setLoginEmail(email);
    setLoginPassword('password123');
    const matchedUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (matchedUser) {
      if (matchedUser.isPlatformAdmin) {
        onLoginSuccess(matchedUser, undefined);
        if (onClose) onClose();
        return;
      }
      const tenant = tenants.find((t) => t.id === matchedUser.tenantId);
      if (tenant?.status === 'PENDING_PAYMENT') {
        setPaymentTenantId(tenant.id);
        setPaymentAmount(planPrices[tenant.plan]?.etb || 4900);
        setAuthMode('PAYMENT');
        return;
      }
      if (tenant?.status === 'PENDING_VERIFICATION') {
        setVerifyTenantId(tenant.id);
        setAuthMode('VERIFICATION');
        return;
      }
      onLoginSuccess(matchedUser, tenant);
      if (onClose) onClose();
    }
  };

  // ------------------------------------------------------------------
  // Registration Handler
  // ------------------------------------------------------------------
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!pharmacyName.trim() || !pharmacyEmail.trim() || !adminFullName.trim() || !adminEmail.trim()) {
      setRegError('Please complete all required fields.');
      return;
    }

    const slug = pharmacyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const price = planPrices[selectedPlan].etb;

    const newTenantData: Omit<Tenant, 'id'> = {
      name: pharmacyName,
      slug,
      tinNumber: tinNumber || '00' + Math.floor(10000000 + Math.random() * 90000000),
      licenseNumber: licenseNumber || 'EFDA/LIC/' + Math.floor(1000 + Math.random() * 9000) + '/2026',
      region,
      city,
      subCity,
      woreda: woreda || '01',
      phone: pharmacyPhone,
      email: pharmacyEmail,
      plan: selectedPlan,
      status: 'PENDING_PAYMENT',
      paymentAmount: price,
      activationCode: String(Math.floor(100000 + Math.random() * 900000)),
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      useEthiopianCalendar: true,
      defaultLanguage: 'am',
      registeredAt: new Date().toISOString(),
    };

    const adminUserData: Omit<User, 'id' | 'tenantId'> = {
      fullName: adminFullName,
      email: adminEmail,
      phone: adminPhone,
      password: adminPassword || 'password123',
      roleId: 'r-admin',
      isPlatformAdmin: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    try {
      const result = onRegisterTenant(newTenantData, adminUserData);
      setPaymentTenantId(result.tenant.id);
      setPaymentAmount(price);
      setVerifyTenantId(result.tenant.id);
      setAuthMode('PAYMENT');
    } catch (err: any) {
      setRegError(err?.message || 'Error completing registration');
    }
  };

  // ------------------------------------------------------------------
  // Payment Submission Handler
  // ------------------------------------------------------------------
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTenantId) return;
    setIsProcessingPayment(true);

    const ref = paymentRef.trim() || `${paymentMethod === 'TELEBIRR' ? 'TEL' : 'CBE'}-TXN-${Math.floor(100000 + Math.random() * 900000)}`;

    setTimeout(() => {
      onUpdateTenantPayment(paymentTenantId, paymentMethod, ref, paymentAmount);
      setIsProcessingPayment(false);
      setPaymentSuccess(true);
      setVerifyTenantId(paymentTenantId);

      setTimeout(() => {
        setAuthMode('VERIFICATION');
      }, 1000);
    }, 800);
  };

  // ------------------------------------------------------------------
  // Verification Submission Handler
  // ------------------------------------------------------------------
  const handleVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);

    const cleanCode = enteredCode.trim();
    if (!cleanCode) {
      setVerifyError('Please enter the 6-digit verification code.');
      return;
    }

    const success = onVerifyTenantAccount(verifyTenantId, cleanCode);
    if (!success) {
      setVerifyError('Invalid activation code. Please check the simulated email inbox below.');
      return;
    }

    // Activated! Automatically log in as the pharmacy admin
    const activatedTenant = tenants.find((t) => t.id === verifyTenantId);
    const tenantUser = users.find((u) => u.tenantId === verifyTenantId);

    if (tenantUser && activatedTenant) {
      onLoginSuccess(tenantUser, { ...activatedTenant, status: 'ACTIVE' });
      if (onClose) onClose();
    }
  };

  // Quick auto-fill activation code from simulated email
  const handleFillCode = (code: string) => {
    setEnteredCode(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col md:flex-row relative">
        {/* Close Button if modal mode */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* LEFT BRANDING PANEL */}
        <div className="md:w-5/12 bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-950 p-6 md:p-8 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Ethiopian Flag Top Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1.5 flex">
            <div className="h-full flex-1 bg-emerald-500"></div>
            <div className="h-full flex-1 bg-amber-400"></div>
            <div className="h-full flex-1 bg-rose-500"></div>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-500/30">
                ጤ
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight">TenaPharm</h1>
                <span className="text-[10px] text-emerald-300 font-mono tracking-wider block">
                  ETHIOPIAN PHARMACY SAAS
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Multi-Tenant EFDA Platform</span>
              </div>
              <h2 className="text-lg font-bold text-slate-100 leading-snug">
                One platform controlling all registered Ethiopian pharmacies.
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Seamless multi-role access: SaaS Admin monitors nationwide pharmacies, while individual pharmacy shops register, pay via Telebirr or CBE Birr, activate via email, and manage isolated inventory configurations.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-2 pt-3 text-xs text-slate-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>SaaS Admin: Global nationwide control & licensing</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Shop Registration & instant activation code</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Strict multi-company tenant data separation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Telebirr & CBE Birr subscription payment flows</span>
              </div>
            </div>
          </div>

          {/* Stepper Status Indicator for Registration Flow */}
          {authMode !== 'LOGIN' && (
            <div className="relative z-10 pt-6 mt-6 border-t border-emerald-900/60 text-xs">
              <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold block mb-2">
                Pharmacy Onboarding Progress
              </span>
              <div className="flex items-center gap-2">
                <div className={`flex-1 h-1.5 rounded-full ${authMode === 'REGISTER' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
                <div className={`flex-1 h-1.5 rounded-full ${authMode === 'PAYMENT' ? 'bg-amber-400' : authMode === 'VERIFICATION' ? 'bg-emerald-400' : 'bg-slate-700'}`}></div>
                <div className={`flex-1 h-1.5 rounded-full ${authMode === 'VERIFICATION' ? 'bg-amber-400' : 'bg-slate-700'}`}></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
                <span>1. Register</span>
                <span>2. Pay</span>
                <span>3. Verify</span>
              </div>
            </div>
          )}

          <div className="relative z-10 pt-4 text-[10px] text-slate-400 flex items-center justify-between">
            <span>v1.0 • EFDA Directive 981/2023</span>
            <span>Ethiopian Calendar (EC/GC)</span>
          </div>
        </div>

        {/* RIGHT INTERACTIVE CONTENT PANEL */}
        <div className="md:w-7/12 p-6 md:p-8 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
          {/* ==================================================================== */}
          {/* 1. LOGIN MODE */}
          {/* ==================================================================== */}
          {authMode === 'LOGIN' && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-extrabold text-slate-900">
                    Sign in to TenaPharm
                  </h3>
                  <button
                    onClick={() => setAuthMode('REGISTER')}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    Register Pharmacy &rarr;
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your user credentials or select a one-click demo role below.
                </p>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address or Username
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="e.g. admin@tenapharm.et or dawit@abyssiniapharmacy.et"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-500 bg-slate-50/50"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">Password</label>
                    <span className="text-[11px] text-slate-400">Default demo: password123</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter password..."
                      className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-500 bg-slate-50/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loginLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Fast One-Click Demo Switcher */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Quick One-Click Demo Logins
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Instant Access</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* SaaS Super Admin */}
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin@tenapharm.et')}
                    className="p-2.5 rounded-xl border border-violet-200 bg-violet-50/70 hover:bg-violet-100 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-violet-900 group-hover:text-violet-950 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-violet-600" />
                        SaaS Super Admin
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-violet-200 text-violet-800">
                        Platform
                      </span>
                    </div>
                    <span className="text-[10px] text-violet-700 block mt-0.5 truncate">
                      admin@tenapharm.et (Controls all shops)
                    </span>
                  </button>

                  {/* Abyssinia Central Pharmacy Admin */}
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('dawit@abyssiniapharmacy.et')}
                    className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 group-hover:text-emerald-950 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                        Abyssinia Central
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-800">
                        Active
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-700 block mt-0.5 truncate">
                      dawit@abyssiniapharmacy.et (Owner)
                    </span>
                  </button>

                  {/* Selam Community Pharmacy */}
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('selam.pharm@gmail.com')}
                    className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900 group-hover:text-blue-950 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        Selam Community
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-200 text-blue-800">
                        Active
                      </span>
                    </div>
                    <span className="text-[10px] text-blue-700 block mt-0.5 truncate">
                      selam.pharm@gmail.com (Hawassa)
                    </span>
                  </button>

                  {/* Pending Payment Pharmacy */}
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('adama.cure@ethiocure.et')}
                    className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 group-hover:text-amber-950 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                        EthioCure Pharmacy
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-800">
                        Pay Required
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-700 block mt-0.5 truncate">
                      adama.cure@ethiocure.et (Test Pay)
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 2. REGISTRATION MODE (WIZARD) */}
          {/* ==================================================================== */}
          {authMode === 'REGISTER' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    Register New Pharmacy Shop
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Step {regStep} of 3: {regStep === 1 ? 'Facility & Licensing' : regStep === 2 ? 'Lead Pharmacist Credentials' : 'Subscription Plan'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthMode('LOGIN')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  &larr; Back to Login
                </button>
              </div>

              {regError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {/* STEP 1: FACILITY DETAILS */}
                {regStep === 1 && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="md:col-span-2">
                        <label className="block font-semibold text-slate-700 mb-1">
                          Pharmacy Trade Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={pharmacyName}
                          onChange={(e) => setPharmacyName(e.target.value)}
                          placeholder="e.g. Tikur Anbessa Annex Pharmacy"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          TIN Number (Ethiopian Revenue) *
                        </label>
                        <input
                          type="text"
                          required
                          value={tinNumber}
                          onChange={(e) => setTinNumber(e.target.value)}
                          placeholder="e.g. 0029384756"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          EFDA Facility License # *
                        </label>
                        <input
                          type="text"
                          required
                          value={licenseNumber}
                          onChange={(e) => setLicenseNumber(e.target.value)}
                          placeholder="e.g. EFDA/LIC/AA/2026/0991"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Region / City</label>
                        <select
                          value={region}
                          onChange={(e) => {
                            setRegion(e.target.value);
                            setCity(e.target.value);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500"
                        >
                          <option value="Addis Ababa">Addis Ababa / አዲስ አበባ</option>
                          <option value="Oromia">Oromia (Adama, Bishoftu, Jimma)</option>
                          <option value="Sidama">Sidama (Hawassa)</option>
                          <option value="Amhara">Amhara (Bahir Dar, Gondar)</option>
                          <option value="Tigray">Tigray (Mekelle)</option>
                          <option value="Dire Dawa">Dire Dawa / ድሬዳዋ</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Sub-City / Woreda</label>
                        <input
                          type="text"
                          value={subCity}
                          onChange={(e) => setSubCity(e.target.value)}
                          placeholder="e.g. Bole Sub-city, Woreda 03"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Pharmacy Phone</label>
                        <input
                          type="text"
                          required
                          value={pharmacyPhone}
                          onChange={(e) => setPharmacyPhone(e.target.value)}
                          placeholder="+251 911 234 567"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Official Facility Email *</label>
                        <input
                          type="email"
                          required
                          value={pharmacyEmail}
                          onChange={(e) => setPharmacyEmail(e.target.value)}
                          placeholder="contact@pharmacyname.et"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        disabled={!pharmacyName.trim() || !pharmacyEmail.trim()}
                        onClick={() => setRegStep(2)}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <span>Next: Pharmacist Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: LEAD PHARMACIST CREDENTIALS */}
                {regStep === 2 && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        This person will be designated as the <strong>Lead Pharmacist / Technical Manager</strong> with administrative rights over this facility.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="md:col-span-2">
                        <label className="block font-semibold text-slate-700 mb-1">
                          Pharmacist Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={adminFullName}
                          onChange={(e) => setAdminFullName(e.target.value)}
                          placeholder="e.g. Dr. Meron Girma (Lead Pharmacist)"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Administrator Login Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder="e.g. meron@pharmacy.et"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Mobile Phone (Telebirr/SMS)</label>
                        <input
                          type="text"
                          required
                          value={adminPhone}
                          onChange={(e) => setAdminPhone(e.target.value)}
                          placeholder="+251 912 345 678"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block font-semibold text-slate-700 mb-1">Create Secure Password *</label>
                        <input
                          type="password"
                          required
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="Minimum 8 characters..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => setRegStep(1)}
                        className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs"
                      >
                        &larr; Back
                      </button>
                      <button
                        type="button"
                        disabled={!adminFullName.trim() || !adminEmail.trim()}
                        onClick={() => setRegStep(3)}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <span>Next: Select Plan</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: PLAN SELECTION & SUBMISSION */}
                {regStep === 3 && (
                  <div className="space-y-3 animate-fadeIn">
                    <span className="text-xs font-semibold text-slate-700 block">
                      Choose Monthly Subscription Tier:
                    </span>

                    <div className="grid grid-cols-1 gap-2.5 text-xs">
                      {(['STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as SubscriptionPlan[]).map((p) => {
                        const planInfo = planPrices[p];
                        const isSelected = selectedPlan === p;
                        return (
                          <div
                            key={p}
                            onClick={() => setSelectedPlan(p)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className="font-bold text-slate-900">{planInfo.name}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-extrabold text-emerald-700">
                                  {planInfo.etb.toLocaleString()} ETB
                                </span>
                                <span className="text-[10px] text-slate-500 block">/ month</span>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1 pl-6">
                              {planInfo.desc} • <strong>{planInfo.maxLocs}</strong>
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
                      💳 After registration, you will be redirected to the secure <strong>Telebirr / CBE Birr</strong> payment checkout, followed by email verification code dispatch to activate your account.
                    </div>

                    <div className="pt-2 flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => setRegStep(2)}
                        className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs"
                      >
                        &larr; Back
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                      >
                        <span>Confirm & Proceed to Payment</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 3. PAYMENT MODE */}
          {/* ==================================================================== */}
          {authMode === 'PAYMENT' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    SaaS Subscription Payment
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pay subscription fee to activate pharmacy workspace.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthMode('LOGIN')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  &larr; Sign In
                </button>
              </div>

              {/* Pharmacy Summary Banner */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                    Target Pharmacy Shop
                  </span>
                  <span className="text-sm font-bold text-white">
                    {activeOnboardingTenant?.name || 'Your Registered Pharmacy'}
                  </span>
                  <span className="text-xs text-emerald-400 block mt-0.5 font-medium">
                    Plan: {activeOnboardingTenant?.plan || 'PROFESSIONAL'} Tier
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Total Due:</span>
                  <span className="text-xl font-black text-emerald-300">
                    {paymentAmount.toLocaleString()} ETB
                  </span>
                  <span className="text-[10px] text-slate-400 block">per month</span>
                </div>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
                <span className="text-xs font-semibold text-slate-700 block">
                  Select Ethiopian Payment Channel:
                </span>

                {/* Payment Channel Radio Options */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div
                    onClick={() => setPaymentMethod('TELEBIRR')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      paymentMethod === 'TELEBIRR'
                        ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-400/20'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-sky-600" />
                      <span className="font-bold text-slate-900">Telebirr (ቴሌብር)</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Merchant Paybill: <strong>882910</strong>
                    </span>
                  </div>

                  <div
                    onClick={() => setPaymentMethod('CBE_BIRR')}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      paymentMethod === 'CBE_BIRR'
                        ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400/20'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-600" />
                      <span className="font-bold text-slate-900">CBE Birr (ንግድ ባንክ)</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      CBE A/C: <strong>1000192837465</strong>
                    </span>
                  </div>
                </div>

                {/* Instructions Box based on chosen payment */}
                {paymentMethod === 'TELEBIRR' ? (
                  <div className="p-3 bg-sky-50/80 rounded-2xl border border-sky-200 text-xs text-sky-950 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-sky-900">
                      <QrCode className="w-4 h-4 text-sky-600" />
                      <span>Telebirr USSD & QR Code Payment</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Dial <strong>*127#</strong> or open Telebirr App &rarr; Pay Merchant &rarr; Enter Merchant Code <strong>882910 (TenaPharm PLC)</strong> &rarr; Amount <strong>{paymentAmount.toLocaleString()} ETB</strong>. Enter your Transaction Reference ID below.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-purple-50/80 rounded-2xl border border-purple-200 text-xs text-purple-950 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-purple-900">
                      <Building2 className="w-4 h-4 text-purple-600" />
                      <span>Commercial Bank of Ethiopia (CBE Birr)</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Transfer to CBE Account <strong>1000192837465 (TenaPharm Software Technologies PLC)</strong> or CBE Birr Shortcode <strong>99120</strong>. Copy your 12-digit transaction confirmation number.
                    </p>
                  </div>
                )}

                {/* Transaction Reference Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Payment Transaction Reference Number *
                    </label>
                    <button
                      type="button"
                      onClick={() => setPaymentRef(`${paymentMethod === 'TELEBIRR' ? 'TEL' : 'CBE'}-TXN-${Math.floor(100000 + Math.random() * 900000)}`)}
                      className="text-[10px] text-emerald-600 font-bold hover:underline"
                    >
                      Generate Mock Ref
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="e.g. TEL-TXN-881290 or CBE-20261005-9921"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-emerald-500 font-mono"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyTenantId(paymentTenantId);
                      setAuthMode('VERIFICATION');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                  >
                    Already paid? Enter activation code &rarr;
                  </button>

                  <button
                    type="submit"
                    disabled={isProcessingPayment}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingPayment ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying with EthSwitch...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Payment & Request Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ==================================================================== */}
          {/* 4. EMAIL VERIFICATION & ACTIVATION MODE */}
          {/* ==================================================================== */}
          {authMode === 'VERIFICATION' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    Verify Email & Activate Pharmacy
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter the 6-digit activation code sent to your registered email address.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthMode('LOGIN')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  &larr; Back to Login
                </button>
              </div>

              {verifyError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{verifyError}</span>
                </div>
              )}

              {/* SIMULATED EMAIL INBOX PREVIEW WIDGET */}
              <div className="bg-slate-900 rounded-2xl p-4 text-white border border-slate-800 shadow-md space-y-2.5">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-bold text-emerald-400">Simulated Incoming Email</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">From: accounts@tenapharm.et</span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="text-slate-300">
                    <strong>To:</strong> {activeOnboardingTenant?.email || 'registered-pharmacist@email.com'}
                  </div>
                  <div className="text-slate-300">
                    <strong>Subject:</strong> 🇪🇹 Welcome to TenaPharm — Activate Your Pharmacy Account
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs space-y-2">
                  <p className="text-slate-200 leading-relaxed text-[11px]">
                    Dear Technical Manager of <strong>{activeOnboardingTenant?.name || 'Your Pharmacy'}</strong>, your subscription payment has been acknowledged. Please use the activation code below to unlock your workspace.
                  </p>
                  <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Your 6-Digit PIN:</span>
                      <span className="text-xl font-black text-amber-300 font-mono tracking-widest">
                        {activeOnboardingTenant?.activationCode || '849201'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFillCode(activeOnboardingTenant?.activationCode || '849201')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedCode ? 'Filled!' : 'Auto-Fill'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Code Verification Input Form */}
              <form onSubmit={handleVerificationSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enter 6-Digit Activation PIN
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={enteredCode}
                    onChange={(e) => setEnteredCode(e.target.value)}
                    placeholder="e.g. 849201"
                    className="w-full text-center tracking-[0.5em] text-lg font-black py-2.5 rounded-xl border-2 border-emerald-500 focus:outline-emerald-600 font-mono bg-emerald-50/30 text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Activate Account & Launch Pharmacy</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
