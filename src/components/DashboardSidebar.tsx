import React, { useState } from 'react';
import {
  LayoutDashboard, ShoppingCart, ArrowRightLeft, Truck, Users,
  Pill, Layers, MapPin, ShieldCheck, FileText, Cpu, Code2,
  ChevronLeft, ChevronRight, BarChart3, UserCheck, ShieldAlert,
  Building2, Globe, LogOut, LucideIcon, Sparkles, ChevronDown
} from 'lucide-react';
import { Tenant, Location, RoleCode, User } from '../types/pharmacy';
import { translations } from '../utils/translations';

export type NavTabId =
  | 'OVERVIEW'
  | 'REPORTS'
  | 'STAFF'
  | 'POS'
  | 'INVENTORY_TRANSFERS'
  | 'PURCHASING'
  | 'CUSTOMERS'
  | 'PRODUCTS'
  | 'MASTERS'
  | 'LOCATIONS'
  | 'ROLES'
  | 'AUDIT_LOGS'
  | 'SAAS_ADMIN'
  | 'TESTS'
  | 'ARCHITECTURE';

interface SidebarItem {
  id: NavTabId;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
  badgeColor?: string;
  highlight?: boolean;
}

interface DashboardSidebarProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentUser: User | null;
  currentRole: RoleCode;
  currentTenant: Tenant;
  locations: Location[];
  currentLocation: Location;
  onSelectLocation: (loc: Location) => void;
  onGoToLanding: () => void;
  onLogout: () => void;
  language: 'en' | 'am';
  badges: {
    transfersCount: number;
    grnsCount: number;
    customersCount: number;
    productsCount: number;
    auditLogsCount: number;
    tenantsCount: number;
    staffCount: number;
    testsSummary?: { passed: number; total: number; failed: number };
  };
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  currentUser,
  currentRole,
  currentTenant,
  locations,
  currentLocation,
  onSelectLocation,
  onGoToLanding,
  onLogout,
  language,
  badges,
}) => {
  const t = translations[language];

  // Distinct role badge details
  const roleDisplay: Record<RoleCode, { titleEn: string; titleAm: string; color: string; ringColor: string }> = {
    ADMIN: {
      titleEn: 'Shop Administrator',
      titleAm: 'ዋና አስተዳዳሪ',
      color: 'bg-rose-100 text-rose-800 border-rose-300',
      ringColor: 'ring-rose-400',
    },
    INVENTORY_MANAGER: {
      titleEn: 'Inventory Manager',
      titleAm: 'ስቶክ አስተዳዳሪ',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      ringColor: 'ring-emerald-400',
    },
    SALES_MANAGER: {
      titleEn: 'Sales Manager',
      titleAm: 'የሽያጭ አስተዳዳሪ',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      ringColor: 'ring-blue-400',
    },
    CASHIER_PHARMACIST: {
      titleEn: 'Cashier / Dispenser',
      titleAm: 'ገንዘብ ተቀባይ / ፋርማሲስት',
      color: 'bg-amber-100 text-amber-800 border-amber-300',
      ringColor: 'ring-amber-400',
    },
    CUSTOM: {
      titleEn: 'Staff Member',
      titleAm: 'ልዩ ሰራተኛ',
      color: 'bg-slate-100 text-slate-800 border-slate-300',
      ringColor: 'ring-slate-400',
    },
  };

  const isPlatformAdmin = !!currentUser?.isPlatformAdmin;

  const testsBadgeStr = badges.testsSummary
    ? (badges.testsSummary.failed > 0
        ? `${badges.testsSummary.failed} FAIL`
        : `${badges.testsSummary.passed}/${badges.testsSummary.total}`)
    : '7/7';
  const testsBadgeColor = badges.testsSummary && badges.testsSummary.failed > 0
    ? 'bg-rose-950 text-rose-300 border border-rose-800 font-bold'
    : undefined;

  // Build role-tailored navigation items
  const getNavItems = (): { section: string; items: SidebarItem[] }[] => {
    // 1. SaaS Platform Admin
    if (isPlatformAdmin) {
      return [
        {
          section: language === 'am' ? 'የሳስ ዋና አስተዳደር' : 'SaaS Platform Oversight',
          items: [
            { id: 'OVERVIEW', label: t.tabOverview, icon: LayoutDashboard },
            { id: 'SAAS_ADMIN', label: t.tabSaasAdmin || 'SaaS Admin Portal', icon: ShieldAlert, badge: badges.tenantsCount, highlight: true },
            { id: 'REPORTS', label: language === 'am' ? 'ሪፖርቶችና ትንታኔ' : 'Executive Reports', icon: BarChart3 },
            { id: 'AUDIT_LOGS', label: t.tabAuditLog, icon: FileText, badge: badges.auditLogsCount },
            { id: 'ARCHITECTURE', label: t.tabArchitecture, icon: Code2 },
            { id: 'TESTS', label: t.tabStockTests, icon: Cpu, badge: testsBadgeStr, badgeColor: testsBadgeColor },
          ],
        },
      ];
    }

    // 2. Shop Admin (Lead Pharmacist) - Full management, reports, and staff creation
    if (currentRole === 'ADMIN') {
      return [
        {
          section: language === 'am' ? 'አስተዳደርና ሪፖርቶች' : 'Management & Reports',
          items: [
            { id: 'OVERVIEW', label: t.tabOverview, icon: LayoutDashboard },
            { id: 'REPORTS', label: language === 'am' ? 'የፋርማሲ ሪፖርቶች (EFDA)' : 'Executive Reports & PDFs', icon: BarChart3, highlight: true },
            { id: 'STAFF', label: language === 'am' ? 'የሰራተኞች አስተዳደር' : 'Staff & Roles', icon: Users, badge: badges.staffCount, highlight: true },
            { id: 'AUDIT_LOGS', label: t.tabAuditLog, icon: FileText, badge: badges.auditLogsCount },
          ],
        },
        {
          section: language === 'am' ? 'ሽያጭና ደንበኞች' : 'Sales & Dispensing',
          items: [
            { id: 'POS', label: t.tabPOS, icon: ShoppingCart, highlight: true },
            { id: 'CUSTOMERS', label: t.tabCustomers, icon: Users, badge: badges.customersCount },
          ],
        },
        {
          section: language === 'am' ? 'ስቶክና ግዢ' : 'Inventory & Supply',
          items: [
            { id: 'INVENTORY_TRANSFERS', label: language === 'am' ? 'ስቶክና የቅርንጫፍ ዝውውር' : 'Transfers & Multi-Branch', icon: ArrowRightLeft, badge: badges.transfersCount },
            { id: 'PRODUCTS', label: t.tabProducts, icon: Pill, badge: badges.productsCount },
            { id: 'PURCHASING', label: t.tabPurchasing, icon: Truck, badge: badges.grnsCount },
            { id: 'LOCATIONS', label: language === 'am' ? 'ቅርንጫፎችና መጋዘኖች' : 'Branches & Locations', icon: MapPin },
            { id: 'MASTERS', label: t.tabMasters, icon: Layers },
          ],
        },
        {
          section: language === 'am' ? 'ሲስተም' : 'System',
          items: [
            { id: 'TESTS', label: t.tabStockTests, icon: Cpu, badge: testsBadgeStr, badgeColor: testsBadgeColor },
            { id: 'ARCHITECTURE', label: t.tabArchitecture, icon: Code2 },
          ],
        },
      ];
    }

    // 3. Inventory Manager - Focused on Drug register, GRN, and multi-branch transfers
    if (currentRole === 'INVENTORY_MANAGER') {
      return [
        {
          section: language === 'am' ? 'የስቶክ ስራዎች' : 'Inventory Operations',
          items: [
            { id: 'INVENTORY_TRANSFERS', label: language === 'am' ? 'ስቶክና የቅርንጫፍ ዝውውር' : 'Transfers & Multi-Branch', icon: ArrowRightLeft, badge: badges.transfersCount, highlight: true },
            { id: 'PRODUCTS', label: t.tabProducts, icon: Pill, badge: badges.productsCount },
            { id: 'PURCHASING', label: t.tabPurchasing, icon: Truck, badge: badges.grnsCount, highlight: true },
            { id: 'LOCATIONS', label: language === 'am' ? 'ቅርንጫፎችና መጋዘኖች' : 'Branches & Stores', icon: MapPin },
            { id: 'MASTERS', label: t.tabMasters, icon: Layers },
          ],
        },
        {
          section: language === 'am' ? 'ኦዲትና ፍተሻ' : 'Audit & Verification',
          items: [
            { id: 'REPORTS', label: language === 'am' ? 'የስቶክ ሪፖርቶች' : 'Inventory Reports', icon: BarChart3 },
            { id: 'AUDIT_LOGS', label: t.tabAuditLog, icon: FileText, badge: badges.auditLogsCount },
            { id: 'TESTS', label: t.tabStockTests, icon: Cpu, badge: testsBadgeStr, badgeColor: testsBadgeColor },
          ],
        },
      ];
    }

    // 4. Sales Manager - Focused on POS, Sales Reports, and Customer credits
    if (currentRole === 'SALES_MANAGER') {
      return [
        {
          section: language === 'am' ? 'የሽያጭ ስራዎች' : 'Sales Operations',
          items: [
            { id: 'POS', label: t.tabPOS, icon: ShoppingCart, highlight: true },
            { id: 'REPORTS', label: language === 'am' ? 'የሽያጭ ሪፖርቶች' : 'Sales & Revenue Reports', icon: BarChart3, highlight: true },
            { id: 'CUSTOMERS', label: t.tabCustomers, icon: Users, badge: badges.customersCount },
            { id: 'PRODUCTS', label: t.tabProducts, icon: Pill, badge: badges.productsCount },
            { id: 'INVENTORY_TRANSFERS', label: language === 'am' ? 'የመሸጫ እቃ ጥያቄ' : 'Dispensary Stock Request', icon: ArrowRightLeft },
          ],
        },
      ];
    }

    // 5. Cashier / Dispenser - Minimalist, high speed, cost hidden
    return [
      {
        section: language === 'am' ? 'የመሸጫ መስኮት' : 'Retail Counter',
        items: [
          { id: 'POS', label: t.tabPOS, icon: ShoppingCart, highlight: true },
          { id: 'CUSTOMERS', label: t.tabCustomers, icon: Users },
          { id: 'INVENTORY_TRANSFERS', label: language === 'am' ? 'የመጋዘን እቃ መጠየቂያ' : 'Stock Request from Store', icon: ArrowRightLeft },
        ],
      },
    ];
  };

  const navSections = getNavItems();

  return (
    <aside
      className={`bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col shrink-0 transition-all duration-300 z-30 select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Sidebar Header: Brand & Collapse Toggle */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
            ጤ
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden leading-tight">
              <span className="font-extrabold text-white text-sm block truncate tracking-tight">
                {currentTenant.name}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono block truncate">
                {currentTenant.licenseNumber || 'EFDA Compliant'}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label="Toggle Sidebar"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Branch & Location Quick Picker (when expanded) */}
      {!isCollapsed && (
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/30">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center justify-between">
            <span>{language === 'am' ? 'የአሁኑ መጋዘን/መሸጫ' : 'Active Location & Branch'}</span>
            <span className="text-[9px] text-emerald-400 font-mono">
              {currentLocation.type === 'STORE' ? 'Store' : 'Dispensary'}
            </span>
          </label>
          <div className="relative">
            <select
              aria-label="Select active location"
              value={currentLocation.id}
              onChange={(e) => {
                const sel = locations.find((l) => l.id === e.target.value);
                if (sel) onSelectLocation(sel);
              }}
              className="w-full bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 pr-7 focus:outline-hidden focus:border-emerald-500 truncate cursor-pointer"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.branchName ? `[${loc.branchName}] ` : ''}
                  {loc.name} ({loc.type === 'STORE' ? 'Store' : 'Disp'})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Navigation Links Area */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {section.section}
              </p>
            )}

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative group text-left ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : item.highlight
                      ? 'text-emerald-300 hover:bg-emerald-950/50 hover:text-white'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-white'
                        : item.highlight
                        ? 'text-emerald-400 group-hover:text-emerald-300'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />

                  {!isCollapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}

                  {!isCollapsed && item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                        isActive
                          ? 'bg-emerald-700 text-emerald-100'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip on collapsed mode */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-950 text-white text-[11px] font-semibold rounded-md shadow-xl border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Sidebar Footer: User Profile & Quick Actions */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/70 space-y-2">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 ${
              isPlatformAdmin
                ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 ring-2 ring-violet-400'
                : 'bg-emerald-600'
            }`}
          >
            {isPlatformAdmin ? '👑' : currentUser?.fullName?.charAt(0) || 'U'}
          </div>

          {!isCollapsed && (
            <div className="overflow-hidden leading-tight flex-1 text-left">
              <span className="text-xs font-bold text-white block truncate">
                {currentUser?.fullName || 'Active User'}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {language === 'am' ? roleDisplay[currentRole]?.titleAm : roleDisplay[currentRole]?.titleEn}
              </span>
            </div>
          )}
        </div>

        {/* Action icons */}
        <div className={`flex items-center gap-1.5 pt-1 border-t border-slate-800/80 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {isPlatformAdmin && (
            <button
              onClick={onGoToLanding}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors flex items-center gap-1 text-[11px]"
              title="Return to Public SaaS Home Website & Pricing"
            >
              <Globe className="w-3.5 h-3.5" />
              {!isCollapsed && <span>{language === 'am' ? 'ዌብሳይት' : 'SaaS Home'}</span>}
            </button>
          )}

          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors flex items-center gap-1 text-[11px]"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            {!isCollapsed && <span>{language === 'am' ? 'ውጣ' : 'Logout'}</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};
