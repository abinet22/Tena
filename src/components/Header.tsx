import React, { useState } from 'react';
import {
  Building2, MapPin, UserCheck, Calendar, Globe,
  ShieldAlert, PlusCircle, CheckCircle2, ChevronDown, Clock,
  LogIn, UserPlus, CreditCard, LogOut, ShieldCheck, Sparkles,
  Menu
} from 'lucide-react';
import { Tenant, Location, RoleCode, User } from '../types/pharmacy';
import { formatDualDate } from '../utils/ethiopianCalendar';
import { translations } from '../utils/translations';

interface HeaderProps {
  tenants: Tenant[];
  currentTenant: Tenant;
  onSelectTenant: (tenant: Tenant) => void;
  onOpenSuperAdmin: () => void;
  locations: Location[];
  currentLocation: Location;
  onSelectLocation: (loc: Location) => void;
  currentRole: RoleCode;
  onSelectRole: (role: RoleCode) => void;
  language: 'en' | 'am';
  onToggleLanguage: () => void;
  useEthiopianCalendar: boolean;
  onToggleCalendar: () => void;
  currentUser?: User | null;
  onOpenAuth?: (mode?: 'LOGIN' | 'REGISTER' | 'PAYMENT' | 'VERIFICATION') => void;
  onLogout?: () => void;
  onOpenSaasPortal?: () => void;
  onGoToLanding?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tenants,
  currentTenant,
  onSelectTenant,
  onOpenSuperAdmin,
  locations,
  currentLocation,
  onSelectLocation,
  currentRole,
  onSelectRole,
  language,
  onToggleLanguage,
  useEthiopianCalendar,
  onToggleCalendar,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenSaasPortal,
  onGoToLanding,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const t = translations[language];
  const currentDate = new Date();
  const dualDateStr = formatDualDate(currentDate, language);

