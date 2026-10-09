import React, { useState } from 'react';
import {
  MapPin, Warehouse, Store, Plus, CheckCircle2, ShieldCheck,
  Building2, Edit3, Power, PowerOff, X, Building
} from 'lucide-react';
import { Location, LocationType, StockBalance, Product, Tenant } from '../types/pharmacy';

interface LocationsViewProps {
  locations: Location[];
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>;
  stockBalances: StockBalance[];
  products: Product[];
  currentTenantId: string;
  language: 'en' | 'am';
  currentTenant?: Tenant;
  tenants?: Tenant[];
}

export const LocationsView: React.FC<LocationsViewProps> = ({
  locations,
  setLocations,
  stockBalances,
  products,
  currentTenantId,
  language,
  currentTenant,
  tenants = [],
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // Add Form State
  const [name, setName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<LocationType>('DISPENSARY');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('+251 ');

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editBranchName, setEditBranchName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editType, setEditType] = useState<LocationType>('DISPENSARY');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const handleStartEdit = (loc: Location) => {
    setEditingLocation(loc);
    setEditName(loc.name);
    setEditBranchName(loc.branchName || '');
    setEditCode(loc.code);
    setEditType(loc.type);
    setEditAddress(loc.address || '');
    setEditPhone(loc.phone || '+251 ');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation || !editName.trim() || !editCode.trim()) return;

    setLocations((prev) =>
      prev.map((l) =>
        l.id === editingLocation.id
          ? {
              ...l,
              name: editName.trim(),
              branchName: editBranchName.trim() || undefined,
              code: editCode.trim(),
              type: editType,
              address: editAddress.trim() || undefined,
              phone: editPhone.trim() || undefined,
            }
          : l
      )
    );
    setEditingLocation(null);
  };

  const handleToggleDeactivate = (locId: string) => {
    setLocations((prev) =>
      prev.map((l) => (l.id === locId ? { ...l, isActive: !l.isActive } : l))
    );
  };

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    setLocations((prev) => [
      ...prev,
      {
        id: `loc-${Date.now()}`,
        tenantId: currentTenantId,
        name: name.trim(),
        branchName: branchName.trim() || undefined,
        code: code.trim(),
        type,
        isDefault: false,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        isActive: true,
      },
    ]);

    setShowAdd(false);
    setName('');
    setBranchName('');
    setCode('');
    setAddress('');
    setPhone('+251 ');
  };

  const isAm = language === 'am';

  return (
    <div className="space-y-6">
      {/* Pharmacy Company Scope Attribution */}
      {currentTenant && (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs border border-slate-800 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100">{currentTenant.name}</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded border border-emerald-500/30 font-mono">
                  {currentTenant.licenseNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isAm
                  ? 'የዚህ ፋርማሲ መጋዘኖች እና መሸጫ ቅርንጫፍ ቦታዎች'
                  : 'Physical store rooms and dispensing counters partitioned for this pharmacy tenant'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-400">
              {locations.filter((l) => l.tenantId === currentTenantId).length}{' '}
              {isAm ? 'ቦታዎች ተዋቅረዋል' : 'locations configured'}
            </span>
          </div>
        </div>
      )}

      {/* Information Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-5 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <span>
                {isAm
                  ? 'የባለብዙ ቦታ መዋቅር፡ መጋዘን (Store) እና መሸጫ (Dispensary)'
                  : 'Multi-Location Architecture: Store vs. Dispensary'}
              </span>
            </h2>
            <p className="text-xs text-emerald-200 mt-1 max-w-2xl">
              {isAm
                ? 'በኢትዮጵያ ፋርማሲዎች አሰራር መሰረት፣ ከአቅራቢዎች (EPSS ወዘተ) የሚገቡ መድሃኒቶች በሙሉ መጀመሪያ መጋዘን (Store) ይገባሉ። ከዚያ በኋላ ወደ መሸጫ ቆጣሪዎች (Dispensaries) በውስጥ ዝውውር ይተላለፋሉ፤ የPOS ሽያጭ ከመሸጫ ብቻ ይቀነሳል።'
                : 'In Ethiopian pharmacy operations, all bulk inventory from suppliers (EPSS, wholesalers) is initially received into Store (warehouse/quarantine). Dispensaries receive internal transfers from the store, and retail POS sales only deduct stock from the dispensary.'}
            </p>
          </div>

          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAm ? 'አዲስ ቅርንጫፍ / ቦታ ጨምር' : 'Add Pharmacy Location'}</span>
          </button>
        </div>

        {/* Operational Workflow Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-emerald-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-700/80 flex items-center justify-center font-bold text-[11px]">1</span>
            <span>{isAm ? 'GRN በመጋዘን መቀበል' : <><strong>Receive GRN</strong> into quarantine/store</>}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-700/80 flex items-center justify-center font-bold text-[11px]">2</span>
            <span>{isAm ? 'ከመጋዘን ወደ መሸጫ ማስተላለፍ' : <><strong>Transfer Store → Dispensary</strong> with dispatch ticket</>}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-700/80 flex items-center justify-center font-bold text-[11px]">3</span>
            <span>{isAm ? 'በFEFO መሸጥና ማደል' : <><strong>Dispense at POS</strong> with FEFO batch deduction</>}</span>
          </div>
        </div>
      </div>

      {/* Add Location Form */}
      {showAdd && (
        <form onSubmit={handleAddLocation} className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>{isAm ? 'አዲስ የፋርማሲ ቦታ / ቅርንጫፍ መዝግብ' : 'Add New Pharmacy Location / Counter'}</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 mb-1 block">
                {isAm ? 'የቦታው ስም *' : 'Location Name *'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isAm ? 'ለምሳሌ፡ የ2ኛ ፎቅ ታካሚዎች መሸጫ' : 'e.g. 2nd Floor Inpatient Dispensary'}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 mb-1 block">
                {isAm ? 'የቅርንጫፍ ስም (Branch Name)' : 'Branch Name (e.g. Bole Branch, Piassa Main)'}
              </label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder={isAm ? 'ለምሳሌ፡ ቦሌ ቅርንጫፍ' : 'e.g. Bole Branch'}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 mb-1 block">
                {isAm ? 'የቦታው መለያ ኮድ *' : 'Location Code *'}
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. DISP-02 or STORE-WH"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 mb-1 block">
                {isAm ? 'የቦታው አይነት *' : 'Location Type *'}
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as LocationType)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="STORE">{isAm ? 'መጋዘን / Store (GRN የሚቀበል)' : 'Store / Central Warehouse (Receives GRN)'}</option>
                <option value="DISPENSARY">{isAm ? 'መሸጫ / Dispensary (ለታካሚ የሚሸጥ)' : 'Dispensary / Counter (Dispenses to Patients)'}</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 mb-1 block">
                {isAm ? 'አድራሻ' : 'Physical Address'}
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={isAm ? 'ክፍል ቁጥር፣ ህንፃ፣ ወለል...' : 'Room number, building, floor...'}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 mb-1 block">
                {isAm ? 'ስልክ ቁጥር' : 'Direct Phone'}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
            >
              {isAm ? 'ሰርዝ' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              {isAm ? 'አስቀምጥ' : 'Save Location'}
            </button>
          </div>
        </form>
      )}

      {/* Edit Location Modal */}
      {editingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  {isAm ? 'የቦታ መረጃ አድስ' : 'Edit Pharmacy Location'}
                </h3>
              </div>
              <button
                onClick={() => setEditingLocation(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">
                    {isAm ? 'የቦታው ስም *' : 'Location Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">
                    {isAm ? 'የቅርንጫፍ ስም' : 'Branch Name'}
                  </label>
                  <input
                    type="text"
                    value={editBranchName}
                    onChange={(e) => setEditBranchName(e.target.value)}
                    placeholder="e.g. Bole Branch"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">
                    {isAm ? 'የቦታው መለያ ኮድ *' : 'Location Code *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">
                    {isAm ? 'የቦታው አይነት *' : 'Location Type *'}
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as LocationType)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="STORE">{isAm ? 'መጋዘን / Store' : 'Store / Central Warehouse'}</option>
                    <option value="DISPENSARY">{isAm ? 'መሸጫ / Dispensary' : 'Dispensary / Retail Counter'}</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-700 mb-1 block">
                    {isAm ? 'አድራሻ' : 'Physical Address'}
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-700 mb-1 block">
                    {isAm ? 'ስልክ ቁጥር' : 'Direct Phone'}
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingLocation(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  {isAm ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  {isAm ? 'ለውጦችን መዝግብ' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Locations Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {locations.map((loc) => {
          const locBalances = stockBalances.filter((b) => b.locationId === loc.id);
          const totalUnits = locBalances.reduce((acc, b) => acc + b.quantity, 0);

          return (
            <div
              key={loc.id}
              className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                loc.isActive
                  ? 'border-slate-200 shadow-2xs hover:border-slate-300'
                  : 'border-slate-300/70 bg-slate-50/70 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        !loc.isActive
                          ? 'bg-slate-200 text-slate-500'
                          : loc.type === 'STORE'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {loc.type === 'STORE' ? (
                        <Warehouse className="w-5 h-5" />
                      ) : (
                        <Store className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                        {loc.name}
                        {loc.isDefault && (
                          <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {isAm ? 'ዋና ቆጣሪ' : 'Default Counter'}
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-[11px]">
                          {loc.code}
                        </span>
                        {loc.branchName && (
                          <span className="bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.2 rounded text-[10px] font-semibold flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {loc.branchName}
                          </span>
                        )}
                        <span>•</span>
                        <span className="font-medium text-slate-700">
                          {loc.type === 'STORE'
                            ? (isAm ? 'መጋዘን (Store)' : 'Bulk Store / መጋዘን')
                            : (isAm ? 'መሸጫ (Dispensary)' : 'Retail Dispensary / መሸጫ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        loc.isActive
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {loc.isActive ? (isAm ? 'ንቁ' : 'Active') : (isAm ? 'ቦዘነ' : 'Deactivated')}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{loc.address || (isAm ? 'አድራሻ አልተገለጸም' : 'Address on file')}</span>
                  </div>
                  {loc.phone && (
                    <div className="text-slate-500 font-mono text-[11px]">
                      {isAm ? 'ስልክ' : 'Direct'}: {loc.phone}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions and Stock summary badge */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl">
                  <span className="text-slate-600">{isAm ? 'የተመዘገቡ ባቾች፡' : 'Tracked Batches:'}</span>
                  <span className="font-bold text-slate-900">
                    {locBalances.length} {isAm ? 'ባቾች' : 'batches'} ({totalUnits.toLocaleString()} {isAm ? 'ቤዝ አሃዶች' : 'base units'})
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 text-xs pt-1">
                  <button
                    onClick={() => handleStartEdit(loc)}
                    className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isAm ? 'አድስ' : 'Edit'}</span>
                  </button>

                  <button
                    onClick={() => handleToggleDeactivate(loc.id)}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold text-[11px] transition-colors cursor-pointer ${
                      loc.isActive
                        ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                        : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    {loc.isActive ? (
                      <>
                        <PowerOff className="w-3 h-3" />
                        <span>{isAm ? 'አቦዝን' : 'Deactivate'}</span>
                      </>
                    ) : (
                      <>
                        <Power className="w-3 h-3" />
                        <span>{isAm ? 'አግብር' : 'Activate'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
