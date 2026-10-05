import React, { useState } from 'react';
import { MapPin, Warehouse, Store, Plus, CheckCircle2, ShieldCheck, ArrowRightLeft } from 'lucide-react';
import { Location, LocationType, StockBalance, Product } from '../types/pharmacy';

interface LocationsViewProps {
  locations: Location[];
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>;
  stockBalances: StockBalance[];
  products: Product[];
  currentTenantId: string;
  language: 'en' | 'am';
}

export const LocationsView: React.FC<LocationsViewProps> = ({
  locations,
  setLocations,
  stockBalances,
  products,
  currentTenantId,
  language,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<LocationType>('DISPENSARY');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('+251 ');

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    setLocations((prev) => [
      ...prev,
      {
        id: `loc-${Date.now()}`,
        tenantId: currentTenantId,
        name,
        code,
        type,
        isDefault: false,
        address,
        phone,
        isActive: true,
      },
    ]);

    setShowAdd(false);
    setName('');
    setCode('');
    setAddress('');
  };

  return (
    <div className="space-y-6">
      {/* Information Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-5 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <span>Multi-Location Architecture: Store vs. Dispensary</span>
            </h2>
            <p className="text-xs text-emerald-200 mt-1 max-w-2xl">
              In Ethiopian pharmacy operations, all bulk inventory from suppliers (EPSS, wholesalers) is initially received into <strong>Store</strong> (warehouse/quarantine). <strong>Dispensaries</strong> receive internal transfers from the store, and retail POS sales only deduct stock from the dispensary.
            </p>
          </div>

          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Pharmacy Location
          </button>
        </div>

        {/* Operational Workflow Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-emerald-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-700/80 flex items-center justify-center font-bold text-[11px]">1</span>
            <span><strong>Receive GRN</strong> into quarantine/store</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-700/80 flex items-center justify-center font-bold text-[11px]">2</span>
            <span><strong>Transfer Store &rarr; Dispensary</strong> with dispatch ticket</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-700/80 flex items-center justify-center font-bold text-[11px]">3</span>
            <span><strong>Dispense at POS</strong> with FEFO batch deduction</span>
          </div>
        </div>
      </div>

      {/* Add Location Form */}
      {showAdd && (
        <form onSubmit={handleAddLocation} className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 text-sm">Add New Pharmacy Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 mb-1 block">Location Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 2nd Floor Inpatient Dispensary"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 mb-1 block">Location Code *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. DISP-02 or STORE-WH"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 mb-1 block">Location Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as LocationType)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="STORE">Store / Central Warehouse (Receives GRN)</option>
                <option value="DISPENSARY">Dispensary / Counter (Dispenses to Patients)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 mb-1 block">Physical Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Room number, building, floor..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 mb-1 block">Direct Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
            >
              Save Location
            </button>
          </div>
        </form>
      )}

      {/* Locations Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {locations.map((loc) => {
          const locBalances = stockBalances.filter((b) => b.locationId === loc.id);
          const totalUnits = locBalances.reduce((acc, b) => acc + b.quantity, 0);

          return (
            <div
              key={loc.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        loc.type === 'STORE'
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
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        {loc.name}
                        {loc.isDefault && (
                          <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Default Counter
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-[11px]">
                          {loc.code}
                        </span>
                        <span>•</span>
                        <span className="font-medium text-slate-700">
                          {loc.type === 'STORE' ? 'Bulk Store / መጋዘን' : 'Retail Dispensary / መሸጫ'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{loc.address || 'Address on file'}</span>
                  </div>
                  {loc.phone && (
                    <div className="text-slate-500 font-mono text-[11px]">
                      Direct: {loc.phone}
                    </div>
                  )}
                </div>
              </div>

              {/* Stock summary badge */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl">
                <span className="text-slate-600">Tracked Batches:</span>
                <span className="font-bold text-slate-900">
                  {locBalances.length} batches ({totalUnits.toLocaleString()} base units)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
