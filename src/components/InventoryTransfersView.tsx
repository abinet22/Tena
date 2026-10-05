import React, { useState } from 'react';
import {
  ArrowRightLeft, Warehouse, Store, AlertTriangle,
  CheckCircle2, Clock, Plus, Trash2, ShieldAlert,
  Search, Filter, FileText, ArrowDownRight, Tag
} from 'lucide-react';
import {
  StockBalance, Product, Batch, Location, TransferOrder,
  StockAdjustment, StockWriteOff, RoleCode, Category, AuditLog
} from '../types/pharmacy';
import { sanitizePriceForRole, formatBaseQuantityInUnits } from '../utils/stockEngine';
import { formatDualDate } from '../utils/ethiopianCalendar';
import { createAuditLog } from '../utils/auditLogger';

interface InventoryTransfersViewProps {
  stockBalances: StockBalance[];
  setStockBalances: React.Dispatch<React.SetStateAction<StockBalance[]>>;
  products: Product[];
  batches: Batch[];
  locations: Location[];
  categories: Category[];
  transfers: TransferOrder[];
  setTransfers: React.Dispatch<React.SetStateAction<TransferOrder[]>>;
  currentTenantId: string;
  currentRole: RoleCode;
  language: 'en' | 'am';
  onAddAuditLog?: (entry: AuditLog) => void;
}

