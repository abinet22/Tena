import React, { useState, useRef } from 'react';
import {
  Pill, Package, Search, Filter, Plus, ShieldAlert,
  FileSpreadsheet, Lock, AlertTriangle, CheckCircle, Tag,
  Download, Upload, CheckCircle2, X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product, Category, Generic, Manufacturer, RoleCode, Tenant } from '../types/pharmacy';
import { sanitizePriceForRole } from '../utils/stockEngine';
import { translations } from '../utils/translations';
import { Building2 } from 'lucide-react';

interface ProductsRegisterViewProps {
  products: Product[];
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: Category[];
  generics: Generic[];
  manufacturers: Manufacturer[];
  currentRole: RoleCode;
  onOpenAddModal: () => void;
  onEditProduct: (p: Product) => void;
  language: 'en' | 'am';
  currentTenant?: Tenant;
  tenants?: Tenant[];
  currentTenantId?: string;
}

interface ProductDryRunPreview {
  totalRows: number;
  newCount: number;
  updateCount: number;
  updatedProductsList: Product[];
}

export const ProductsRegisterView: React.FC<ProductsRegisterViewProps> = ({
  products,
  setProducts,
  categories,
  generics,
  manufacturers,
  currentRole,
  onOpenAddModal,
  onEditProduct,
  language,
  currentTenant,
  tenants = [],
  currentTenantId = 't-abyssinia',
}) => {
  const t = translations[language];
  const isAm = language === 'am';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'MEDICINE' | 'GENERAL'>('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [onlyControlled, setOnlyControlled] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [dryRunPreview, setDryRunPreview] = useState<ProductDryRunPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEditProducts = currentRole === 'ADMIN' || currentRole === 'INVENTORY_MANAGER';
  const isCashier = currentRole === 'CASHIER_PHARMACIST';

  // Filter products
  const filteredProducts = products.filter((prod) => {
    // Type filter
    if (selectedType !== 'ALL' && prod.productType !== selectedType) return false;

    // Category filter
    if (selectedCategoryId !== 'ALL' && prod.categoryId !== selectedCategoryId) return false;

    // Controlled filter
    if (onlyControlled && !prod.isControlled) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const generic = generics.find((g) => g.id === prod.genericId);
      const matchesBrand = prod.brandName.toLowerCase().includes(q);
      const matchesBarcode = prod.barcode ? prod.barcode.toLowerCase().includes(q) : false;
      const matchesEfda = prod.efdaRegistrationNo ? prod.efdaRegistrationNo.toLowerCase().includes(q) : false;
      const matchesGeneric = generic ? generic.name.toLowerCase().includes(q) : false;
      return matchesBrand || matchesBarcode || matchesGeneric || matchesEfda;
    }

    return true;
  });

  // ------------------------------------------------------------------
  // Export Products to Excel
  // ------------------------------------------------------------------
  const handleExportProductsExcel = () => {
    const wb = XLSX.utils.book_new();

    const data = products.map((p) => {
      const cat = categories.find((c) => c.id === p.categoryId);
      const gen = generics.find((g) => g.id === p.genericId);
      const mfr = manufacturers.find((m) => m.id === p.manufacturerId);

      return {
        Brand_Name: p.brandName,
        Barcode: p.barcode || '',
        EFDA_Registration_No: p.efdaRegistrationNo || '',
        Product_Type: p.productType,
        Generic_Name: gen?.name || '',
        Category_Name: cat?.name || '',
        Manufacturer_Name: mfr?.name || '',
        Dosage_Form: p.dosageForm || '',
        Strength: p.strength || '',
        Pack_Size: p.packSize || '',
        Base_Unit: p.baseUnit,
        Secondary_Unit: p.secondaryUnit || '',
        Secondary_Ratio: p.secondaryRatio || '',
        Tertiary_Unit: p.tertiaryUnit || '',
        Tertiary_Ratio: p.tertiaryRatio || '',
        Standard_Selling_Price: p.standardSellingPrice || 0,
        Prescription_Required: p.prescriptionRequired ? 'YES' : 'NO',
        Is_Controlled: p.isControlled ? 'YES' : 'NO',
        Is_VAT_Exempt: p.isVatExempt ? 'YES' : 'NO',
        Country_Of_Origin: p.countryOfOrigin || 'Ethiopia',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, `TenaPharm_Products_Catalog_${Date.now()}.xlsx`);
  };

  // ------------------------------------------------------------------
  // Import Products from Excel with Natural-Key Upsert & Dry-Run Preview
  // ------------------------------------------------------------------
  const handleImportProductsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setImportStatus(isAm ? 'በፋይሉ ውስጥ ምንም እቃዎች አልተገኙም።' : 'No rows found in Excel sheet.');
          return;
        }

        let newCount = 0;
        let updateCount = 0;
        const updatedList = [...products];

        data.forEach((row, idx) => {
          const brandName = (row.Brand_Name || row['Brand Name'] || row.Name || '').toString().trim();
          if (!brandName) return;

          const barcode = (row.Barcode || '').toString().trim();
          const strength = (row.Strength || '').toString().trim();
          const efdaReg = (row.EFDA_Registration_No || row['EFDA Reg No'] || '').toString().trim();

          // Natural key: match on Barcode (if provided) OR (brandName + strength)
          const existingIdx = updatedList.findIndex((p) => {
            if (barcode && p.barcode && p.barcode.toLowerCase() === barcode.toLowerCase()) {
              return true;
            }
            return (
              p.brandName.toLowerCase() === brandName.toLowerCase() &&
              (!strength || !p.strength || p.strength.toLowerCase() === strength.toLowerCase())
            );
          });

          // Match or default Category
          const catName = (row.Category_Name || row.Category || '').toString().trim().toLowerCase();
          const matchedCat = categories.find((c) => c.name.toLowerCase() === catName) || categories[0];

          // Match or default Generic
          const genName = (row.Generic_Name || row.Generic || '').toString().trim().toLowerCase();
          const matchedGen = generics.find((g) => g.name.toLowerCase() === genName);

          // Match Manufacturer
          const mfrName = (row.Manufacturer_Name || row.Manufacturer || '').toString().trim().toLowerCase();
          const matchedMfr = manufacturers.find((m) => m.name.toLowerCase() === mfrName);

          const productType = (row.Product_Type || 'MEDICINE').toString().toUpperCase() === 'GENERAL' ? 'GENERAL' : 'MEDICINE';
          const secRatio = parseInt(row.Secondary_Ratio || row['Secondary Ratio']) || undefined;
          const tertRatio = parseInt(row.Tertiary_Ratio || row['Tertiary Ratio']) || undefined;

          const prodItem: Product = {
            id: existingIdx >= 0 ? updatedList[existingIdx].id : `prod-imported-${Date.now()}-${idx}`,
            tenantId: currentTenantId,
            productType,
            categoryId: matchedCat?.id || 'cat-antibiotics',
            brandName,
            barcode: barcode || undefined,
            efdaRegistrationNo: efdaReg || (existingIdx >= 0 ? updatedList[existingIdx].efdaRegistrationNo : undefined),
            genericId: matchedGen?.id || (existingIdx >= 0 ? updatedList[existingIdx].genericId : undefined),
            dosageForm: row.Dosage_Form || row['Dosage Form'] || 'Tablet',
            strength: strength || undefined,
            packSize: row.Pack_Size || row['Pack Size'] || undefined,
            baseUnit: row.Base_Unit || row['Base Unit'] || 'Tablet',
            secondaryUnit: row.Secondary_Unit || row['Secondary Unit'] || undefined,
            secondaryRatio: secRatio,
            tertiaryUnit: row.Tertiary_Unit || row['Tertiary Unit'] || undefined,
            tertiaryRatio: tertRatio,
            manufacturerId: matchedMfr?.id || undefined,
            countryOfOrigin: row.Country_Of_Origin || 'Ethiopia',
            standardSellingPrice: parseFloat(row.Standard_Selling_Price || row['Standard Selling Price']) || 10,
            prescriptionRequired: (row.Prescription_Required || 'YES').toString().toUpperCase() === 'YES',
            isControlled: (row.Is_Controlled || 'NO').toString().toUpperCase() === 'YES',
            isVatExempt: (row.Is_VAT_Exempt || 'YES').toString().toUpperCase() === 'YES',
            reorderLevel: 50,
            reorderQuantity: 200,
            isActive: true,
          };

          if (existingIdx >= 0) {
            updatedList[existingIdx] = prodItem;
            updateCount++;
          } else {
            updatedList.push(prodItem);
            newCount++;
          }
        });

        setDryRunPreview({
          totalRows: data.length,
          newCount,
          updateCount,
          updatedProductsList: updatedList,
        });
      } catch (err: any) {
        setImportStatus(`Error importing products Excel: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = () => {
    if (dryRunPreview && setProducts) {
      setProducts(dryRunPreview.updatedProductsList);
      setImportStatus(
        isAm
          ? `የመድሃኒቶች ካታሎግ ተሻሽሏል፡ ${dryRunPreview.newCount} አዲስ ተመዘገቡ፣ ${dryRunPreview.updateCount} ተሻሽለዋል!`
          : `Products successfully upserted: ${dryRunPreview.newCount} created, ${dryRunPreview.updateCount} updated!`
      );
      setDryRunPreview(null);
    }
  };

  return (
    <div className="space-y-4">
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
                <span className="text-[10px] text-slate-400">
                  TIN: {currentTenant.tinNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {language === 'am' ? 'የዚህ ፋርማሲ የመድሃኒቶችና እቃዎች ካታሎግ' : 'Formulary & Item Master Catalog configured for this pharmacy tenant'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-400">{currentTenant.city}, {currentTenant.subCity || 'Main'}</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-semibold">{filteredProducts.length} items registered</span>
          </div>
        </div>
      )}

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

      {/* Dry Run Preview Modal */}
      {dryRunPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  {isAm ? 'የመድሃኒቶች ማስገቢያ ቅድመ-ዕይታ' : 'Products Import Dry-Run Analysis'}
                </h3>
              </div>
              <button onClick={() => setDryRunPreview(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-900 space-y-1">
                <div className="font-bold text-sm">
                  {dryRunPreview.totalRows} {isAm ? 'ረድፎች በኤክሴል ተገኝተዋል' : 'Rows Analyzed from Sheet'}
                </div>
                <p className="text-[11px] text-emerald-800">
                  {isAm
                    ? 'ባርኮድ እና የመድሃኒት ስም በመጠቀም አዳዲስ እቃዎች ይጨመራሉ፤ ያሉ እቃዎች በድጋሚ ሳይፈጠሩ ይሻሻላሉ።'
                    : 'Natural-key matching by barcode and brand name will prevent duplicates and upsert records:'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-100/70 border border-emerald-300 p-3 rounded-xl text-center">
                  <span className="text-[11px] text-emerald-800 font-semibold block">
                    {isAm ? 'አዲስ የሚመዘገቡ' : 'New Products'}
                  </span>
                  <span className="text-2xl font-black text-emerald-950 mt-1 block">
                    +{dryRunPreview.newCount}
                  </span>
                </div>
                <div className="bg-sky-100/70 border border-sky-300 p-3 rounded-xl text-center">
                  <span className="text-[11px] text-sky-800 font-semibold block">
                    {isAm ? 'የሚሻሻሉ / Deduplicated' : 'Existing Updated'}
                  </span>
                  <span className="text-2xl font-black text-sky-950 mt-1 block">
                    {dryRunPreview.updateCount}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDryRunPreview(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  {isAm ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isAm ? 'ማስገባቱን አረጋግጥ' : 'Confirm & Apply Upsert'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAm ? 'በብራንድ፣ በባርኮድ፣ በEFDA ቁጥር ወይም በጄኔሪክ ፈልግ...' : 'Search brand name, barcode, EFDA reg no, generic active ingredient...'}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 font-semibold"
          >
            <option value="ALL">{isAm ? 'ሁሉም አይነቶች' : 'All Types'}</option>
            <option value="MEDICINE">{isAm ? 'መድሃኒት ብቻ' : 'Medicines Only'}</option>
            <option value="GENERAL">{isAm ? 'አጠቃላይ እቃዎች' : 'General Merchandise'}</option>
          </select>
        </div>

        {/* Right side Category & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter */}
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 font-semibold max-w-[180px] truncate"
          >
            <option value="ALL">{isAm ? 'ሁሉም ምድቦች' : 'All Categories'}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Controlled Drug Toggle */}
          <button
            onClick={() => setOnlyControlled(!onlyControlled)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              onlyControlled
                ? 'bg-rose-100 border-rose-300 text-rose-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>{isAm ? 'ቁጥጥር የሚደረግባቸው' : 'Controlled Only'}</span>
          </button>

          {/* Hidden Excel File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportProductsUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          {/* Excel Export Button */}
          <button
            onClick={handleExportProductsExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors"
            title="Export full catalog to Excel spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAm ? 'ኤክሴል አውርድ' : 'Export'}</span>
          </button>

          {/* Excel Import Button */}
          {canEditProducts && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors"
              title="Import products sheet with unit columns and dedupe"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isAm ? 'ኤክሴል አስገባ' : 'Import'}</span>
            </button>
          )}

          {/* Add Product Button (Protected by RBAC) */}
          {canEditProducts && (
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isAm ? 'አዲስ እቃ መዝግብ' : 'Add Product'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">{isAm ? 'የመድሃኒት / የእቃ መረጃ' : 'Product / Drug Details'}</th>
                <th className="px-4 py-3">{isAm ? 'ጄኔሪክና ጥንካሬ' : 'Generic & Strength'}</th>
                <th className="px-4 py-3">{isAm ? 'ምድብና ህጋዊ ባህሪያት' : 'Category & Flags'}</th>
                <th className="px-4 py-3">{isAm ? 'የማሸጊያ አሃዶች ንፅፅር' : 'Unit Conversion Ratios'}</th>
                <th className="px-4 py-3">{isAm ? 'አምራችና ሀገር' : 'Manufacturer & Country'}</th>
                <th className="px-4 py-3 text-right">{isAm ? 'የመሸጫ ዋጋ' : 'Selling Price'}</th>
                <th className="px-4 py-3 text-right">{isAm ? 'የግዢ ዋጋ' : 'Cost Price'}</th>
                <th className="px-4 py-3 text-center">{isAm ? 'ተግባራት' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    {isAm ? 'ምንም እቃዎች አልተገኙም።' : 'No products found matching active filters.'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const cat = categories.find((c) => c.id === prod.categoryId);
                  const gen = generics.find((g) => g.id === prod.genericId);
                  const mfr = manufacturers.find((m) => m.id === prod.manufacturerId);

                  // Sample representative selling & cost prices
                  const sampleCost = prod.productType === 'MEDICINE' ? 4.50 : 1100.00;
                  const sampleSell = prod.standardSellingPrice || (prod.productType === 'MEDICINE' ? 7.00 : 1350.00);

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Product Name, Barcode & EFDA Reg No */}
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          <div className={`mt-0.5 p-1.5 rounded-md shrink-0 ${
                            prod.productType === 'MEDICINE'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-teal-100 text-teal-700'
                          }`}>
                            {prod.productType === 'MEDICINE' ? (
                              <Pill className="w-3.5 h-3.5" />
                            ) : (
                              <Package className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{prod.brandName}</div>
                            {prod.barcode && (
                              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                                <Tag className="w-2.5 h-2.5" />
                                {prod.barcode}
                              </div>
                            )}
                            {prod.efdaRegistrationNo && (
                              <div className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-flex items-center gap-1 mt-0.5">
                                <span className="font-bold">EFDA Reg:</span>
                                <span>{prod.efdaRegistrationNo}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {prod.isControlled && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200">
                                  <ShieldAlert className="w-2.5 h-2.5" />
                                  {isAm ? 'ቁጥጥር' : 'Controlled'}
                                </span>
                              )}
                              {prod.prescriptionRequired && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Rx Only
                                </span>
                              )}
                              {prod.isVatExempt && (
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  VAT Exempt
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Generic & Strength */}
                      <td className="px-4 py-3">
                        {prod.productType === 'MEDICINE' ? (
                          <div>
                            <div className="font-bold text-slate-900">
                              {gen ? gen.name : 'Unspecified Generic'}
                            </div>
                            <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                              {prod.dosageForm} {prod.strength ? `• ${prod.strength}` : ''}
                            </div>
                            {prod.packSize && (
                              <div className="text-[10px] text-slate-400">Pack: {prod.packSize}</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-500">
                            <span>General Goods</span>
                            {prod.variantSize && (
                              <div className="font-medium text-slate-700">{prod.variantSize}</div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Category & Compliance Flags */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{cat?.name || 'Standard'}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 space-x-1">
                          {cat?.trackBatch && <span className="text-emerald-700 font-medium">● Batch</span>}
                          {cat?.trackExpiry && <span className="text-emerald-700 font-medium">● Expiry</span>}
                        </div>
                      </td>

                      {/* Packaging Unit Ratios */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-[11px] space-y-0.5">
                          <div className="font-bold text-slate-800">
                            Base: 1 {prod.baseUnit}
                          </div>
                          {prod.secondaryUnit && prod.secondaryRatio && (
                            <div className="text-slate-600">
                              1 {prod.secondaryUnit} = {prod.secondaryRatio} {prod.baseUnit}s
                            </div>
                          )}
                          {prod.tertiaryUnit && prod.tertiaryRatio && (
                            <div className="text-slate-600">
                              1 {prod.tertiaryUnit} = {prod.tertiaryRatio} {prod.baseUnit}s
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Manufacturer & Country */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{mfr?.name || 'Unspecified'}</div>
                        <div className="text-[11px] text-slate-500">
                          {prod.countryOfOrigin || mfr?.country || 'Ethiopia'}
                        </div>
                      </td>

                      {/* Standard Retail Price */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-bold text-slate-900">
                          {sampleSell.toFixed(2)} ETB
                        </span>
                        <div className="text-[10px] text-slate-400">per {prod.baseUnit}</div>
                      </td>

                      {/* Cost Price (Masked for Cashier) */}
                      <td className="px-4 py-3 text-right">
                        {isCashier ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Confidential</span>
                          </span>
                        ) : (
                          <span className="font-mono text-slate-600 font-medium">
                            {sanitizePriceForRole(sampleCost, currentRole)}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        {canEditProducts ? (
                          <button
                            onClick={() => onEditProduct(prod)}
                            className="px-2.5 py-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded text-xs font-semibold transition-colors cursor-pointer"
                          >
                            {isAm ? 'አድስ' : 'Edit'}
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px]">{isAm ? 'ተነባቢ' : 'View only'}</span>
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
    </div>
  );
};
