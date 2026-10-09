import React, { useState } from 'react';
import {
  Menu, Globe, ShieldCheck, PlusCircle,
  Clock, SlidersHorizontal, ChevronDown, Check, UserCheck, X
} from 'lucide-react';
import { Tenant, Location, RoleCode, User } from '../types/pharmacy';
import { formatDualDate } from '../utils/ethiopianCalendar';

interface HeaderProps {
  tenants: Tenant[];
  currentTenant: Tenant;
  onSelectTenant: (tenant: Tenant) => void;
  onOpenSuperAdmin: () => void;
  locations: Location[];
  currentLocation: Location;
  onSelectLocation?: (loc: Location) => void;
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
  currentRole,
  onSelectRole,
  language,
  onToggleLanguage,
  useEthiopianCalendar,
  onToggleCalendar,
  currentUser,
  onOpenAuth,
  onOpenSaasPortal,
  onGoToLanding,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  const [showDemoSwitcher, setShowDemoSwitcher] = useState(false);
  const currentDate = new Date();
  const dualDateStr = formatDualDate(currentDate, language);

  const roleStyles: Record<RoleCode, { nameEn: string; nameAm: string; badge: string; dot: string }> = {
    CASHIER_PHARMACIST: {
      nameEn: 'Cashier / Dispenser',
      nameAm: 'ገንዘብ ተቀባይ / ፋርማሲስት',
      badge: 'bg-amber-50 text-amber-900 border-amber-300 ring-amber-400/30',
      dot: 'bg-amber-500',
    },
    INVENTORY_MANAGER: {
      nameEn: 'Inventory Manager',
      nameAm: 'ስቶክ አስተዳዳሪ',
      badge: 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-emerald-400/30',
      dot: 'bg-emerald-500',
    },
    SALES_MANAGER: {
      nameEn: 'Sales Manager',
      nameAm: 'የሽያጭ አስተዳዳሪ',
      badge: 'bg-blue-50 text-blue-900 border-blue-300 ring-blue-400/30',
      dot: 'bg-blue-500',
    },
    ADMIN: {
      nameEn: 'Shop Administrator',
      nameAm: 'ዋና አስተዳዳሪ',
      badge: 'bg-rose-50 text-rose-900 border-rose-300 ring-rose-400/30',
      dot: 'bg-rose-500',
    },
    CUSTOM: {
      nameEn: 'Custom Staff',
      nameAm: 'ልዩ ሚና',
      badge: 'bg-slate-50 text-slate-800 border-slate-300 ring-slate-400/30',
      dot: 'bg-slate-500',
    },
  };

  const currentRoleStyle = roleStyles[currentRole] || roleStyles.CASHIER_PHARMACIST;
  const currentRoleName = language === 'am' ? currentRoleStyle.nameAm : currentRoleStyle.nameEn;

  // Single persistent unmistakable chip string: "Abyssinia Central · Bole Dispensary · Cashier"
  const cleanTenant = currentTenant.name.replace(' Pharmacy', '');
  const cleanLoc = currentLocation.name.includes('Bole')
    ? (currentLocation.type === 'STORE' ? 'Bole Store' : 'Bole Dispensary')
    : (currentLocation.code || currentLocation.name.split(' ')[0]);
  const cleanRole = currentRole === 'CASHIER_PHARMACIST'
    ? (language === 'am' ? 'ገንዘብ ተቀባይ' : 'Cashier')
    : (currentRole === 'ADMIN'
    ? (language === 'am' ? 'ዋና አስተዳዳሪ' : 'Admin')
    : (language === 'am' ? currentRoleStyle.nameAm.split('/')[0].trim() : currentRoleStyle.nameEn.split(' ')[0]));

  const contextChipString = `${cleanTenant} · ${cleanLoc} · ${cleanRole}`;

  const isPlatformAdmin = !!currentUser?.isPlatformAdmin;

  return (
    <header className="sticky top-0 z-40 h-12 min-h-[48px] max-h-[48px] bg-white border-b border-slate-200 px-3 md:px-4 flex items-center justify-between text-xs select-none shadow-2xs">
      {/* LEFT: Sidebar Toggle & Persistent Context Strip */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shrink-0"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle navigation sidebar"
          >
            <Menu className="w-4 h-4 text-slate-700" />
          </button>
        )}

        <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs">
          ጤ
        </div>