  const roleNames: Record<RoleCode, { en: string; am: string; color: string }> = {
    ADMIN: { en: 'Admin', am: 'ዋና አስተዳዳሪ', color: 'bg-rose-100 text-rose-800 border-rose-300' },
    INVENTORY_MANAGER: { en: 'Inventory Mgr', am: 'ስቶክ አስተዳዳሪ', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    SALES_MANAGER: { en: 'Sales Mgr', am: 'ሽያጭ አስተዳዳሪ', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    CASHIER_PHARMACIST: { en: 'Cashier / Dispenser', am: 'ገንዘብ ተቀባይ / ፋርማሲስት', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    CUSTOM: { en: 'Custom Role', am: 'ልዩ ሚና', color: 'bg-slate-100 text-slate-800 border-slate-300' },
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top Banner: Ethiopian dual-calendar and tenant subscription banner */}
      <div className="bg-slate-900 text-slate-200 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-medium text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            TenaPharm Multi-Tenant
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {dualDateStr}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">{t.calendar}:</span>
            <button
              onClick={onToggleCalendar}
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-emerald-300 transition-colors border border-slate-700"
              title="Toggle default calendar mode"
            >
              {useEthiopianCalendar ? '🇪🇹 ' + t.ethiopianCalendar : '🌐 ' + t.gregorianCalendar}
            </button>
          </div>

          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 transition-colors"
          >
            <Globe className="w-3 h-3" />
            {language === 'en' ? 'አማርኛ' : 'English'}
          </button>

          {/* Return to SaaS Landing Page */}
          {onGoToLanding && (
            <button
              onClick={onGoToLanding}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-600 transition-colors shadow-xs"
              title="Return to public SaaS Landing Page"
            >
              <Globe className="w-3 h-3 text-emerald-300" />
              <span>{language === 'am' ? 'የሳስ ዌብሳይት' : 'SaaS Website'}</span>
            </button>
          )}

          {/* Quick SaaS Onboarding & Auth Actions */}
          {onOpenAuth && (
            <div className="flex items-center gap-1.5 border-l border-slate-700 pl-2">
              <button
                onClick={() => onOpenAuth('REGISTER')}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs"
                title="Register a new pharmacy shop with wizard"
              >
                <PlusCircle className="w-3 h-3" />
                <span>{language === 'am' ? 'አዲስ ፋርማሲ' : 'Register Pharmacy'}</span>
              </button>
              <button
                onClick={() => onOpenAuth('PAYMENT')}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors"
                title="Telebirr / CBE payment simulator"
              >
                <CreditCard className="w-3 h-3 text-amber-400" />
                <span>{language === 'am' ? 'ክፍያ' : 'Pay & Activate'}</span>
              </button>
              <button
                onClick={() => onOpenAuth('LOGIN')}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <LogIn className="w-3 h-3 text-emerald-400" />
                <span>{language === 'am' ? 'ግባ' : 'Sign In'}</span>
              </button>
            </div>
          )}

          {onOpenSaasPortal ? (
            <button
              onClick={onOpenSaasPortal}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-violet-900 hover:bg-violet-800 text-violet-200 border border-violet-700 transition-colors"
              title="Open SaaS Platform Management Portal"
            >
              <ShieldCheck className="w-3 h-3 text-violet-300" />
              {language === 'am' ? 'የሳስ አድሚን' : 'SaaS Admin'}
            </button>
          ) : (
            <button
              onClick={onOpenSuperAdmin}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-violet-900 hover:bg-violet-800 text-violet-200 border border-violet-700 transition-colors"
            >
              <ShieldAlert className="w-3 h-3 text-violet-300" />
              {t.superAdmin}
            </button>
          )}
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Active Tenant */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label="Toggle navigation sidebar"
            >
              <Menu className="w-4 h-4 text-slate-700" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm font-bold text-lg">
            ጤ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                {language === 'am' ? 'ጤናፋርም' : 'TenaPharm'}
              </h1>
              <span className="text-[10px] tracking-wide uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                SaaS v1.0
              </span>
            </div>

            {/* Tenant Selector Dropdown */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <select
                aria-label="Select Pharmacy Tenant"
                value={currentTenant.id}
                onChange={(e) => {
                  const sel = tenants.find((item) => item.id === e.target.value);
                  if (sel) onSelectTenant(sel);
                }}
                className="text-xs font-semibold text-slate-800 bg-transparent hover:bg-slate-100 rounded px-1 py-0.5 cursor-pointer border border-transparent hover:border-slate-300 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
              >
                {tenants.map((ten) => (
                  <option key={ten.id} value={ten.id}>
                    {ten.name} ({ten.city}) - [{ten.plan}]
                  </option>
                ))}
              </select>

              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                  currentTenant.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : currentTenant.status === 'TRIAL'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {currentTenant.status}
              </span>
            </div>
          </div>
        </div>

        {/* Operational Context Controls: Location & Role Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Location Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <div className="text-left">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                {t.location}
              </span>
              <select
                aria-label="Select Current Location"
                value={currentLocation.id}
                onChange={(e) => {
                  const loc = locations.find((l) => l.id === e.target.value);
                  if (loc) onSelectLocation(loc);
                }}
                className="text-xs font-semibold text-slate-800 bg-transparent cursor-pointer focus:outline-hidden"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.type === 'STORE' ? 'Store / መጋዘን' : 'Dispensary / መሸጫ'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Role Switcher (Demonstrating RBAC & Cost Concealment) */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <div className="text-left">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                {t.role}
              </span>
              <select
                aria-label="Select Active User Role"
                value={currentRole}
                onChange={(e) => onSelectRole(e.target.value as RoleCode)}
                className="text-xs font-semibold text-slate-800 bg-transparent cursor-pointer focus:outline-hidden"
              >
                <option value="ADMIN">Admin (Dr. Dawit - Full Access)</option>
                <option value="INVENTORY_MANAGER">Inventory Manager (Rahel - GRN/Stock)</option>
                <option value="SALES_MANAGER">Sales Manager (Yared - Sales/Credit)</option>
                <option value="CASHIER_PHARMACIST">Cashier (Hiwot - Cost Price Hidden)</option>
              </select>
            </div>
          </div>

          {/* Role Badge Indicator */}
          <span
            className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${roleNames[currentRole]?.color}`}
          >
            {language === 'am' ? roleNames[currentRole]?.am : roleNames[currentRole]?.en}
          </span>

          {/* User Account / Session Profile */}
          <div className="relative">
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-300 focus:outline-hidden"
                  title="Click to view user account options"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-xs ${
                    currentUser.isPlatformAdmin ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 ring-2 ring-violet-400' : 'bg-emerald-600'
                  }`}>
                    {currentUser.isPlatformAdmin ? '👑' : currentUser.fullName.charAt(0)}
                  </div>
                  <div className="text-left hidden lg:block leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 max-w-[130px] truncate">
                        {currentUser.fullName}
                      </span>
                      {currentUser.isPlatformAdmin && (
                        <span className="bg-violet-100 text-violet-800 text-[9px] px-1.5 py-0.2 rounded font-bold">
                          SaaS Admin
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 truncate block max-w-[130px]">
                      {currentUser.email}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">{currentUser.fullName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700">
                          {currentUser.isPlatformAdmin ? 'Platform Super Administrator' : currentTenant.name}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      {currentUser.isPlatformAdmin && onOpenSaasPortal && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenSaasPortal();
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 flex items-center gap-2"
                        >
                          <ShieldCheck className="w-4 h-4 text-violet-600" />
                          <span>{language === 'am' ? 'የሳስ አድሚን ፖርታል' : 'SaaS Admin Portal'}</span>
                        </button>
                      )}

                      {onOpenAuth && (
                        <>
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onOpenAuth('LOGIN');
                            }}
                            className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <LogIn className="w-4 h-4 text-emerald-600" />
                            <span>{language === 'am' ? 'ተጠቃሚ ቀይር / ግባ' : 'Switch User / Login'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onOpenAuth('REGISTER');
                            }}
                            className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <UserPlus className="w-4 h-4 text-blue-600" />
                            <span>{language === 'am' ? 'አዲስ ፋርማሲ መዝግብ' : 'Register New Pharmacy'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onOpenAuth('PAYMENT');
                            }}
                            className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <CreditCard className="w-4 h-4 text-amber-600" />
                            <span>{language === 'am' ? 'ክፍያና ማረጋገጫ' : 'Subscription & Payment'}</span>
                          </button>
                        </>
                      )}

                      {onGoToLanding && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onGoToLanding();
                          }}
                          className="w-full text-left px-4 py-2 text-xs text-emerald-800 hover:bg-emerald-50 flex items-center gap-2 font-semibold"
                        >
                          <Globe className="w-4 h-4 text-emerald-600" />
                          <span>{language === 'am' ? 'የሳስ ዋና ገጽ (Website / Pricing)' : 'SaaS Website & Pricing'}</span>
                        </button>
                      )}
                    </div>

                    {onLogout && (
                      <div className="pt-1 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onLogout();
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          <span>{language === 'am' ? 'ውጣ' : 'Sign Out'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              onOpenAuth && (
                <button
                  onClick={() => onOpenAuth('LOGIN')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{language === 'am' ? 'ግባ / መዝግብ' : 'Sign In / Register'}</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
