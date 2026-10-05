import React, { useState } from 'react';
import { Users, Plus, Phone, CreditCard, DollarSign, CheckCircle2, Search, ArrowDownRight } from 'lucide-react';
import { Customer, RoleCode } from '../types/pharmacy';

interface CustomersViewProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  currentTenantId: string;
  currentRole: RoleCode;
  language: 'en' | 'am';
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  setCustomers,
  currentTenantId,
  currentRole,
  language,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // New Customer State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+251 ');
  const [email, setEmail] = useState('');
  const [creditLimit, setCreditLimit] = useState(5000);

  // Payment Settlement State
  const [paymentAmount, setPaymentAmount] = useState(0);

  const canManageCredit = currentRole === 'ADMIN' || currentRole === 'SALES_MANAGER';

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.fullName.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const totalOutstandingCredit = customers.reduce((acc, c) => acc + c.currentDebt, 0);

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return;

    setCustomers((prev) => [
      ...prev,
      {
        id: `cust-${Date.now()}`,
        tenantId: currentTenantId,
        fullName,
        phone,
        email: email || undefined,
        creditLimit: Number(creditLimit),
        currentDebt: 0,
        isActive: true,
      },
    ]);

    setShowAddModal(false);
    setFullName('');
    setPhone('+251 ');
    setEmail('');
  };

  const handleSettlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || paymentAmount <= 0) return;

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === selectedCustomer.id
          ? { ...c, currentDebt: Math.max(0, c.currentDebt - paymentAmount) }
          : c
      )
    );

    setShowPayModal(false);
    setSelectedCustomer(null);
    setPaymentAmount(0);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold">Registered Customers & Credit Accounts</h2>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Manage patient credit accounts, corporate agreements (clinics, NGOs), credit limits, and debt payment tracking.
            </p>
          </div>

          {canManageCredit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Credit Customer</span>
            </button>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[11px]">Total Registered Accounts</span>
            <span className="text-lg font-bold text-white mt-0.5 block">{customers.length} Accounts</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[11px]">Total Customer Debt Outstanding</span>
            <span className="text-lg font-bold text-amber-400 mt-0.5 block">
              {totalOutstandingCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
            </span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[11px]">Credit Authorization Status</span>
            <span className="text-lg font-bold text-emerald-400 mt-0.5 block">
              {canManageCredit ? 'Authorized' : 'Restricted (Read Only)'}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Table */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
            <tr>
              <th className="px-4 py-3">Customer Full Name</th>
              <th className="px-4 py-3">Phone & Email</th>
              <th className="px-4 py-3 text-right">Credit Limit</th>
              <th className="px-4 py-3 text-right">Current Debt (ETB)</th>
              <th className="px-4 py-3 text-right">Available Credit</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCustomers.map((c) => {
              const availableCredit = Math.max(0, c.creditLimit - c.currentDebt);
              return (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">{c.fullName}</td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-slate-700">{c.phone}</div>
                    {c.email && <div className="text-[10px] text-slate-400">{c.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {c.creditLimit.toLocaleString()} ETB
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-rose-700">
                    {c.currentDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                    {availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.currentDebt > 0 && canManageCredit ? (
                      <button
                        onClick={() => {
                          setSelectedCustomer(c);
                          setPaymentAmount(c.currentDebt);
                          setShowPayModal(true);
                        }}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-semibold text-xs border border-emerald-300 transition-colors"
                      >
                        Record Settlement
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">Clear</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Register Credit Account</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddCustomer} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Woizero Aster Mamo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Credit Limit (ETB) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Payment Modal */}
      {showPayModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Debt Settlement Payment</h3>
              <button onClick={() => setShowPayModal(false)} className="text-emerald-200 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSettlePayment} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-700">
                Customer: <strong>{selectedCustomer.fullName}</strong>
                <br />
                Outstanding Debt: <strong>{selectedCustomer.currentDebt.toFixed(2)} ETB</strong>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Payment Amount (ETB) *</label>
                <input
                  type="number"
                  min="1"
                  max={selectedCustomer.currentDebt}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