export const InventoryTransfersView: React.FC<InventoryTransfersViewProps> = ({
  stockBalances,
  setStockBalances,
  products,
  batches,
  locations,
  categories,
  transfers,
  setTransfers,
  currentTenantId,
  currentRole,
  language,
  onAddAuditLog,
}) => {
  const [activeTab, setActiveTab] = useState<'BALANCES' | 'TRANSFERS' | 'WRITEOFFS'>('BALANCES');
  const [selectedLocFilter, setSelectedLocFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyExpiring, setOnlyExpiring] = useState(false);
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferBatchId, setTransferBatchId] = useState('');
  const [transferQty, setTransferQty] = useState<number>(50);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferError, setTransferError] = useState<string | null>(null);

  // Write-Off Modal State
  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [writeOffBalanceId, setWriteOffBalanceId] = useState('');
  const [writeOffReason, setWriteOffReason] = useState<'EXPIRED' | 'DAMAGED' | 'RECALLED_EFDA'>('EXPIRED');
  const [writeOffQty, setWriteOffQty] = useState<number>(10);
  const [writeOffCertRef, setWriteOffCertRef] = useState('EFDA-DISP-2026-09');

  const storeLoc = locations.find((l) => l.type === 'STORE') || locations[0];
  const dispLoc = locations.find((l) => l.type === 'DISPENSARY') || locations[1] || locations[0];

  const now = new Date();

  // Helper for batch expiry status
  const getExpiryStatus = (expiryDateStr: string) => {
    const expDate = new Date(expiryDateStr);
    const diffDays = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'EXPIRED', color: 'bg-rose-100 text-rose-800 border-rose-300 font-bold' };
    if (diffDays <= 30) return { label: `< ${diffDays}d Expiry`, color: 'bg-amber-100 text-amber-800 border-amber-300 font-bold' };
    if (diffDays <= 90) return { label: `< 90d Expiry`, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    return { label: 'Normal', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  };

  // Filtered Stock Balances
  const filteredBalances = stockBalances.filter((bal) => {
    if (bal.quantity <= 0) return false;
    if (selectedLocFilter !== 'ALL' && bal.locationId !== selectedLocFilter) return false;

    const prod = products.find((p) => p.id === bal.productId);
    const batch = batches.find((b) => b.id === bal.batchId);
    if (!prod || !batch) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesName = prod.brandName.toLowerCase().includes(q);
      const matchesBatch = batch.batchNumber.toLowerCase().includes(q);
      if (!matchesName && !matchesBatch) return false;
    }

    if (onlyExpiring) {
      const expDate = new Date(batch.expiryDate);
      const diffDays = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 90) return false;
    }

    if (onlyLowStock) {
      if (bal.quantity >= prod.reorderLevel) return false;
    }

    return true;
  });

  // Available batches in Store for transfer
  const availableStoreBatches = stockBalances
    .filter((b) => b.locationId === storeLoc.id && b.quantity > 0)
    .map((b) => {
      const prod = products.find((p) => p.id === b.productId);
      const batch = batches.find((bat) => bat.id === b.batchId);
      return { balance: b, product: prod, batch };
    })
    .filter((item) => !!item.product && !!item.batch);

  // Execute Store -> Dispensary Transfer
  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const sourceStoreBalance = stockBalances.find(
      (b) => b.locationId === storeLoc.id && b.batchId === transferBatchId
    );

    if (!sourceStoreBalance || sourceStoreBalance.quantity < transferQty) {
      setTransferError(`Insufficient stock in Store warehouse. Available: ${sourceStoreBalance?.quantity || 0}`);
      return;
    }

    const targetBatch = batches.find((b) => b.id === transferBatchId)!;
    const transferNumber = `TRF-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Atomically deduct from Store balance and increment Dispensary balance
    setStockBalances((prev) => {
      // Deduct from store
      let updated = prev.map((b) =>
        b.id === sourceStoreBalance.id ? { ...b, quantity: b.quantity - transferQty } : b
      );

      // Add to dispensary
      const existingDispBalance = updated.find(
        (b) => b.locationId === dispLoc.id && b.batchId === transferBatchId
      );

      if (existingDispBalance) {
        updated = updated.map((b) =>
          b.id === existingDispBalance.id ? { ...b, quantity: b.quantity + transferQty } : b
        );
      } else {
        updated.push({
          id: `sb-${Date.now()}`,
          tenantId: currentTenantId,
          locationId: dispLoc.id,
          productId: targetBatch.productId,
          batchId: targetBatch.id,
          quantity: transferQty,
          reserved: 0,
          updatedAt: new Date().toISOString(),
        });
      }

      return updated;
    });

    // 2. Append Transfer Document
    const newTransfer: TransferOrder = {
      id: `trf-${Date.now()}`,
      tenantId: currentTenantId,
      transferNumber,
      sourceLocationId: storeLoc.id,
      destinationLocationId: dispLoc.id,
      status: 'RECEIVED',
      requestedBy: 'Hiwot Girma (Dispensary Pharmacist)',
      approvedBy: 'Rahel Tadesse (Inventory Mgr)',
      createdAt: now.toISOString(),
      receivedAt: now.toISOString(),
      notes: transferNotes || 'Routine store-to-dispensary shelf replenishment',
      items: [
        {
          id: `trfi-${Date.now()}`,
          productId: targetBatch.productId,
          batchId: targetBatch.id,
          quantity: transferQty,
        },
      ],
    };

    setTransfers((prev) => [newTransfer, ...prev]);

    if (onAddAuditLog) {
      const targetProd = products.find((p) => p.id === targetBatch.productId);
      onAddAuditLog(
        createAuditLog({
          tenantId: currentTenantId,
          userName: 'Rahel Tadesse',
          userRole: 'Inventory Manager',
          action: 'STORE_TRANSFER_APPROVED',
          entity: 'TransferOrder',
          entityId: transferNumber,
          entityName: `${targetProd?.brandName || 'Medicine'} [Batch: ${targetBatch.batchNumber}] - ${transferQty} Units`,
          batchNumber: targetBatch.batchNumber,
          category: 'STOCK_ENGINE',
          severity: 'INFO',
          locationId: storeLoc.id,
          locationName: storeLoc.name,
          efdaComplianceCode: 'EFDA-INTERNAL-CHAIN-05',
          reason: transferNotes || `Internal stock replenishment transfer from ${storeLoc.name} to ${dispLoc.name}.`,
          newValues: {
            transferNumber,
            sourceLocation: storeLoc.name,
            destinationLocation: dispLoc.name,
            quantity: transferQty,
          },
        })
      );
    }

    setShowTransferModal(false);
    setTransferError(null);
    setTransferNotes('');
  };

  // Execute Expiry Write-Off
  const handleExecuteWriteOff = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = stockBalances.find((b) => b.id === writeOffBalanceId);
    if (!balance || balance.quantity < writeOffQty) return;

    const targetBatch = batches.find((b) => b.id === balance.batchId);
    const targetProduct = products.find((p) => p.id === balance.productId);
    const loc = locations.find((l) => l.id === balance.locationId);

    setStockBalances((prev) =>
      prev.map((b) => (b.id === writeOffBalanceId ? { ...b, quantity: b.quantity - writeOffQty } : b))
    );

    if (onAddAuditLog) {
      onAddAuditLog(
        createAuditLog({
          tenantId: currentTenantId,
          userName: 'Rahel Tadesse',
          userRole: 'Inventory Manager',
          action: 'QUARANTINE_WRITE_OFF',
          entity: 'StockBalance',
          entityId: balance.id,
          entityName: `${targetProduct?.brandName || 'Medicine'} [Batch: ${targetBatch?.batchNumber || 'N/A'}] - ${writeOffQty} Units`,
          batchNumber: targetBatch?.batchNumber,
          category: 'COMPLIANCE',
          severity: 'CRITICAL',
          locationId: loc?.id,
          locationName: loc?.name,
          efdaComplianceCode: 'EFDA-DIR-981/2023-SEC4',
          reason: `Segregated ${writeOffQty} expired units into secure quarantine bin pending official EFDA disposal manifest.`,
          oldValues: { shelfQuantity: balance.quantity },
          newValues: {
            shelfQuantity: balance.quantity - writeOffQty,
            writtenOff: writeOffQty,
            quarantineStatus: 'QUARANTINED',
          },
        })
      );
    }

    setShowWriteOffModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold">Inventory Engine & Store &rarr; Dispensary Transfers</h2>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Strict multi-location control: Stock is maintained per batch per location. Sales only deplete from <strong>Dispensary</strong>; short stock is replenished from <strong>Store</strong> via transfer vouchers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (availableStoreBatches.length > 0) {
                  setTransferBatchId(availableStoreBatches[0].batch!.id);
                }
                setShowTransferModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-xs"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Transfer Store &rarr; Dispensary</span>
            </button>
          </div>
        </div>

        {/* Location Stock Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[11px]">Central Store Stock</span>
            <span className="text-lg font-bold text-amber-300 mt-0.5 block">
              {stockBalances
                .filter((b) => b.locationId === storeLoc.id)
                .reduce((acc, b) => acc + b.quantity, 0)
                .toLocaleString()}{' '}
              Units
            </span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[11px]">Front Dispensary Stock</span>
            <span className="text-lg font-bold text-emerald-300 mt-0.5 block">
              {stockBalances
                .filter((b) => b.locationId === dispLoc.id)
                .reduce((acc, b) => acc + b.quantity, 0)
                .toLocaleString()}{' '}
              Units
            </span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[11px]">Completed Transfers</span>
            <span className="text-lg font-bold text-white mt-0.5 block">{transfers.length} Transfers</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <span className="text-slate-400 block text-[11px]">Expired Quarantine</span>
            <span className="text-lg font-bold text-rose-400 mt-0.5 block">
              {batches.filter((b) => new Date(b.expiryDate).getTime() < now.getTime()).length} Batches
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
        <button
          onClick={() => setActiveTab('BALANCES')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition-all ${
            activeTab === 'BALANCES' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Warehouse className="w-3.5 h-3.5" />
          <span>Stock by Location & Batch ({filteredBalances.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('TRANSFERS')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition-all ${
            activeTab === 'TRANSFERS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Transfer Vouchers ({transfers.length})</span>
        </button>
      </div>

      {/* BALANCES TAB */}
      {activeTab === 'BALANCES' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search drug or batch number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs"
              />
            </div>

            {/* Location Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setSelectedLocFilter('ALL')}
                className={`px-3 py-1 rounded-md font-semibold ${selectedLocFilter === 'ALL' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'}`}
              >
                All Locations
              </button>
              <button
                onClick={() => setSelectedLocFilter(storeLoc.id)}
                className={`px-3 py-1 rounded-md font-semibold ${selectedLocFilter === storeLoc.id ? 'bg-amber-100 text-amber-900 shadow-xs' : 'text-slate-600'}`}
              >
                Store Only
              </button>
              <button
                onClick={() => setSelectedLocFilter(dispLoc.id)}
                className={`px-3 py-1 rounded-md font-semibold ${selectedLocFilter === dispLoc.id ? 'bg-emerald-100 text-emerald-900 shadow-xs' : 'text-slate-600'}`}
              >
                Dispensary Only
              </button>
            </div>

            {/* Quick alert toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOnlyExpiring(!onlyExpiring)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 ${
                  onlyExpiring ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Near Expiry (&le; 90d)
              </button>

              <button
                onClick={() => setOnlyLowStock(!onlyLowStock)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 ${
                  onlyLowStock ? 'bg-rose-100 border-rose-300 text-rose-900' : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Below Reorder Level
              </button>
            </div>
          </div>

          {/* Balances Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
                <tr>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Batch Number</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3 text-right">Physical Balance</th>
                  <th className="px-4 py-3 text-right">Packaging Ratio</th>
                  <th className="px-4 py-3 text-right">Unit Sell Price</th>
                  <th className="px-4 py-3 text-center">Status / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBalances.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      No stock balances matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredBalances.map((bal) => {
                    const prod = products.find((p) => p.id === bal.productId);
                    const batch = batches.find((b) => b.id === bal.batchId);
                    const loc = locations.find((l) => l.id === bal.locationId);
                    if (!prod || !batch) return null;

                    const expiryInfo = getExpiryStatus(batch.expiryDate);
                    const isLow = bal.quantity < prod.reorderLevel;

                    return (
                      <tr key={bal.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              loc?.type === 'STORE'
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            }`}
                          >
                            {loc?.type === 'STORE' ? <Warehouse className="w-3 h-3" /> : <Store className="w-3 h-3" />}
                            {loc?.name || 'Location'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{prod.brandName}</div>
                          <div className="text-[11px] text-slate-500">{prod.packSize}</div>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">
                          {batch.batchNumber}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${expiryInfo.color}`}>
                            {batch.expiryDate} ({expiryInfo.label})
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className={`font-bold text-sm ${isLow ? 'text-rose-700' : 'text-slate-900'}`}>
                            {bal.quantity.toLocaleString()} {prod.baseUnit}s
                          </div>
                          {isLow && (
                            <span className="text-[10px] font-bold text-rose-600 block">
                              Reorder Alert ({prod.reorderLevel})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-[11px] text-slate-600 font-mono">
                          {formatBaseQuantityInUnits(prod, bal.quantity)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {Number(batch.sellingPrice).toFixed(2)} ETB
                        </td>
                        <td className="px-4 py-3 text-center">
                          {expiryInfo.label === 'EXPIRED' && (
                            <button
                              onClick={() => {
                                setWriteOffBalanceId(bal.id);
                                setWriteOffQty(bal.quantity);
                                setShowWriteOffModal(true);
                              }}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded font-semibold text-[11px] border border-rose-200"
                            >
                              Write-Off Expired
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TRANSFERS HISTORY TAB */}
      {activeTab === 'TRANSFERS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
              <tr>
                <th className="px-4 py-3">Transfer Voucher</th>
                <th className="px-4 py-3">Origin Store &rarr; Destination</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Transferred Lines</th>
                <th className="px-4 py-3">Authorizer & Receiver</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.map((trf) => (
                <tr key={trf.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{trf.transferNumber}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-medium text-slate-800">
                      <span className="text-amber-800 font-semibold">Central Store</span>
                      <span>&rarr;</span>
                      <span className="text-emerald-800 font-semibold">Front Dispensary</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDualDate(trf.createdAt, language)}</td>
                  <td className="px-4 py-3">
                    {trf.items.map((it, idx) => {
                      const prod = products.find((p) => p.id === it.productId);
                      const batch = batches.find((b) => b.id === it.batchId);
                      return (
                        <div key={idx} className="text-[11px]">
                          <strong>{prod?.brandName}</strong>: {it.quantity} {prod?.baseUnit}s{' '}
                          <span className="font-mono text-slate-400">({batch?.batchNumber})</span>
                        </div>
                      );
                    })}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>Req: {trf.requestedBy}</div>
                    <div className="text-[10px] text-slate-400">Appr: {trf.approvedBy || 'Auto'}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {trf.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Store -> Dispensary Transfer */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-300" />
                <span>Internal Stock Transfer: Store &rarr; Dispensary</span>
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-emerald-200 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="p-6 space-y-4 text-xs">
              {transferError && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>{transferError}</span>
                </div>
              )}

              {/* Source and Destination flow notice */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">From Source:</span>
                  <span className="font-bold text-amber-800">{storeLoc.name} (Store)</span>
                </div>
                <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase">To Destination:</span>
                  <span className="font-bold text-emerald-800">{dispLoc.name} (Dispensary)</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">
                  Select Stock Available in Store Warehouse *
                </label>
                <select
                  value={transferBatchId}
                  onChange={(e) => setTransferBatchId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                >
                  {availableStoreBatches.map(({ balance, product, batch }) => (
                    <option key={batch!.id} value={batch!.id}>
                      {product!.brandName} — Batch: {batch!.batchNumber} (Store Balance: {balance.quantity} {product!.baseUnit}s • Exp: {batch!.expiryDate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">
                  Quantity to Transfer (in Base Units) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferQty}
                  onChange={(e) => setTransferQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Transfer Dispatch Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Front counter low on amoxicillin capsules"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Post Transfer & Update Dispensary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Expiry Write-Off */}
      {showWriteOffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-rose-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-300" />
                <span>Write-Off Expired / Damaged Stock</span>
              </h3>
              <button onClick={() => setShowWriteOffModal(false)} className="text-rose-200 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleExecuteWriteOff} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Disposal Reason *</label>
                <select
                  value={writeOffReason}
                  onChange={(e) => setWriteOffReason(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="EXPIRED">Expired Medicine (EFDA Disposal Protocol)</option>
                  <option value="DAMAGED">Damaged / Broken Glass Container</option>
                  <option value="RECALLED_EFDA">EFDA Batch Recall / Quarantine</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Quantity to Remove</label>
                <input
                  type="number"
                  min="1"
                  value={writeOffQty}
                  onChange={(e) => setWriteOffQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-rose-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">EFDA Disposal Certificate Ref</label>
                <input
                  type="text"
                  value={writeOffCertRef}
                  onChange={(e) => setWriteOffCertRef(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowWriteOffModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold"
                >
                  Confirm Disposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
