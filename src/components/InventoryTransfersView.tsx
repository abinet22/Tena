import React, { useState, useMemo } from 'react';
import {
  ArrowRightLeft, Warehouse, Store, AlertTriangle,
  CheckCircle2, Clock, Plus, Trash2, ShieldAlert,
  Search, Filter, FileText, ArrowDownRight, Tag, Truck,
  Building2, MapPin
} from 'lucide-react';
import {
  StockBalance, Product, Batch, Location, TransferOrder,
  StockAdjustment, StockWriteOff, RoleCode, Category, AuditLog, User
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
  currentUser?: User | null;
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
  currentUser,
  onAddAuditLog,
}) => {
  const [activeTab, setActiveTab] = useState<'BALANCES' | 'TRANSFERS' | 'WRITEOFFS'>('BALANCES');
  const [selectedLocFilter, setSelectedLocFilter] = useState<string>('ALL');
  const [inventoryKindFilter, setInventoryKindFilter] = useState<'ALL' | 'STORE' | 'DISPENSARY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyExpiring, setOnlyExpiring] = useState(false);
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Tenant-scoped locations
  const tenantLocations = useMemo(() => {
    return locations.filter((l) => l.tenantId === currentTenantId);
  }, [locations, currentTenantId]);

  const defaultStoreLoc = tenantLocations.find((l) => l.type === 'STORE') || tenantLocations[0];
  const defaultDispLoc = tenantLocations.find((l) => l.type === 'DISPENSARY') || tenantLocations[1] || tenantLocations[0];

  // Transfer Modal State - Dynamic Multi-Branch & Inter-Branch
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [sourceLocationId, setSourceLocationId] = useState<string>(defaultStoreLoc?.id || '');
  const [destLocationId, setDestLocationId] = useState<string>(defaultDispLoc?.id || '');
  const [transferBatchId, setTransferBatchId] = useState('');
  const [transferQty, setTransferQty] = useState<number>(50);
  const [transferNotes, setTransferNotes] = useState('');
  const [driverName, setDriverName] = useState('Tesfaye Alemu (Logistics)');
  const [vehiclePlate, setVehiclePlate] = useState('AA-3-98214');
  const [transferError, setTransferError] = useState<string | null>(null);

  // Write-Off Modal State
  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [writeOffBalanceId, setWriteOffBalanceId] = useState('');
  const [writeOffReason, setWriteOffReason] = useState<'EXPIRED' | 'DAMAGED' | 'RECALLED_EFDA'>('EXPIRED');
  const [writeOffQty, setWriteOffQty] = useState<number>(10);
  const [writeOffCertRef, setWriteOffCertRef] = useState('EFDA-DISP-2026-09');

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

  // Filtered Stock Balances with Two Inventory Types (Store vs Dispensary)
  const filteredBalances = stockBalances.filter((bal) => {
    if (bal.quantity <= 0) return false;
    const loc = tenantLocations.find((l) => l.id === bal.locationId);
    if (!loc) return false;

    if (selectedLocFilter !== 'ALL' && bal.locationId !== selectedLocFilter) return false;
    if (inventoryKindFilter !== 'ALL' && loc.type !== inventoryKindFilter) return false;

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

  // Selected source & destination locations
  const activeSourceLoc = tenantLocations.find((l) => l.id === sourceLocationId) || defaultStoreLoc;
  const activeDestLoc = tenantLocations.find((l) => l.id === destLocationId) || defaultDispLoc;

  const isInterBranch = activeSourceLoc && activeDestLoc && (activeSourceLoc.branchName !== activeDestLoc.branchName);

  // Available batches in chosen Source Location
  const availableSourceBatches = useMemo(() => {
    if (!activeSourceLoc) return [];
    return stockBalances
      .filter((b) => b.locationId === activeSourceLoc.id && b.quantity > 0)
      .map((b) => {
        const prod = products.find((p) => p.id === b.productId);
        const batch = batches.find((bat) => bat.id === b.batchId);
        return { balance: b, product: prod, batch };
      })
      .filter((item) => !!item.product && !!item.batch);
  }, [stockBalances, activeSourceLoc, products, batches]);

  // Execute Transfer (Intra-Branch or Inter-Branch)
  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSourceLoc || !activeDestLoc) {
      setTransferError('Please select both source and destination locations.');
      return;
    }

    if (activeSourceLoc.id === activeDestLoc.id) {
      setTransferError('Source and destination cannot be identical. Choose a different destination.');
      return;
    }

    const sourceBalance = stockBalances.find(
      (b) => b.locationId === activeSourceLoc.id && b.batchId === transferBatchId
    );

    if (!sourceBalance || sourceBalance.quantity < transferQty) {
      setTransferError(`Insufficient stock in ${activeSourceLoc.name}. Available: ${sourceBalance?.quantity || 0}`);
      return;
    }

    const targetBatch = batches.find((b) => b.id === transferBatchId)!;
    const transferNumber = `TRF-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const transferKind = isInterBranch ? 'INTER_BRANCH' : 'INTERNAL_STORE_DISPENSARY';

    // 1. Atomically deduct from Source and increment Destination
    setStockBalances((prev) => {
      // Deduct from source
      let updated = prev.map((b) =>
        b.id === sourceBalance.id ? { ...b, quantity: b.quantity - transferQty } : b
      );

      // Add to destination
      const existingDestBalance = updated.find(
        (b) => b.locationId === activeDestLoc.id && b.batchId === transferBatchId
      );

      if (existingDestBalance) {
        updated = updated.map((b) =>
          b.id === existingDestBalance.id ? { ...b, quantity: b.quantity + transferQty } : b
        );
      } else {
        updated.push({
          id: `sb-${Date.now()}`,
          tenantId: currentTenantId,
          locationId: activeDestLoc.id,
          productId: targetBatch.productId,
          batchId: targetBatch.id,
          quantity: transferQty,
          reserved: 0,
          updatedAt: new Date().toISOString(),
        });
      }

      return updated;
    });

    // 2. Append Transfer Document with inter-branch logistics metadata
    const newTransfer: TransferOrder = {
      id: `trf-${Date.now()}`,
      tenantId: currentTenantId,
      transferNumber,
      transferType: transferKind,
      sourceLocationId: activeSourceLoc.id,
      destinationLocationId: activeDestLoc.id,
      status: 'RECEIVED',
      requestedBy: currentUser?.fullName || 'Rahel Tadesse (Inventory Mgr)',
      approvedBy: 'Dr. Lead Pharmacist (Shop Admin)',
      driverName: isInterBranch ? driverName : undefined,
      vehiclePlate: isInterBranch ? vehiclePlate : undefined,
      createdAt: now.toISOString(),
      receivedAt: now.toISOString(),
      notes: transferNotes || (isInterBranch ? `Inter-branch stock rebalance between ${activeSourceLoc.branchName} and ${activeDestLoc.branchName}` : 'Routine internal shelf replenishment'),
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
          userName: currentUser?.fullName || 'Rahel Tadesse',
          userRole: currentRole.replace('_', ' '),
          action: isInterBranch ? 'INTER_BRANCH_TRANSFER_DISPATCH' : 'STORE_TRANSFER_APPROVED',
          entity: 'TransferOrder',
          entityId: transferNumber,
          entityName: `${targetProd?.brandName || 'Medicine'} [${targetBatch.batchNumber}] - ${transferQty} Units (${transferKind})`,
          batchNumber: targetBatch.batchNumber,
          category: 'STOCK_ENGINE',
          severity: 'INFO',
          locationId: activeSourceLoc.id,
          locationName: activeSourceLoc.name,
          efdaComplianceCode: isInterBranch ? 'EFDA-BRANCH-TRANSIT-08' : 'EFDA-INTERNAL-CHAIN-05',
          reason: transferNotes || `${transferKind}: Dispatched ${transferQty} units from ${activeSourceLoc.name} (${activeSourceLoc.branchName}) to ${activeDestLoc.name} (${activeDestLoc.branchName}).`,
          newValues: {
            transferNumber,
            transferType: transferKind,
            sourceLocation: activeSourceLoc.name,
            sourceBranch: activeSourceLoc.branchName,
            destinationLocation: activeDestLoc.name,
            destinationBranch: activeDestLoc.branchName,
            driverName: isInterBranch ? driverName : null,
            vehiclePlate: isInterBranch ? vehiclePlate : null,
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
              <h2 className="text-lg font-bold">
                {language === 'am' ? 'የስቶክ አስተዳደርና የቅርንጫፍ ዝውውር' : 'Inventory Engine & Multi-Branch Stock Transfers'}
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Strict Dual-Inventory architecture: <strong>Quarantine Store (Bulk Stock)</strong> vs <strong>Dispensary Counter (Ready to Dispense)</strong>. Supports internal shelf replenishment and tracked inter-branch transfers between all pharmacy branches.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (availableSourceBatches.length > 0) {
                  setTransferBatchId(availableSourceBatches[0].batch!.id);
                }
                setShowTransferModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-xs"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>{language === 'am' ? '+ አዲስ ስቶክ ዝውውር (መጋዘን / ቅርንጫፍ)' : '+ New Stock Transfer (Internal / Inter-Branch)'}</span>
            </button>
          </div>
        </div>

        {/* Dual Inventory & Location Stock Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 block text-[11px]">Central Stores (Bulk Stock)</span>
              <Warehouse className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-lg font-bold text-amber-300 mt-0.5 block">
              {stockBalances
                .filter((b) => {
                  const loc = tenantLocations.find((l) => l.id === b.locationId);
                  return loc?.type === 'STORE';
                })
                .reduce((acc, b) => acc + b.quantity, 0)
                .toLocaleString()}{' '}
              Units
            </span>
            <span className="text-[10px] text-slate-400">Quarantine & wholesale reserve</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 block text-[11px]">Dispensaries (Ready to Dispense)</span>
              <Store className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-lg font-bold text-emerald-300 mt-0.5 block">
              {stockBalances
                .filter((b) => {
                  const loc = tenantLocations.find((l) => l.id === b.locationId);
                  return loc?.type === 'DISPENSARY';
                })
                .reduce((acc, b) => acc + b.quantity, 0)
                .toLocaleString()}{' '}
              Units
            </span>
            <span className="text-[10px] text-slate-400">Retail shelf for POS selling</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 block text-[11px]">Transfer Vouchers</span>
              <Truck className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <span className="text-lg font-bold text-white mt-0.5 block">
              {transfers.length} Transfers
            </span>
            <span className="text-[10px] text-slate-400">
              {transfers.filter((t) => t.transferType === 'INTER_BRANCH').length} Inter-branch
            </span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 block text-[11px]">Active Branches</span>
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <span className="text-lg font-bold text-purple-300 mt-0.5 block">
              {Array.from(new Set(tenantLocations.map((l) => l.branchName || 'Main'))).length} Branches
            </span>
            <span className="text-[10px] text-slate-400">{tenantLocations.length} store & dispensary hubs</span>
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

            {/* Inventory Kind (Store vs Dispensary) Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setInventoryKindFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-semibold ${inventoryKindFilter === 'ALL' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'}`}
              >
                All Kinds
              </button>
              <button
                onClick={() => setInventoryKindFilter('STORE')}
                className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 ${inventoryKindFilter === 'STORE' ? 'bg-amber-100 text-amber-900 shadow-xs' : 'text-slate-600'}`}
              >
                <Warehouse className="w-3 h-3 text-amber-700" />
                Store (Stock)
              </button>
              <button
                onClick={() => setInventoryKindFilter('DISPENSARY')}
                className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 ${inventoryKindFilter === 'DISPENSARY' ? 'bg-emerald-100 text-emerald-900 shadow-xs' : 'text-slate-600'}`}
              >
                <Store className="w-3 h-3 text-emerald-700" />
                Dispensary (Dispense)
              </button>
            </div>

            {/* Branch Hub Filter */}
            <select
              aria-label="Filter by location"
              value={selectedLocFilter}
              onChange={(e) => setSelectedLocFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold"
            >
              <option value="ALL">All Branches & Hubs ({tenantLocations.length})</option>
              {tenantLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.branchName || 'Main'} — {loc.name} [{loc.type}]
                </option>
              ))}
            </select>

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
                <th className="px-4 py-3">Transfer Type</th>
                <th className="px-4 py-3">Origin &rarr; Destination Hub</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Transferred Lines</th>
                <th className="px-4 py-3">Logistics & Authorization</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No transfer orders posted yet. Click "+ New Stock Transfer" to initiate.
                  </td>
                </tr>
              ) : (
                transfers.map((trf) => {
                  const sLoc = tenantLocations.find((l) => l.id === trf.sourceLocationId);
                  const dLoc = tenantLocations.find((l) => l.id === trf.destinationLocationId);
                  const isInter = trf.transferType === 'INTER_BRANCH' || (sLoc && dLoc && sLoc.branchName !== dLoc.branchName);

                  return (
                    <tr key={trf.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {trf.transferNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isInter
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {isInter ? <Truck className="w-3 h-3 text-blue-600" /> : <Store className="w-3 h-3 text-emerald-600" />}
                          {isInter ? 'Inter-Branch Transfer' : 'Internal Shelf Transfer'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-medium text-slate-800">
                          <div>
                            <span className="font-bold text-slate-900">{sLoc?.branchName || 'Origin'}</span>
                            <span className="text-[10px] text-amber-800 block">
                              {sLoc?.name || 'Central Store'} [{sLoc?.type || 'STORE'}]
                            </span>
                          </div>
                          <span className="text-slate-400 font-bold">&rarr;</span>
                          <div>
                            <span className="font-bold text-slate-900">{dLoc?.branchName || 'Destination'}</span>
                            <span className="text-[10px] text-emerald-800 block">
                              {dLoc?.name || 'Retail Dispensary'} [{dLoc?.type || 'DISPENSARY'}]
                            </span>
                          </div>
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
                        <div className="font-semibold text-slate-800">Req: {trf.requestedBy}</div>
                        {trf.driverName && (
                          <div className="text-[10px] text-blue-700 flex items-center gap-1">
                            <Truck className="w-2.5 h-2.5" /> Driver: {trf.driverName} ({trf.vehiclePlate || 'Van'})
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400">Appr: {trf.approvedBy || 'Dr. Lead Pharmacist'}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {trf.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Dynamic Internal & Inter-Branch Transfer */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-300" />
                <span>
                  {isInterBranch
                    ? 'Inter-Branch Stock Transfer (ቅርንጫፍ ወደ ቅርንጫፍ)'
                    : 'Internal Stock Transfer: Store &rarr; Dispensary'}
                </span>
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-emerald-200 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="p-6 space-y-4 text-xs">
              {transferError && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{transferError}</span>
                </div>
              )}

              {/* Source & Destination Location Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">
                    Source Hub (From Location) *
                  </label>
                  <select
                    value={sourceLocationId}
                    onChange={(e) => setSourceLocationId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                  >
                    {tenantLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.branchName || 'Main'} — {loc.name} [{loc.type === 'STORE' ? 'Stock Store' : 'Dispensary'}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">
                    Destination Hub (To Location) *
                  </label>
                  <select
                    value={destLocationId}
                    onChange={(e) => setDestLocationId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                  >
                    {tenantLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.branchName || 'Main'} — {loc.name} [{loc.type === 'STORE' ? 'Stock Store' : 'Dispensary'}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transfer Classification Notification */}
              {isInterBranch ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5 text-blue-900">
                  <Truck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs">
                      Inter-Branch Transit: {activeSourceLoc?.branchName} &rarr; {activeDestLoc?.branchName}
                    </div>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Inter-branch transit requires transport log compliance under EFDA logistics regulations.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-emerald-900">
                  <Store className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs">
                      Internal Shelf Replenishment within {activeSourceLoc?.branchName}
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Transferring inventory between Store (Stock) and Dispensary (Retail counter) in the same facility.
                    </p>
                  </div>
                </div>
              )}

              {/* Batch selection from chosen source location */}
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">
                  Select Stock Available in Source Location ({availableSourceBatches.length} Batches) *
                </label>
                {availableSourceBatches.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                    No active stock batches found in <strong>{activeSourceLoc?.name}</strong>. Please choose another source hub.
                  </div>
                ) : (
                  <select
                    value={transferBatchId || availableSourceBatches[0]?.batch?.id}
                    onChange={(e) => setTransferBatchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-xs"
                  >
                    {availableSourceBatches.map(({ balance, product, batch }) => (
                      <option key={batch!.id} value={batch!.id}>
                        {product!.brandName} — Batch: {batch!.batchNumber} (Available: {balance.quantity} {product!.baseUnit}s • Exp: {batch!.expiryDate})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Quantity to transfer */}
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-emerald-800 text-sm"
                />
              </div>

              {/* Inter-Branch Logistics Fields */}
              {isInterBranch && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="font-semibold text-slate-700 mb-1 block">Driver / Dispatcher Name</label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 mb-1 block">Vehicle Plate Number</label>
                    <input
                      type="text"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Transfer Dispatch Notes / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Replenishing high demand pediatric syrups"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
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
                  disabled={availableSourceBatches.length === 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs flex items-center gap-2"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Execute Transfer & Update Balances</span>
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
