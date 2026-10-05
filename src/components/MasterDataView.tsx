import React, { useState, useRef, useMemo } from 'react';
import {
  FileSpreadsheet, Download, Upload, Plus, Trash2, Edit3,
  CheckCircle2, AlertCircle, Layers, Building, Factory, Truck, Ruler,
  Building2, Filter, Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Category, Generic, Manufacturer, Supplier, Unit, Tenant } from '../types/pharmacy';

interface MasterDataViewProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  generics: Generic[];
  setGenerics: React.Dispatch<React.SetStateAction<Generic[]>>;
  manufacturers: Manufacturer[];
  setManufacturers: React.Dispatch<React.SetStateAction<Manufacturer[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  units: Unit[];
  setUnits: React.Dispatch<React.SetStateAction<Unit[]>>;
  currentTenantId: string;
  currentTenant?: Tenant;
  tenants?: Tenant[];
  onSelectTenant?: (tenant: Tenant) => void;
  isPlatformAdmin?: boolean;
  language: 'en' | 'am';
}

type MasterTab = 'CATEGORIES' | 'GENERICS' | 'MANUFACTURERS' | 'SUPPLIERS' | 'UNITS';

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  categories,
  setCategories,
  generics,
  setGenerics,
  manufacturers,
  setManufacturers,
  suppliers,
  setSuppliers,
  units,
  setUnits,
  currentTenantId,
  currentTenant,
  tenants = [],
  onSelectTenant,
  isPlatformAdmin = false,
  language,
}) => {
  const [activeTab, setActiveTab] = useState<MasterTab>('CATEGORIES');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTenantScope, setSelectedTenantScope] = useState<string>('CURRENT');

  // Category new form state
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catIsMedicine, setCatIsMedicine] = useState(true);
  const [catTrackBatch, setCatTrackBatch] = useState(true);
  const [catTrackExpiry, setCatTrackExpiry] = useState(true);

  // Filter entities according to active scope
  const displayedCategories = useMemo(() => {
    if (selectedTenantScope === 'ALL') return categories;
    const targetId = selectedTenantScope === 'CURRENT' ? currentTenantId : selectedTenantScope;
    return categories.filter((c) => c.tenantId === targetId || !c.tenantId);
  }, [categories, selectedTenantScope, currentTenantId]);

  // Generic new form state
  const [genName, setGenName] = useState('');
  const [genClass, setGenClass] = useState('');
  const [genPreg, setGenPreg] = useState<'A' | 'B' | 'C' | 'D' | 'X'>('B');

  // Manufacturer new form state
  const [mfrName, setMfrName] = useState('');
  const [mfrCountry, setMfrCountry] = useState('Ethiopia');

  // Supplier new form state
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('+251 ');
  const [supTin, setSupTin] = useState('');

  // Unit new form state
  const [unitName, setUnitName] = useState('');
  const [unitAbbr, setUnitAbbr] = useState('');

  // ----------------------------------------------------
  // Excel Export Handler
  // ----------------------------------------------------
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (activeTab === 'CATEGORIES') {
      const data = categories.map((c) => ({
        Name: c.name,
        Description: c.description || '',
        Is_Medicine: c.isMedicine ? 'YES' : 'NO',
        Track_Batch: c.trackBatch ? 'YES' : 'NO',
        Track_Expiry: c.trackExpiry ? 'YES' : 'NO',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Categories');
      XLSX.writeFile(wb, `TenaPharm_Categories_${Date.now()}.xlsx`);
    } else if (activeTab === 'GENERICS') {
      const data = generics.map((g) => ({
        Generic_Name: g.name,
        Therapeutic_Class: g.therapeuticClass || '',
        Pregnancy_Category: g.pregnancyCategory || 'B',
        Description: g.description || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Generics');
      XLSX.writeFile(wb, `TenaPharm_Generics_${Date.now()}.xlsx`);
    } else if (activeTab === 'MANUFACTURERS') {
      const data = manufacturers.map((m) => ({
        Name: m.name,
        Country: m.country,
        Address: m.address || '',
        Contact: m.contact || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Manufacturers');
      XLSX.writeFile(wb, `TenaPharm_Manufacturers_${Date.now()}.xlsx`);
    } else if (activeTab === 'SUPPLIERS') {
      const data = suppliers.map((s) => ({
        Name: s.name,
        TIN_Number: s.tinNumber || '',
        Phone: s.phone,
        Email: s.email || '',
        Balance_Due: s.balanceDue,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
      XLSX.writeFile(wb, `TenaPharm_Suppliers_${Date.now()}.xlsx`);
    } else {
      const data = units.map((u) => ({
        Name: u.name,
        Abbreviation: u.abbreviation,
        Is_Base_Unit: u.isBase ? 'YES' : 'NO',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Units');
      XLSX.writeFile(wb, `TenaPharm_Units_${Date.now()}.xlsx`);
    }
  };

  // ----------------------------------------------------
  // Excel Import Handler
  // ----------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (!data || data.length === 0) {
          setImportStatus('No rows found in Excel sheet.');
          return;
        }

        if (activeTab === 'CATEGORIES') {
          const newItems: Category[] = data.map((row, idx) => ({
            id: `cat-imported-${Date.now()}-${idx}`,
            tenantId: currentTenantId,
            name: row.Name || row['Category Name'] || `Imported Cat ${idx + 1}`,
            description: row.Description || '',
            isMedicine: (row.Is_Medicine || row['Is Medicine'] || '').toString().toUpperCase() === 'YES',
            trackBatch: (row.Track_Batch || row['Track Batch'] || '').toString().toUpperCase() === 'YES',
            trackExpiry: (row.Track_Expiry || row['Track Expiry'] || '').toString().toUpperCase() === 'YES',
          }));
          setCategories((prev) => [...prev, ...newItems]);
          setImportStatus(`Successfully imported ${newItems.length} categories!`);
        } else if (activeTab === 'GENERICS') {
          const newItems: Generic[] = data.map((row, idx) => ({
            id: `gen-imported-${Date.now()}-${idx}`,
            tenantId: currentTenantId,
            name: row.Generic_Name || row['Generic Name'] || `Generic ${idx + 1}`,
            therapeuticClass: row.Therapeutic_Class || row['Therapeutic Class'] || '',
            pregnancyCategory: (row.Pregnancy_Category || 'B') as any,
            description: row.Description || '',
          }));
          setGenerics((prev) => [...prev, ...newItems]);
          setImportStatus(`Successfully imported ${newItems.length} generic substances!`);
        }

        setTimeout(() => setImportStatus(null), 5000);
      } catch (err: any) {
        setImportStatus(`Error importing Excel: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Add entity handlers
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setCategories((prev) => [
      ...prev,
      {
        id: `cat-${Date.now()}`,
        tenantId: currentTenantId,
        name: catName,
        description: catDesc,
        isMedicine: catIsMedicine,
        trackBatch: catTrackBatch,
        trackExpiry: catTrackExpiry,
      },
    ]);
    setCatName('');
    setCatDesc('');
  };

  const handleAddGeneric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genName.trim()) return;
    setGenerics((prev) => [
      ...prev,
      {
        id: `gen-${Date.now()}`,
        tenantId: currentTenantId,
        name: genName,
        therapeuticClass: genClass,
        pregnancyCategory: genPreg,
      },
    ]);
    setGenName('');
    setGenClass('');
  };

  return (
    <div className="space-y-4">
      {/* Company / Pharmacy Configuration Ownership Banner */}
      <div className="bg-slate-900 text-white p-4 md:p-5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-sm">
                Pharmacy Configuration Scope: {currentTenant?.name || 'Active Pharmacy'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Tenant ID: {currentTenantId}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              All inventory configurations (medicine categories, generic active ingredients, units, and suppliers) are strictly isolated with company ownership.
            </p>
          </div>
        </div>

        {/* Company Filter Selector */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
          <span className="text-slate-300 font-semibold flex items-center gap-1 pl-1">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <span>Filter Configuration For:</span>
          </span>
          <select
            value={selectedTenantScope}
            onChange={(e) => setSelectedTenantScope(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-900 text-white font-bold text-xs focus:outline-emerald-500 cursor-pointer"
          >
            <option value="CURRENT">Current Shop ({currentTenant?.name || currentTenantId})</option>
            <option value="ALL">All Registered Pharmacies (SaaS View)</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab Navigation & Excel Actions Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        {/* Sub-tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
          <button
            onClick={() => setActiveTab('CATEGORIES')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'CATEGORIES'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            Categories with Flags ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('GENERICS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'GENERICS'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-indigo-600" />
            Generics (INN) ({generics.length})
          </button>
          <button
            onClick={() => setActiveTab('MANUFACTURERS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'MANUFACTURERS'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Factory className="w-3.5 h-3.5 text-amber-600" />
            Manufacturers ({manufacturers.length})
          </button>
          <button
            onClick={() => setActiveTab('SUPPLIERS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'SUPPLIERS'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            Suppliers ({suppliers.length})
          </button>
          <button
            onClick={() => setActiveTab('UNITS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'UNITS'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Ruler className="w-3.5 h-3.5 text-purple-600" />
            Units ({units.length})
          </button>
        </div>

        {/* Excel Import / Export Tools */}
        <div className="flex items-center gap-2 text-xs">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Excel
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export .XLSX
          </button>
        </div>
      </div>

      {/* Import Notification Banner */}
      {importStatus && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* ==================================================== */}
      {/* CATEGORIES TAB (WITH DRIVEN FLAGS) */}
      {/* ==================================================== */}
      {activeTab === 'CATEGORIES' && (
        <div className="space-y-4">
          {/* Quick Create Category Card with Behavior Flags */}
          <form
            onSubmit={handleAddCategory}
            className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                Add Category with Behavior Flags
              </span>
              <span className="text-[11px] text-slate-500">
                Flags drive automated validation in GRN, POS, and inventory expiration rules
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs items-end">
              <div className="md:col-span-2">
                <label className="font-semibold text-slate-700 mb-1 block">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ophthalmic Drops, Baby Milk Formula..."
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Product Type Flag</label>
                <label className="flex items-center gap-2 py-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={catIsMedicine}
                    onChange={(e) => setCatIsMedicine(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-medium text-slate-800">Is Medicine</span>
                </label>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Batch Requirement</label>
                <label className="flex items-center gap-2 py-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={catTrackBatch}
                    onChange={(e) => setCatTrackBatch(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-medium text-slate-800">Track Batch</span>
                </label>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Expiry Requirement</label>
                <label className="flex items-center gap-2 py-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={catTrackExpiry}
                    onChange={(e) => setCatTrackExpiry(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-medium text-slate-800">Track Expiry</span>
                </label>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 text-[11px]">
                Rule Preview:{' '}
                {catIsMedicine
                  ? 'Pharmaceutical item requiring EFDA compliance.'
                  : catTrackExpiry
                  ? 'General goods (e.g. Baby Milk Formula/Cosmetics) requiring batch and expiration.'
                  : 'Disposable goods (e.g. Diapers) exempt from batch/expiry.'}
              </span>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
              >
                Save Category
              </button>
            </div>
          </form>

          {/* Categories Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
                <tr>
                  <th className="px-4 py-3">Category Name</th>
                  <th className="px-4 py-3">Pharmacy Owner</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-center">Is Medicine Flag</th>
                  <th className="px-4 py-3 text-center">Track Batch Flag</th>
                  <th className="px-4 py-3 text-center">Track Expiry Flag</th>
                  <th className="px-4 py-3">Enforcement Behavior</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedCategories.map((c) => {
                  const owner = tenants.find((t) => t.id === c.tenantId);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-bold text-slate-900">{c.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                          <Building2 className="w-3 h-3 text-emerald-600" />
                          <span>{owner?.name || (c.tenantId === 't-abyssinia' ? 'Abyssinia Central' : c.tenantId || 'Universal')}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{c.description || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                            c.isMedicine ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {c.isMedicine ? 'Yes (Medicine)' : 'No (General)'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                            c.trackBatch ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {c.trackBatch ? 'Required' : 'Optional'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                            c.trackExpiry ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {c.trackExpiry ? 'Mandatory' : 'Exempt'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600">
                        {c.isMedicine
                          ? 'EFDA scheduled medicine dispensing'
                          : c.trackExpiry
                          ? 'Enforces batch + expiry on GRN (e.g. Baby Milk)'
                          : 'Permits blank expiry/batch (e.g. Diapers)'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* GENERICS TAB */}
      {/* ==================================================== */}
      {activeTab === 'GENERICS' && (
        <div className="space-y-4">
          <form
            onSubmit={handleAddGeneric}
            className="bg-white p-4 rounded-xl border border-indigo-200 shadow-2xs space-y-3"
          >
            <span className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              Add INN Master Generic
            </span>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs items-end">
              <div className="md:col-span-2">
                <label className="font-semibold text-slate-700 mb-1 block">INN Generic Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ceftriaxone Sodium, Ibuprofen"
                  value={genName}
                  onChange={(e) => setGenName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Therapeutic Class</label>
                <input
                  type="text"
                  placeholder="e.g. Cephalosporin Antibiotic"
                  value={genClass}
                  onChange={(e) => setGenClass(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Pregnancy Risk Category</label>
                <select
                  value={genPreg}
                  onChange={(e) => setGenPreg(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                >
                  <option value="A">Category A (Safe)</option>
                  <option value="B">Category B (Likely Safe)</option>
                  <option value="C">Category C (Use with Caution)</option>
                  <option value="D">Category D (Risk to Fetus)</option>
                  <option value="X">Category X (Contraindicated)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs"
              >
                Save Generic
              </button>
            </div>
          </form>

          {/* Generics Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
                <tr>
                  <th className="px-4 py-3">INN Generic Substance</th>
                  <th className="px-4 py-3">Therapeutic Class</th>
                  <th className="px-4 py-3 text-center">Pregnancy Safety</th>
                  <th className="px-4 py-3">EFDA Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {generics.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-bold text-slate-900">{g.name}</td>
                    <td className="px-4 py-3 text-slate-600">{g.therapeuticClass || 'Standard'}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          g.pregnancyCategory === 'A'
                            ? 'bg-emerald-100 text-emerald-800'
                            : g.pregnancyCategory === 'B'
                            ? 'bg-blue-100 text-blue-800'
                            : g.pregnancyCategory === 'C'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        Category {g.pregnancyCategory || 'B'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{g.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MANUFACTURERS TAB */}
      {/* ==================================================== */}
      {activeTab === 'MANUFACTURERS' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
              <tr>
                <th className="px-4 py-3">Manufacturer Name</th>
                <th className="px-4 py-3">Country of Origin</th>
                <th className="px-4 py-3">Factory Address</th>
                <th className="px-4 py-3">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {manufacturers.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-bold text-slate-900">{m.name}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">
                    {m.country === 'Ethiopia' ? '🇪🇹 Ethiopia' : `🌐 ${m.country}`}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{m.address || '—'}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{m.contact || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUPPLIERS TAB */}
      {/* ==================================================== */}
      {activeTab === 'SUPPLIERS' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
              <tr>
                <th className="px-4 py-3">Supplier Name</th>
                <th className="px-4 py-3">TIN Number</th>
                <th className="px-4 py-3">Contact Person</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Outstanding Payables</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-bold text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{s.tinNumber || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{s.contactPerson || '—'}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{s.phone}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {s.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================================================== */}
      {/* UNITS TAB */}
      {/* ==================================================== */}
      {activeTab === 'UNITS' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
              <tr>
                <th className="px-4 py-3">Unit Name</th>
                <th className="px-4 py-3">Abbreviation</th>
                <th className="px-4 py-3 text-center">Is Base Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {units.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-bold text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{u.abbreviation}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                        u.isBase ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {u.isBase ? 'Base Dispensing Unit' : 'Packaging Multiplier'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
