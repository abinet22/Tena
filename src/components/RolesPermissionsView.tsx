import React, { useState } from 'react';
import {
  ShieldCheck, Check, X, Lock, Key, Users,
  AlertTriangle, EyeOff, FileText, Settings
} from 'lucide-react';
import { Role, RoleCode, ALL_PERMISSIONS } from '../types/pharmacy';

interface RolesPermissionsViewProps {
  roles: Role[];
  activeRole: RoleCode;
  onSelectRole: (code: RoleCode) => void;
  language: 'en' | 'am';
}

export const RolesPermissionsView: React.FC<RolesPermissionsViewProps> = ({
  roles,
  activeRole,
  onSelectRole,
  language,
}) => {
  const [selectedRoleCode, setSelectedRoleCode] = useState<RoleCode>(activeRole);

  const categories = Array.from(new Set(ALL_PERMISSIONS.map((p) => p.category)));

  // Current inspected role
  const currentRoleObj = roles.find((r) => r.code === selectedRoleCode) || roles[0];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Role-Based Access Control (RBAC) & Custom Permissions
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Granular permission matrix per tenant. Cashiers are strictly restricted from viewing cost prices and wholesale margins.
          </p>
        </div>

        {/* Role Tab Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setSelectedRoleCode(r.code);
                onSelectRole(r.code);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedRoleCode === r.code
                  ? 'bg-white text-indigo-900 shadow-xs border border-indigo-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {/* Active Role Card & Cost Concealment Warning */}
      <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-5 text-xs text-indigo-950 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-indigo-900">{currentRoleObj?.name}</span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
              {currentRoleObj?.code}
            </span>
          </div>
          <p className="text-indigo-800 mt-1">{currentRoleObj?.description}</p>
        </div>

        {selectedRoleCode === 'CASHIER_PHARMACIST' ? (
          <div className="bg-amber-100/80 border border-amber-300 text-amber-900 px-3.5 py-2 rounded-xl flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-amber-700" />
            <div>
              <span className="font-bold block">Cost Price Concealment Active</span>
              <span className="text-[11px] text-amber-800">
                `cost:view` permission is strictly stripped in API & UI
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-100/80 border border-emerald-300 text-emerald-900 px-3.5 py-2 rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-700" />
            <div>
              <span className="font-bold block">Wholesale Margin Visible</span>
              <span className="text-[11px] text-emerald-800">
                Role has access to unit costs & supplier purchase rates
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Permissions Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
            <tr>
              <th className="px-4 py-3">Permission Category & Slug</th>
              <th className="px-4 py-3 text-center">Admin</th>
              <th className="px-4 py-3 text-center">Inventory Mgr</th>
              <th className="px-4 py-3 text-center">Sales Mgr</th>
              <th className="px-4 py-3 text-center">Cashier / Dispenser</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((cat) => {
              const permsInCat = ALL_PERMISSIONS.filter((p) => p.category === cat);
              return (
                <React.Fragment key={cat}>
                  <tr className="bg-slate-50/60">
                    <td
                      colSpan={5}
                      className="px-4 py-2 font-bold text-slate-800 uppercase tracking-wider text-[10px]"
                    >
                      {cat}
                    </td>
                  </tr>
                  {permsInCat.map((p) => {
                    const isCostPermission = p.id === 'cost:view';
                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isCostPermission ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-slate-900 flex items-center gap-1.5">
                            {p.name}
                            {isCostPermission && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300">
                                Privacy Critical
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">{p.id}</div>
                        </td>

                        {/* Admin */}
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        </td>

                        {/* Inventory Manager */}
                        <td className="px-4 py-2.5 text-center">
                          {['locations:read', 'products:read', 'products:write', 'master_data:manage', 'stock:read', 'stock:write', 'stock:adjust', 'stock:transfer', 'cost:view', 'reports:inventory'].includes(p.id) ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400">
                              <X className="w-3 h-3" />
                            </span>
                          )}
                        </td>

                        {/* Sales Manager */}
                        <td className="px-4 py-2.5 text-center">
                          {['products:read', 'stock:read', 'pos:access', 'cost:view', 'sales:discount', 'sales:return', 'customers:credit', 'reports:sales'].includes(p.id) ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400">
                              <X className="w-3 h-3" />
                            </span>
                          )}
                        </td>

                        {/* Cashier / Pharmacist */}
                        <td className="px-4 py-2.5 text-center">
                          {['products:read', 'stock:read', 'pos:access'].includes(p.id) ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${
                                isCostPermission
                                  ? 'bg-rose-100 text-rose-700 border border-rose-300 font-bold'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              <X className="w-3 h-3" />
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