        {/* Persistent Chip: Tenant · Location · Role */}
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold shadow-2xs transition-all ${currentRoleStyle.badge}`}
          title={`Active Context: Tenant: ${currentTenant.name} | Location: ${currentLocation.name} | Role: ${currentRoleName}`}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${currentRoleStyle.dot} animate-pulse`}></span>
          <span className="truncate font-semibold tracking-tight text-xs">
            {contextChipString}
          </span>
        </div>

        {/* Demo role & tenant switcher behind a toggle flag */}
        <div className="relative">
          <button
            onClick={() => setShowDemoSwitcher(!showDemoSwitcher)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
            title="Toggle Demo Role & Tenant Switcher"
            aria-label="Demo Switcher"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          {showDemoSwitcher && (
            <div className="absolute left-0 top-8 z-50 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-3 space-y-3 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Demo Switcher (Simulation)</span>
                </span>
                <button
                  onClick={() => setShowDemoSwitcher(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Switch Tenant:</label>
                <select
                  value={currentTenant.id}
                  onChange={(e) => {
                    const ten = tenants.find((t) => t.id === e.target.value);
                    if (ten) {
                      onSelectTenant(ten);
                      setShowDemoSwitcher(false);
                    }
                  }}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-slate-50"
                >
                  {tenants.map((ten) => (
                    <option key={ten.id} value={ten.id}>
                      {ten.name} ({ten.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Switch Role:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(roleStyles) as RoleCode[]).map((rKey) => (
                    <button
                      key={rKey}
                      onClick={() => {
                        onSelectRole(rKey);
                        setShowDemoSwitcher(false);
                      }}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold text-left transition-colors cursor-pointer border ${
                        currentRole === rKey
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {roleStyles[rKey].nameEn.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: User, Language, EC/GC & Platform Admins Only */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* EC / GC Dual Calendar Indicator & Toggle */}
        <div className="flex items-center gap-1.5">
          <span className="hidden xl:inline-flex items-center gap-1 text-slate-500 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{dualDateStr}</span>
          </span>

          <button
            onClick={onToggleCalendar}
            className="px-2 py-1 rounded-md font-semibold text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            title="Toggle Default Calendar Mode (EC / GC)"
          >
            {useEthiopianCalendar ? '🇪🇹 EC' : '🌐 GC'}
          </button>
        </div>

        {/* Language Toggle */}
        <button
          onClick={onToggleLanguage}
          className="flex items-center gap-1 px-2 py-1 rounded-md font-bold text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
          title="Toggle Language"
        >
          <Globe className="w-3 h-3 text-emerald-600" />
          <span>{language === 'en' ? 'አማርኛ' : 'EN'}</span>
        </button>

        {/* User profile tag */}
        <div className="hidden sm:flex items-center gap-1.5 pl-1 text-slate-700">
          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-[11px]">
            {currentUser?.fullName?.charAt(0) || 'U'}
          </span>
          <span className="font-semibold text-xs truncate max-w-[120px]">
            {currentUser?.fullName || 'Active User'}
          </span>
        </div>

        {/* PLATFORM AND ONBOARDING BUTTONS: Rendered FOR PLATFORM ADMINS ONLY */}
        {isPlatformAdmin && (
          <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
            {onOpenSaasPortal && (
              <button
                onClick={onOpenSaasPortal}
                className="flex items-center gap-1 px-2 py-1 rounded-md font-bold text-[11px] bg-violet-600 hover:bg-violet-700 text-white shadow-2xs transition-colors cursor-pointer"
                title="Open SaaS Platform Management Portal"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>SaaS Admin</span>
              </button>
            )}

            {onOpenAuth && (
              <button
                onClick={() => onOpenAuth('REGISTER')}
                className="flex items-center gap-1 px-2 py-1 rounded-md font-bold text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
                title="Register a new pharmacy shop"
              >
                <PlusCircle className="w-3 h-3" />
                <span>Register</span>
              </button>
            )}

            {onGoToLanding && (
              <button
                onClick={onGoToLanding}
                className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-md font-semibold text-[11px] bg-slate-800 hover:bg-slate-700 text-white shadow-2xs transition-colors cursor-pointer"
                title="Return to Public SaaS Website"
              >
                <Globe className="w-3 h-3 text-emerald-400" />
                <span>SaaS Web</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
