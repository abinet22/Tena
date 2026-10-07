import React, { useState } from 'react';
import {
  Users, UserPlus, ShieldCheck, Mail, Phone, MapPin,
  CheckCircle2, AlertTriangle, Key, Trash2, Edit3, Lock,
  Sparkles, Check, Building2, UserX, UserCheck
} from 'lucide-react';
import { User, Tenant, RoleCode, Location, Role, AuditLog } from '../types/pharmacy';
import { createAuditLog } from '../utils/auditLogger';

interface ShopStaffManagementViewProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentTenant: Tenant;
  locations: Location[];
  currentRole: RoleCode;
  language: 'en' | 'am';
  onAddAuditLog?: (entry: AuditLog) => void;
}

export const ShopStaffManagementView: React.FC<ShopStaffManagementViewProps> = ({
  users,
  setUsers,
  currentTenant,
  locations,
  currentRole,
  language,
  onAddAuditLog,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+251 9');
  const [password, setPassword] = useState('password123');
  const [selectedRole, setSelectedRole] = useState<RoleCode>('INVENTORY_MANAGER');
  const [selectedBranch, setSelectedBranch] = useState<string>(locations[0]?.branchName || 'Bole Main Branch');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([locations[0]?.branchName || 'Bole Main Branch']);
  const [formError, setFormError] = useState<string | null>(null);

  // Filter users belonging to current pharmacy tenant
  const tenantUsers = users.filter((u) => u.tenantId === currentTenant.id && !u.isPlatformAdmin);

  // Role metadata
  const roleMeta: Record<RoleCode, { labelEn: string; labelAm: string; descEn: string; descAm: string; color: string; badge: string }> = {
    ADMIN: {
      labelEn: 'Shop Administrator / Lead Pharmacist',
      labelAm: 'ዋና አስተዳዳሪ / ኃላፊ ፋርማሲስት',
      descEn: 'Full administrative access, staff accounts, all reports, audit logs, and settings.',
      descAm: 'ሙሉ የአስተዳደር ፈቃድ፣ የሰራተኞች ምዝገባ፣ የኦዲት መዝገብ እና ሪፖርቶች።',
      color: 'bg-rose-50 border-rose-200 text-rose-900',
      badge: 'bg-rose-100 text-rose-800',
    },
    INVENTORY_MANAGER: {
      labelEn: 'Inventory Manager',
      labelAm: 'የስቶክ አስተዳዳሪ (Inventory Manager)',
      descEn: 'Receives supplier GRN orders, manages Store quarantine, executes inter-branch transfers, and expiry write-offs.',
      descAm: 'የአቅራቢዎች ግዢ (GRN)፣ የመጋዘን ስቶክ፣ የቅርንጫፍ ዝውውርና ጊዜ ያለፈባቸው እቃዎች አወጋገድ።',
      color: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      badge: 'bg-emerald-100 text-emerald-800',
    },
    SALES_MANAGER: {
      labelEn: 'Sales Manager',
      labelAm: 'የሽያጭ አስተዳዳሪ (Sales Manager)',
      descEn: 'Oversight over daily sales invoices, customer credit limits, discount policies, and return approvals.',
      descAm: 'የዕለታዊ ሽያጭ ቁጥጥር፣ የደንበኞች የብድር ሂሳብ፣ የቅናሽና የመመለሻ ማረጋገጫዎች።',
      color: 'bg-blue-50 border-blue-200 text-blue-900',
      badge: 'bg-blue-100 text-blue-800',
    },
    CASHIER_PHARMACIST: {
      labelEn: 'Dispensing Cashier / Pharmacist',
      labelAm: 'ገንዘብ ተቀባይ / ሻጭ ፋርማሲስት',
      descEn: 'Dispensary counter retail sales only. Cost prices and profit margins are strictly masked by RBAC.',
      descAm: 'የመሸጫ መስኮት ሽያጭ ብቻ። የግዢ ዋጋዎችና የትርፍ ህዳግ በRBAC ህግ በጥብቅ ተደብቀዋል።',
      color: 'bg-amber-50 border-amber-200 text-amber-900',
      badge: 'bg-amber-100 text-amber-800',
    },
    CUSTOM: {
      labelEn: 'Custom Staff',
      labelAm: 'ልዩ ሰራተኛ',
      descEn: 'Custom branch operator with assigned permissions.',
      descAm: 'የተለየ የስራ ፈቃድ ያለው ሰራተኛ።',
      color: 'bg-slate-50 border-slate-200 text-slate-900',
      badge: 'bg-slate-100 text-slate-800',
    },
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setFormError('Please provide full name and valid email.');
      return;
    }

    // Role ID mapping
    const roleIdMap: Record<RoleCode, string> = {
      ADMIN: 'r-admin',
      INVENTORY_MANAGER: 'r-inv',
      SALES_MANAGER: 'r-sales',
      CASHIER_PHARMACIST: 'r-cashier',
      CUSTOM: 'r-custom',
    };

    const assignedList = Array.from(new Set([selectedBranch, ...selectedBranches]));

    const newUser: User = {
      id: `u-${Date.now()}`,
      tenantId: currentTenant.id,
      roleId: roleIdMap[selectedRole] || 'r-inv',
      fullName,
      email,
      phone,
      password: password || 'password123',
      branchName: selectedBranch,
      assignedBranchNames: assignedList,
      isPlatformAdmin: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setUsers((prev) => [...prev, newUser]);

    if (onAddAuditLog) {
      onAddAuditLog(
        createAuditLog({
          tenantId: currentTenant.id,
          userName: 'Dr. Lead Pharmacist (Shop Admin)',
          userRole: 'ADMIN',
          action: 'STAFF_USER_CREATED',
          entity: 'User',
          entityId: newUser.id,
          entityName: `${newUser.fullName} [${selectedRole}]`,
          category: 'USER_SECURITY',
          severity: 'INFO',
          efdaComplianceCode: 'EFDA-STAFF-REG-01',
          reason: `Shop Administrator provisioned staff member ${newUser.fullName} with role ${selectedRole} for branch ${selectedBranch} (assigned branches: ${assignedList.join(', ')}).`,
          newValues: { fullName, email, role: selectedRole, branch: selectedBranch, assignedBranches: assignedList },
        })
      );
    }

    setShowAddModal(false);
    setFullName('');
    setEmail('');
    setPhone('+251 9');
    setFormError(null);
  };

  const handleToggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: !u.isActive } : u))
    );
  };

  // 1-Click Provision Standard Pharmacy Team (Inventory Manager + Sales Manager + Cashier)
  const handleProvisionDefaultTeam = () => {
    const slug = currentTenant.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const tenantBranches = Array.from(new Set(locations.filter(l => l.tenantId === currentTenant.id).map(l => l.branchName || 'Bole Main Branch')));
    const defaultBranch = tenantBranches[0] || 'Bole Main Branch';

    const newStaff: User[] = [
      {
        id: `u-${Date.now()}-inv`,
        tenantId: currentTenant.id,
        roleId: 'r-inv',
        fullName: 'Rahel Tadesse (Inventory Officer)',
        email: `inventory@${slug || 'pharm'}.et`,
        phone: '+251 912 334 455',
        password: 'password123',
        branchName: defaultBranch,
        assignedBranchNames: tenantBranches,
        isActive: true,
        isPlatformAdmin: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: `u-${Date.now()}-sales`,
        tenantId: currentTenant.id,
        roleId: 'r-sales',
        fullName: 'Yared Bekele (Sales Supervisor)',
        email: `sales@${slug || 'pharm'}.et`,
        phone: '+251 913 556 677',
        password: 'password123',
        branchName: defaultBranch,
        assignedBranchNames: tenantBranches,
        isActive: true,
        isPlatformAdmin: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: `u-${Date.now()}-cash`,
        tenantId: currentTenant.id,
        roleId: 'r-cashier',
        fullName: 'Hiwot Girma (Dispensary Cashier)',
        email: `cashier@${slug || 'pharm'}.et`,
        phone: '+251 914 778 899',
        password: 'password123',
        branchName: defaultBranch,
        assignedBranchNames: [defaultBranch],
        isActive: true,
        isPlatformAdmin: false,
        createdAt: new Date().toISOString(),
      },
    ];

    setUsers((prev) => [...prev, ...newStaff]);

    if (onAddAuditLog) {
      onAddAuditLog(
        createAuditLog({
          tenantId: currentTenant.id,
          userName: 'Dr. Lead Pharmacist (Shop Admin)',
          userRole: 'ADMIN',
          action: 'STAFF_USER_CREATED',
          entity: 'User',
          entityId: 'TEAM-PROVISION',
          entityName: 'Standard Pharmacy Operating Team',
          category: 'USER_SECURITY',
          severity: 'INFO',
          efdaComplianceCode: 'EFDA-STAFF-PRESET-01',
          reason: `Auto-provisioned standard operating team (Inventory Manager, Sales Manager, Dispensing Cashier) for ${currentTenant.name}.`,
        })
      );
    }
  };

  // Unique branches from locations
  const branchOptions = Array.from(new Set(locations.map((l) => l.branchName || 'Main Branch')));

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                {language === 'am' ? 'የፋርማሲ ሰራተኞች አስተዳደር' : 'Pharmacy Staff & Role Management'}
              </h2>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-semibold">
                {currentTenant.name}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'am'
                ? 'የስቶክ አስተዳዳሪ (Inventory Manager)፣ የሽያጭ አስተዳዳሪ (Sales Manager) እና የገንዘብ ተቀባዮችን ይመዝግቡና ያስተዳድሩ።'
                : 'Create and assign staff credentials for Inventory Managers, Sales Managers, and Dispensing Cashiers per branch.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {tenantUsers.length <= 1 && (
            <button
              onClick={handleProvisionDefaultTeam}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-violet-800 hover:bg-violet-700 text-violet-100 transition-colors flex items-center gap-1.5 shadow-xs"
              title="1-Click auto provision standard team"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-300" />
              <span>{language === 'am' ? 'የተሟላ ቡድን ፍጠር' : 'Quick Provision Team'}</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>{language === 'am' ? 'አዲስ ሰራተኛ መዝግብ' : 'Add Staff Member'}</span>
          </button>
        </div>
      </div>

      {/* Role Explanations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span>{language === 'am' ? 'ስቶክ አስተዳዳሪ (Inventory Mgr)' : 'Inventory Manager'}</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {language === 'am'
              ? 'የአቅራቢዎች ግዢ (GRN) ይቀበላል፣ ከመጋዘን ወደ መሸጫ እቃ ያስተላልፋል፣ እና በቅርንጫፎች መካከል ዝውውር ያደርጋል።'
              : 'Executes inbound GRN receipts, store-to-dispensary replenishment, and inter-branch inventory dispatches.'}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-1.5">
          <div className="flex items-center gap-2 text-blue-800 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span>{language === 'am' ? 'የሽያጭ አስተዳዳሪ (Sales Mgr)' : 'Sales Manager'}</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {language === 'am'
              ? 'ዕለታዊ የሽያጭ ደረሰኞችን ይከታተላል፣ የደንበኞች የብድር ጣሪያ ይፈቅዳል፣ እና የሽያጭ ሪፖርቶችን ይመረምራል።'
              : 'Oversight over daily sales invoices, customer credit ledgers, discount approvals, and POS audit trail.'}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-600"></span>
            <span>{language === 'am' ? 'ገንዘብ ተቀባይ (Cashier)' : 'Dispensing Cashier'}</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {language === 'am'
              ? 'በመሸጫ መስኮት ላይ ፈጣን ሽያጭ ብቻ ይፈጽማል። የግዢ ዋጋዎችና የትርፍ ህዳግ በRBAC ህግ ተደብቀዋል።'
              : 'Fast POS counter sales only. Purchase cost prices and company profit margins are strictly concealed.'}
          </p>
        </div>
      </div>

      {/* Staff Members Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {language === 'am' ? 'የተመዘገቡ ሰራተኞች' : 'Registered Pharmacy Staff'} ({tenantUsers.length})
            </h3>
            <p className="text-xs text-slate-500">
              {currentTenant.name} • {currentTenant.city}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Role & Access</th>
                <th className="py-3 px-4">Assigned Branch</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenantUsers.map((user) => {
                const roleCode = (user.roleId === 'r-inv'
                  ? 'INVENTORY_MANAGER'
                  : user.roleId === 'r-sales'
                  ? 'SALES_MANAGER'
                  : user.roleId === 'r-cashier'
                  ? 'CASHIER_PHARMACIST'
                  : 'ADMIN') as RoleCode;

                const meta = roleMeta[roleCode] || roleMeta.CUSTOM;

                return (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white ${
                          roleCode === 'ADMIN' ? 'bg-rose-600' : roleCode === 'INVENTORY_MANAGER' ? 'bg-emerald-600' : roleCode === 'SALES_MANAGER' ? 'bg-blue-600' : 'bg-amber-600'
                        }`}>
                          {user.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{user.fullName}</p>
                          <p className="text-[11px] text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${meta.badge}`}>
                        {language === 'am' ? meta.labelAm : meta.labelEn}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(user.assignedBranchNames && user.assignedBranchNames.length > 0
                          ? user.assignedBranchNames
                          : [user.branchName || 'Main Branch']
                        ).map((br, idx) => (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                              br === user.branchName
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                            <span>{br}</span>
                            {br === user.branchName && <span className="text-[9px] text-emerald-600 font-bold">(Primary)</span>}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {user.phone || '+251 911 000 000'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        user.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                        {user.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(user.id)}
                        className={`text-[11px] font-semibold px-2 py-1 rounded transition-colors ${
                          user.isActive
                            ? 'text-rose-600 hover:bg-rose-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  {language === 'am' ? 'አዲስ የፋርማሲ ሰራተኛ መዝግብ' : 'Add New Pharmacy Staff Member'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-6 space-y-4 text-left">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Full Name (የሰራተኛው ሙሉ ስም) *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahel Tadesse / Yared Bekele"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Role (የስራ ሚና) *
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as RoleCode)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-emerald-500 font-semibold"
                  >
                    <option value="INVENTORY_MANAGER">Inventory Manager (ስቶክ አስተዳዳሪ)</option>
                    <option value="SALES_MANAGER">Sales Manager (የሽያጭ አስተዳዳሪ)</option>
                    <option value="CASHIER_PHARMACIST">Cashier / Dispenser (ገንዘብ ተቀባይ)</option>
                    <option value="ADMIN">Shop Administrator (ተጨማሪ አስተዳዳሪ)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Primary Home Branch (ዋና ቅርንጫፍ) *
                  </label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => {
                      setSelectedBranch(e.target.value);
                      if (!selectedBranches.includes(e.target.value)) {
                        setSelectedBranches([...selectedBranches, e.target.value]);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-emerald-500 font-semibold"
                  >
                    {branchOptions.map((br, idx) => (
                      <option key={idx} value={br}>
                        {br}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-Branch Assignment Checkboxes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Authorized Operating Branches (ባለብዙ-ቅርንጫፍ ፈቃድ) *
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Staff can switch between and perform stock/sales operations across all selected branches:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {branchOptions.map((br) => {
                    const isChecked = selectedBranches.includes(br);
                    return (
                      <label
                        key={br}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs font-medium border transition-colors ${
                          isChecked
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBranches([...selectedBranches, br]);
                            } else {
                              if (selectedBranches.length > 1) {
                                setSelectedBranches(selectedBranches.filter((b) => b !== br));
                              }
                            }
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{br}</span>
                        {br === selectedBranch && <span className="text-[10px] text-emerald-600 font-bold ml-auto">(Home)</span>}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahel@abyssiniapharmacy.et"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Phone (+251)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+251 912 334 455"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Default Login Password
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password123"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
