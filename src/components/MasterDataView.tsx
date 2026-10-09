import React, { useState, useRef, useMemo } from 'react';
import {
  FileSpreadsheet, Download, Upload, Plus, Trash2, Edit3,
  CheckCircle2, AlertCircle, Layers, Building, Factory, Truck, Ruler,
  Building2, Filter, Sparkles, Info, X, AlertTriangle
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

interface DryRunModalData {
  tab: MasterTab;
  tabLabel: string;
  totalRows: number;
  newCount: number;
  updateCount: number;
  itemsToCommit: any[];
  applyImport: () => void;
}

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
  const isAm = language === 'am';
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

  // Category Edit state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');
  const [editCatIsMedicine, setEditCatIsMedicine] = useState(true);
  const [editCatTrackBatch, setEditCatTrackBatch] = useState(true);
  const [editCatTrackExpiry, setEditCatTrackExpiry] = useState(true);

  // Dry-run preview modal state
  const [dryRunData, setDryRunData] = useState<DryRunModalData | null>(null);

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
  // Excel Import Handler with Dry-Run & Natural-Key Upsert
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
          setImportStatus(isAm ? 'በፋይሉ ውስጥ ምንም መረጃ አልተገኘም።' : 'No rows found in Excel sheet.');
          return;
        }

        if (activeTab === 'CATEGORIES') {
          let newCount = 0;
          let updateCount = 0;
          const updatedCategories = [...categories];

          data.forEach((row, idx) => {
            const rowName = (row.Name || row['Category Name'] || '').toString().trim();
            if (!rowName) return;

            const existingIdx = updatedCategories.findIndex(
              (c) => c.name.toLowerCase() === rowName.toLowerCase()
            );

            const catItem: Category = {
              id: existingIdx >= 0 ? updatedCategories[existingIdx].id : `cat-import-${Date.now()}-${idx}`,
              tenantId: currentTenantId,
              name: rowName,
              description: row.Description || '',
              isMedicine: (row.Is_Medicine || row['Is Medicine'] || 'YES').toString().toUpperCase() === 'YES',
              trackBatch: (row.Track_Batch || row['Track Batch'] || 'YES').toString().toUpperCase() === 'YES',
              trackExpiry: (row.Track_Expiry || row['Track Expiry'] || 'YES').toString().toUpperCase() === 'YES',
            };

            if (existingIdx >= 0) {
              updatedCategories[existingIdx] = catItem;
              updateCount++;
            } else {
              updatedCategories.push(catItem);
              newCount++;
            }
          });

          setDryRunData({
            tab: 'CATEGORIES',
            tabLabel: isAm ? 'የመድሃኒት ምድቦች' : 'Categories',
            totalRows: data.length,
            newCount,
            updateCount,
            itemsToCommit: updatedCategories,
            applyImport: () => {
              setCategories(updatedCategories);
              setImportStatus(
                isAm
                  ? `${newCount} አዲስ ምድቦች ተጨመሩ፣ ${updateCount} ተሻሽለዋል!`
                  : `Successfully upserted: ${newCount} created, ${updateCount} updated!`
              );
              setDryRunData(null);
            },
          });
        } else if (activeTab === 'GENERICS') {
          let newCount = 0;
          let updateCount = 0;
          const updatedGenerics = [...generics];

          data.forEach((row, idx) => {
            const rowName = (row.Generic_Name || row['Generic Name'] || row.Name || '').toString().trim();
            if (!rowName) return;

            const existingIdx = updatedGenerics.findIndex(
              (g) => g.name.toLowerCase() === rowName.toLowerCase()
            );

            const genItem: Generic = {
              id: existingIdx >= 0 ? updatedGenerics[existingIdx].id : `gen-import-${Date.now()}-${idx}`,
              tenantId: currentTenantId,
              name: rowName,
              therapeuticClass: row.Therapeutic_Class || row['Therapeutic Class'] || '',
              pregnancyCategory: (row.Pregnancy_Category || 'B') as any,
              description: row.Description || '',
            };

            if (existingIdx >= 0) {
              updatedGenerics[existingIdx] = genItem;
              updateCount++;
            } else {
              updatedGenerics.push(genItem);
              newCount++;
            }
          });

          setDryRunData({
            tab: 'GENERICS',
            tabLabel: isAm ? 'ጄኔሪክ ንጥረ ነገሮች' : 'Generics',
            totalRows: data.length,
            newCount,
            updateCount,
            itemsToCommit: updatedGenerics,
            applyImport: () => {
              setGenerics(updatedGenerics);
              setImportStatus(
                isAm
                  ? `${newCount} አዲስ ጄኔሪኮች ተጨመሩ፣ ${updateCount} ተሻሽለዋል!`
                  : `Successfully upserted: ${newCount} created, ${updateCount} updated!`
              );
              setDryRunData(null);
            },
          });
        } else if (activeTab === 'MANUFACTURERS') {
          let newCount = 0;
          let updateCount = 0;
          const updatedMfrs = [...manufacturers];

          data.forEach((row, idx) => {
            const rowName = (row.Name || row.Manufacturer_Name || row['Manufacturer Name'] || '').toString().trim();
            if (!rowName) return;

            const existingIdx = updatedMfrs.findIndex(
              (m) => m.name.toLowerCase() === rowName.toLowerCase()
            );

            const mfrItem: Manufacturer = {
              id: existingIdx >= 0 ? updatedMfrs[existingIdx].id : `mfr-import-${Date.now()}-${idx}`,
              tenantId: currentTenantId,
              name: rowName,
              country: row.Country || 'Ethiopia',
              address: row.Address || '',
              contact: row.Contact || '',
            };

            if (existingIdx >= 0) {
              updatedMfrs[existingIdx] = mfrItem;
              updateCount++;
            } else {
              updatedMfrs.push(mfrItem);
              newCount++;
            }
          });

          setDryRunData({
            tab: 'MANUFACTURERS',
            tabLabel: isAm ? 'አምራቾች' : 'Manufacturers',
            totalRows: data.length,
            newCount,
            updateCount,
            itemsToCommit: updatedMfrs,
            applyImport: () => {
              setManufacturers(updatedMfrs);
              setImportStatus(
                isAm
                  ? `${newCount} አዲስ አምራቾች ተጨመሩ፣ ${updateCount} ተሻሽለዋል!`
                  : `Successfully upserted: ${newCount} created, ${updateCount} updated!`
              );
              setDryRunData(null);
            },
          });
        } else if (activeTab === 'SUPPLIERS') {
          let newCount = 0;
          let updateCount = 0;
          const updatedSuppliers = [...suppliers];

          data.forEach((row, idx) => {
            const rowName = (row.Name || row.Supplier_Name || '').toString().trim();
            const rowTin = (row.TIN_Number || row.TIN || '').toString().trim();
            if (!rowName && !rowTin) return;

            const existingIdx = updatedSuppliers.findIndex(
              (s) =>
                (rowTin && s.tinNumber && s.tinNumber === rowTin) ||
                (rowName && s.name.toLowerCase() === rowName.toLowerCase())
            );

            const supItem: Supplier = {
              id: existingIdx >= 0 ? updatedSuppliers[existingIdx].id : `sup-import-${Date.now()}-${idx}`,
              tenantId: currentTenantId,
              name: rowName || `Supplier ${idx + 1}`,
              tinNumber: rowTin || undefined,
              phone: row.Phone || '+251 911 000 000',
              email: row.Email || '',
              balanceDue: Number(row.Balance_Due) || 0,
            };

            if (existingIdx >= 0) {
              updatedSuppliers[existingIdx] = supItem;
              updateCount++;
            } else {
              updatedSuppliers.push(supItem);
              newCount++;
            }
          });

          setDryRunData({
            tab: 'SUPPLIERS',
            tabLabel: isAm ? 'አቅራቢዎች' : 'Suppliers',
            totalRows: data.length,
            newCount,
            updateCount,
            itemsToCommit: updatedSuppliers,
            applyImport: () => {
              setSuppliers(updatedSuppliers);
              setImportStatus(
                isAm
                  ? `${newCount} አዲስ አቅራቢዎች ተጨመሩ፣ ${updateCount} ተሻሽለዋል!`
                  : `Successfully upserted: ${newCount} created, ${updateCount} updated!`
              );
              setDryRunData(null);
            },
          });
        } else {
          // UNITS
          let newCount = 0;
          let updateCount = 0;
          const updatedUnits = [...units];

          data.forEach((row, idx) => {
            const rowName = (row.Name || row.Unit_Name || '').toString().trim();
            const rowAbbr = (row.Abbreviation || row.Abbr || '').toString().trim();
            if (!rowName && !rowAbbr) return;

            const existingIdx = updatedUnits.findIndex(
              (u) =>
                (rowName && u.name.toLowerCase() === rowName.toLowerCase()) ||
                (rowAbbr && u.abbreviation.toLowerCase() === rowAbbr.toLowerCase())
            );

            const unitItem: Unit = {
              id: existingIdx >= 0 ? updatedUnits[existingIdx].id : `unit-import-${Date.now()}-${idx}`,
              tenantId: currentTenantId,
              name: rowName || rowAbbr,
              abbreviation: rowAbbr || rowName,
              isBase: (row.Is_Base_Unit || row.Is_Base || 'NO').toString().toUpperCase() === 'YES',
            };

            if (existingIdx >= 0) {
              updatedUnits[existingIdx] = unitItem;
              updateCount++;
            } else {
              updatedUnits.push(unitItem);
              newCount++;
            }
          });

          setDryRunData({
            tab: 'UNITS',
            tabLabel: isAm ? 'የመለኪያ አሃዶች' : 'Units',
            totalRows: data.length,
            newCount,
            updateCount,
            itemsToCommit: updatedUnits,
            applyImport: () => {
              setUnits(updatedUnits);
              setImportStatus(
                isAm
                  ? `${newCount} አዲስ አሃዶች ተጨመሩ፣ ${updateCount} ተሻሽለዋል!`
                  : `Successfully upserted: ${newCount} created, ${updateCount} updated!`
              );
              setDryRunData(null);
            },
          });
        }
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
        name: catName.trim(),
        description: catDesc.trim(),
        isMedicine: catIsMedicine,
        trackBatch: catTrackBatch,
        trackExpiry: catTrackExpiry,
      },
    ]);
    setCatName('');
    setCatDesc('');
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatDesc(cat.description || '');
    setEditCatIsMedicine(cat.isMedicine);
    setEditCatTrackBatch(cat.trackBatch);
    setEditCatTrackExpiry(cat.trackExpiry);
  };

  const handleSaveEditCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCatName.trim()) return;

    setCategories((prev) =>
      prev.map((c) =>
        c.id === editingCategory.id
          ? {
              ...c,
              name: editCatName.trim(),
              description: editCatDesc.trim(),
              isMedicine: editCatIsMedicine,
              trackBatch: editCatTrackBatch,
              trackExpiry: editCatTrackExpiry,
            }
          : c
      )
    );
    setEditingCategory(null);
  };

  const handleDeleteCategory = (catId: string, catNameStr: string) => {
    if (confirm(isAm ? `"${catNameStr}" የሚለውን ምድብ መሰረዝ እርግጠኛ ነዎት?` : `Are you sure you want to delete category "${catNameStr}"?`)) {
      setCategories((prev) => prev.filter((c) => c.id !== catId));
    }
  };

  const handleAddGeneric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genName.trim()) return;
    setGenerics((prev) => [
      ...prev,
      {
        id: `gen-${Date.now()}`,
        tenantId: currentTenantId,
        name: genName.trim(),
        therapeuticClass: genClass.trim(),
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
                {isAm
                  ? `የፋርማሲ ውቅር ባለቤትነት፡ ${currentTenant?.name || 'አክቲቭ ፋርማሲ'}`
                  : `Pharmacy Configuration Scope: ${currentTenant?.name || 'Active Pharmacy'}`}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Tenant ID: {currentTenantId}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {isAm
                ? 'ሁሉም የመድሃኒት ምድቦች፣ ጄኔሪኮች፣ አሃዶችና አቅራቢዎች በፋርማሲ ተቋም ደረጃ ተከፋፍለው ይተዳደራሉ።'
                : 'All inventory configurations (medicine categories, generic active ingredients, units, and suppliers) are strictly isolated with company ownership.'}
            </p>
          </div>
        </div>

        {/* Company Filter Selector */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
          <span className="text-slate-300 font-semibold flex items-center gap-1 pl-1">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isAm ? 'ውቅር አሳይ ለ፡' : 'Filter Configuration For:'}</span>
          </span>
          <select
            value={selectedTenantScope}
            onChange={(e) => setSelectedTenantScope(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-900 text-white font-bold text-xs focus:outline-emerald-500 cursor-pointer"
          >
            <option value="CURRENT">
              {isAm ? 'የአሁኑ ፋርማሲ' : 'Current Shop'} ({currentTenant?.name || currentTenantId})
            </option>
            <option value="ALL">
              {isAm ? 'ሁሉም የተመዘገቡ ፋርማሲዎች (SaaS View)' : 'All Registered Pharmacies (SaaS View)'}
            </option>
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
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs flex-wrap">
          <button
            onClick={() => setActiveTab('CATEGORIES')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'CATEGORIES'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAm ? 'ምድቦች ከባህሪያት ጋር' : 'Categories with Flags'} ({categories.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('GENERICS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'GENERICS'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAm ? 'ጄኔሪክ ንጥረ ነገሮች' : 'INN Generics'} ({generics.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('MANUFACTURERS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'MANUFACTURERS'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Factory className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAm ? 'አምራቾች' : 'Manufacturers'} ({manufacturers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('SUPPLIERS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'SUPPLIERS'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAm ? 'አቅራቢዎች' : 'Suppliers'} ({suppliers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('UNITS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'UNITS'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Ruler className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAm ? 'የመለኪያ አሃዶች' : 'Packaging Units'} ({units.length})</span>
          </button>
        </div>

        {/* Excel Import / Export Round-Trip Controls */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors"
            title="Import Excel sheet with automatic natural-key upsert and dry-run preview"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAm ? 'ኤክሴል አስገባ' : 'Import Excel'}</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
            title="Export master table to XLSX"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isAm ? 'ኤክሴል አውርድ' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      {/* Import Notification Banner */}
      {importStatus && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importStatus}</span>
          </div>
          <button onClick={() => setImportStatus(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">✕</button>
        </div>
      )}

      {/* ==================================================== */}
      {/* DRY RUN PREVIEW MODAL */}
      {/* ==================================================== */}
      {dryRunData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  {isAm ? 'የኤክሴል ማስገቢያ ቅድመ-ዕይታ (Dry-Run Preview)' : 'Excel Import Dry-Run Analysis'}
                </h3>
              </div>
              <button onClick={() => setDryRunData(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-900 space-y-1">
                <div className="font-bold text-sm">
                  {dryRunData.tabLabel} ({dryRunData.totalRows} {isAm ? 'ረድፎች ተገኝተዋል' : 'Rows Found in Sheet'})
                </div>
                <p className="text-[11px] text-emerald-800">
                  {isAm
                    ? 'ሲስተሙ የተፈጥሮ መለያ ቁልፍን (Natural Key) ተጠቅሞ ተመሳሳይ መረጃ እንዳይደገም (Deduplication) ያረጋግጣል።'
                    : 'Natural-key matching detected the following proposed upsert breakdown:'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-100/70 border border-emerald-300 p-3 rounded-xl text-center">
                  <span className="text-[11px] text-emerald-800 font-semibold block">
                    {isAm ? 'አዲስ የሚጨመሩ' : 'New Records to Create'}
                  </span>
                  <span className="text-2xl font-black text-emerald-950 mt-1 block">
                    +{dryRunData.newCount}
                  </span>
                </div>
                <div className="bg-sky-100/70 border border-sky-300 p-3 rounded-xl text-center">
                  <span className="text-[11px] text-sky-800 font-semibold block">
                    {isAm ? 'የሚሻሻሉ / ድግግሞሽ የተወገደላቸው' : 'Existing to Update / Dedupe'}
                  </span>
                  <span className="text-2xl font-black text-sky-950 mt-1 block">
                    {dryRunData.updateCount}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDryRunData(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  {isAm ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={dryRunData.applyImport}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isAm ? 'ማስገባቱን አረጋግጥ (Confirm Upsert)' : 'Confirm Import & Apply Upsert'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* CATEGORIES TAB (WITH DRIVEN FLAGS) */}
      {/* ==================================================== */}
      {activeTab === 'CATEGORIES' && (
        <div className="space-y-4">
          {/* Regulatory Architecture Clarification Banner */}
          <div className="bg-sky-50 border border-sky-200 text-sky-950 p-3.5 rounded-xl text-xs flex items-start gap-2.5 shadow-2xs">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">
                {isAm ? 'የEFDA ህጋዊ መመሪያ ማስታወሻ፡' : 'EFDA Regulatory Architecture Notice:'}
              </strong>{' '}
              {isAm
                ? 'በኢትዮጵያ ፋርማሲ አሰራር መመሪያ መሰረት፣ የሃኪም ማዘዣ ግዴታ (Rx-Only)፣ ቁጥጥር የሚደረግባቸው መድሃኒቶች (Controlled Narcotic/Psychotropic) እና የተጨማሪ እሴት ታክስ ነፃ መሆን (VAT Exemption) በእያንዳንዱ መድሃኒት/እቃ ፕሮፋይል ላይ ይወሰናሉ። የምድብ (Category) ባህሪያት ደግሞ የባች ቁጥር (Batch Tracking)፣ የሚያበቃበት ቀን (Expiry Tracking) እና መድሃኒት ወይም አጠቃላይ እቃ መሆኑን (Is Medicine) ብቻ ይወስናሉ።'
                : 'In Ethiopian pharmaceutical practice and EFDA compliance, Rx-Only, Controlled Substance Schedule (Narcotic/Psychotropic), and VAT exemption rates are specified on the individual Medicine/Product profile, whereas Category governs pharmaceutical classification, mandatory batch tracking, and expiration enforcement.'}
            </div>
          </div>

          {/* Quick Create Category Card with Behavior Flags */}
          <form
            onSubmit={handleAddCategory}
            className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isAm ? 'አዲስ ምድብ ከባህሪያት ጋር ጨምር' : 'Add Category with Behavior Flags'}</span>
              </span>
              <span className="text-[11px] text-slate-500">
                {isAm ? 'ባህሪያቱ በGRN፣ POS እና የማለቂያ ቀን ህጎች ላይ አሰራሩን ይቆጣጠራሉ' : 'Flags drive automated validation in GRN, POS, and inventory expiration rules'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs items-end">
              <div className="md:col-span-2">
                <label className="font-semibold text-slate-700 mb-1 block">
                  {isAm ? 'የምድቡ ስም *' : 'Category Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAm ? 'ለምሳሌ፡ የዓይን ጠብታዎች፣ የህፃናት ወተት...' : 'e.g. Ophthalmic Drops, Baby Milk Formula...'}
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">
                  {isAm ? 'የእቃው አይነት' : 'Product Type Flag'}
                </label>
                <label className="flex items-center gap-2 py-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={catIsMedicine}
                    onChange={(e) => setCatIsMedicine(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-medium text-slate-800">
                    {isAm ? 'መድሃኒት ነው (Is Medicine)' : 'Is Medicine'}
                  </span>
                </label>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">
                  {isAm ? 'የባች ቁጥር ግዴታ' : 'Batch Requirement'}
                </label>
                <label className="flex items-center gap-2 py-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={catTrackBatch}
                    onChange={(e) => setCatTrackBatch(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-medium text-slate-800">
                    {isAm ? 'ባች ይከታተል (Track Batch)' : 'Track Batch'}
                  </span>
                </label>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">
                  {isAm ? 'የማለቂያ ቀን ግዴታ' : 'Expiry Requirement'}
                </label>
                <label className="flex items-center gap-2 py-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={catTrackExpiry}
                    onChange={(e) => setCatTrackExpiry(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-medium text-slate-800">
                    {isAm ? 'ማለቂያ ቀን ይከታተል (Track Expiry)' : 'Track Expiry'}
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 text-[11px]">
                {isAm ? 'የህግ ቅድመ-ዕይታ፡ ' : 'Rule Preview: '}
                {catIsMedicine
                  ? (isAm ? 'የEFDA የቁጥጥር መስፈርት የሚተገበርበት መድሃኒት።' : 'Pharmaceutical item requiring EFDA compliance.')
                  : catTrackExpiry
                  ? (isAm ? 'አጠቃላይ እቃ ሆኖ ባችና የሚያበቃበት ቀን የሚፈለግበት (ለምሳሌ የህፃናት ወተት)።' : 'General goods (e.g. Baby Milk Formula/Cosmetics) requiring batch and expiration.')
                  : (isAm ? 'የሚያበቃበት ቀንና ባች የማይፈለግበት እቃ (ለምሳሌ ዳይፐር)።' : 'Disposable goods (e.g. Diapers) exempt from batch/expiry.')}
              </span>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold cursor-pointer"
              >
                {isAm ? 'ምድብ አስቀምጥ' : 'Save Category'}
              </button>
            </div>
          </form>

          {/* Edit Category Modal */}
          {editingCategory && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-sm">
                      {isAm ? 'ምድብ አድስ' : 'Edit Category'}
                    </h3>
                  </div>
                  <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
                </div>

                <form onSubmit={handleSaveEditCategory} className="p-5 space-y-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 mb-1 block">
                      {isAm ? 'የምድቡ ስም *' : 'Category Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 mb-1 block">
                      {isAm ? 'መግለጫ' : 'Description'}
                    </label>
                    <input
                      type="text"
                      value={editCatDesc}
                      onChange={(e) => setEditCatDesc(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editCatIsMedicine}
                        onChange={(e) => setEditCatIsMedicine(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span className="font-medium text-slate-800">
                        {isAm ? 'መድሃኒት ነው' : 'Is Medicine'}
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editCatTrackBatch}
                        onChange={(e) => setEditCatTrackBatch(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span className="font-medium text-slate-800">
                        {isAm ? 'ባች ይከታተል' : 'Track Batch'}
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editCatTrackExpiry}
                        onChange={(e) => setEditCatTrackExpiry(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span className="font-medium text-slate-800">
                        {isAm ? 'ማለቂያ ቀን' : 'Track Expiry'}
                      </span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingCategory(null)}
                      className="px-3 py-1.5 text-slate-600 hover:text-slate-800 cursor-pointer"
                    >
                      {isAm ? 'ሰርዝ' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold cursor-pointer"
                    >
                      {isAm ? 'አስቀምጥ' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Categories Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
                <tr>
                  <th className="px-4 py-3">{isAm ? 'የምድብ ስም' : 'Category Name'}</th>
                  <th className="px-4 py-3">{isAm ? 'ባለቤት ፋርማሲ' : 'Pharmacy Owner'}</th>
                  <th className="px-4 py-3">{isAm ? 'መግለጫ' : 'Description'}</th>
                  <th className="px-4 py-3 text-center">{isAm ? 'መድሃኒት ነው' : 'Is Medicine Flag'}</th>
                  <th className="px-4 py-3 text-center">{isAm ? 'ባች ግዴታ' : 'Track Batch Flag'}</th>
                  <th className="px-4 py-3 text-center">{isAm ? 'ማለቂያ ቀን ግዴታ' : 'Track Expiry Flag'}</th>
                  <th className="px-4 py-3">{isAm ? 'የአሰራር ባህሪ' : 'Enforcement Behavior'}</th>
                  <th className="px-4 py-3 text-center">{isAm ? 'ተግባራት' : 'Actions'}</th>
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
                          {c.isMedicine ? (isAm ? 'አዎ (መድሃኒት)' : 'Yes (Medicine)') : (isAm ? 'አይደለም (አጠቃላይ)' : 'No (General)')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                            c.trackBatch ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {c.trackBatch ? (isAm ? 'ግዴታ' : 'Required') : (isAm ? 'አማራጭ' : 'Optional')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                            c.trackExpiry ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {c.trackExpiry ? (isAm ? 'ግዴታ' : 'Mandatory') : (isAm ? 'ነፃ' : 'Exempt')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600">
                        {c.isMedicine
                          ? (isAm ? 'የEFDA የታዘዘ መድሃኒት ቁጥጥር' : 'EFDA scheduled medicine dispensing')
                          : c.trackExpiry
                          ? (isAm ? 'በGRN ላይ ባችና ቀን ያስገድዳል (ለምሳሌ የህፃናት ወተት)' : 'Enforces batch + expiry on GRN (e.g. Baby Milk)')
                          : (isAm ? 'ያለ ባችና ቀን ይፈቅዳል (ለምሳሌ ዳይፐር)' : 'Permits blank expiry/batch (e.g. Diapers)')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleStartEditCategory(c)}
                            className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded cursor-pointer"
                            title={isAm ? 'ምድብ አድስ' : 'Edit category'}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(c.id, c.name)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title={isAm ? 'ምድብ ሰርዝ' : 'Delete category'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
              <span>{isAm ? 'አዲስ ጄኔሪክ ንጥረ ነገር መዝግብ' : 'Add INN Master Generic'}</span>
            </span>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs items-end">
              <div className="md:col-span-2">
                <label className="font-semibold text-slate-700 mb-1 block">
                  {isAm ? 'የጄኔሪክ ስም (INN Name) *' : 'INN Generic Name *'}
                </label>
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
                <label className="font-semibold text-slate-700 mb-1 block">
                  {isAm ? 'ቴራፒዩቲክ ምድብ' : 'Therapeutic Class'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cephalosporin Antibiotic"
                  value={genClass}
                  onChange={(e) => setGenClass(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">
                  {isAm ? 'የእርግዝና ደህንነት ደረጃ' : 'Pregnancy Risk Category'}
                </label>
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
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs cursor-pointer"
              >
                {isAm ? 'አስቀምጥ' : 'Save Generic'}
              </button>
            </div>
          </form>

          {/* Generics Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-semibold">
                <tr>
                  <th className="px-4 py-3">{isAm ? 'የጄኔሪክ ስም' : 'INN Generic Substance'}</th>
                  <th className="px-4 py-3">{isAm ? 'ቴራፒዩቲክ ምድብ' : 'Therapeutic Class'}</th>
                  <th className="px-4 py-3 text-center">{isAm ? 'የእርግዝና ደህንነት' : 'Pregnancy Safety'}</th>
                  <th className="px-4 py-3">{isAm ? 'መግለጫ' : 'EFDA Description'}</th>
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
                <th className="px-4 py-3">{isAm ? 'የአምራች ስም' : 'Manufacturer Name'}</th>
                <th className="px-4 py-3">{isAm ? 'ሀገር' : 'Country of Origin'}</th>
                <th className="px-4 py-3">{isAm ? 'አድራሻ' : 'Factory Address'}</th>
                <th className="px-4 py-3">{isAm ? 'ግንኙነት' : 'Contact'}</th>
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
                <th className="px-4 py-3">{isAm ? 'የአቅራቢ ስም' : 'Supplier Name'}</th>
                <th className="px-4 py-3">{isAm ? 'የግብር ቁጥር (TIN)' : 'TIN Number'}</th>
                <th className="px-4 py-3">{isAm ? 'ተጠሪ ሰው' : 'Contact Person'}</th>
                <th className="px-4 py-3">{isAm ? 'ስልክ' : 'Phone'}</th>
                <th className="px-4 py-3 text-right">{isAm ? 'ያልተከፈለ ዕዳ' : 'Outstanding Payables'}</th>
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
                <th className="px-4 py-3">{isAm ? 'የአሃድ ስም' : 'Unit Name'}</th>
                <th className="px-4 py-3">{isAm ? 'አህጽሮት' : 'Abbreviation'}</th>
                <th className="px-4 py-3 text-center">{isAm ? 'ቤዝ አሃድ ነው' : 'Is Base Unit'}</th>
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
                      {u.isBase ? (isAm ? 'የመሸጫ ቤዝ አሃድ' : 'Base Dispensing Unit') : (isAm ? 'የማሸጊያ ብዜት' : 'Packaging Multiplier')}
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
