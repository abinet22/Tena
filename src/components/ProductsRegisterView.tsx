import React, { useState } from 'react';
import {
  Pill, Package, Search, Filter, Plus, ShieldAlert,
  FileSpreadsheet, Lock, AlertTriangle, CheckCircle, Tag
} from 'lucide-react';
import { Product, Category, Generic, Manufacturer, RoleCode, Tenant } from '../types/pharmacy';
import { sanitizePriceForRole } from '../utils/stockEngine';
import { translations } from '../utils/translations';
import { Building2 } from 'lucide-react';

interface ProductsRegisterViewProps {
  products: Product[];
  categories: Category[];
  generics: Generic[];
  manufacturers: Manufacturer[];
  currentRole: RoleCode;
  onOpenAddModal: () => void;
  onEditProduct: (p: Product) => void;
  language: 'en' | 'am';
  currentTenant?: Tenant;
  tenants?: Tenant[];
}

export const ProductsRegisterView: React.FC<ProductsRegisterViewProps> = ({
  products,
  categories,
  generics,
  manufacturers,
  currentRole,
  onOpenAddModal,
  onEditProduct,
  language,
  currentTenant,
  tenants = [],
}) => {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'MEDICINE' | 'GENERAL'>('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [onlyControlled, setOnlyControlled] = useState(false);

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
      const matchesGeneric = generic ? generic.name.toLowerCase().includes(q) : false;
      return matchesBrand || matchesBarcode || matchesGeneric;
    }

    return true;
  });

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

      {/* Privacy Notice Banner for Cashier */}
      {isCashier && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-xl flex items-center gap-3 text-xs shadow-2xs">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <div>
            <span className="font-bold">Role-Based Access Control Notice: </span>
            <span>{t.costHiddenNotice}</span>
          </div>
        </div>
      )}

      {/* Top Controls & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={language === 'am' ? 'በመድሃኒት ስም፣ በሳይንሳዊ ስም ወይም በባርኮድ ፈልግ...' : 'Search by brand name, INN generic, or barcode...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        {/* Filter by Type */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-3 py-1 rounded-md font-semibold transition-all ${
              selectedType === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Items ({products.length})
          </button>
          <button
            onClick={() => setSelectedType('MEDICINE')}
            className={`px-3 py-1 rounded-md font-semibold transition-all ${
              selectedType === 'MEDICINE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Medicines ({products.filter((p) => p.productType === 'MEDICINE').length})
          </button>
          <button
            onClick={() => setSelectedType('GENERAL')}
            className={`px-3 py-1 rounded-md font-semibold transition-all ${
              selectedType === 'GENERAL'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            General Goods ({products.filter((p) => p.productType === 'GENERAL').length})
          </button>
        </div>

        {/* Category Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Controlled Drug Toggle */}
          <button
            onClick={() => setOnlyControlled(!onlyControlled)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              onlyControlled
                ? 'bg-rose-100 border-rose-300 text-rose-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            Controlled Only
          </button>

          {/* Add Product Button (Protected by RBAC) */}
          {canEditProducts && (
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'am' ? 'አዲስ እቃ መዝግብ' : 'Add Product'}</span>
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
                <th className="px-4 py-3">Product / Drug Details</th>
                <th className="px-4 py-3">Generic & Strength</th>
                <th className="px-4 py-3">Category & Flags</th>
                <th className="px-4 py-3">Unit Conversion Ratios</th>
                <th className="px-4 py-3">Manufacturer & Country</th>
                <th className="px-4 py-3 text-right">Selling Price</th>
                <th className="px-4 py-3 text-right">Cost Price</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No products found matching active filters.
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
                      {/* Product Name & Barcode */}
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
                            <div className="flex items-center gap-1 mt-1">
                              {prod.isControlled && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200">
                                  <ShieldAlert className="w-2.5 h-2.5" />
                                  Controlled
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
                        {gen ? (
                          <div>
                            <div className="font-semibold text-slate-800">{gen.name}</div>
                            <div className="text-slate-500 text-[11px]">
                              {prod.dosageForm} • {prod.strength || 'Standard'}
                            </div>
                            {gen.pregnancyCategory && (
                              <span className="text-[10px] text-slate-400">
                                Preg Cat: {gen.pregnancyCategory}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-500 italic text-[11px]">
                            {prod.variantSize || 'General product'}
                          </div>
                        )}
                      </td>

                      {/* Category & Driven Flags */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{cat?.name || 'Uncategorized'}</div>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                          <span className={`px-1 rounded ${cat?.trackBatch ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-400'}`}>
                            {cat?.trackBatch ? '✓ Batch' : '— No batch'}
                          </span>
                          <span className={`px-1 rounded ${cat?.trackExpiry ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-400'}`}>
                            {cat?.trackExpiry ? '✓ Expiry' : '— No expiry'}
                          </span>
                        </div>
                      </td>

                      {/* Unit Conversions */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-[11px] text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 inline-block">
                          {prod.tertiaryUnit ? (
                            <>
                              1 {prod.tertiaryUnit} = {prod.tertiaryRatio} {prod.baseUnit}s
                              {prod.secondaryUnit && (
                                <span className="text-slate-500 block text-[10px]">
                                  (1 {prod.secondaryUnit} = {prod.secondaryRatio} {prod.baseUnit}s)
                                </span>
                              )}
                            </>
                          ) : (
                            <span>Base: {prod.baseUnit}</span>
                          )}
                        </div>
                      </td>

                      {/* Manufacturer */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{mfr?.name || 'Generic'}</div>
                        <div className="text-slate-400 text-[11px]">
                          {prod.countryOfOrigin || mfr?.country || 'Ethiopia'}
                        </div>
                      </td>

                      {/* Selling Price */}
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {sampleSell.toFixed(2)} ETB
                        <span className="text-[10px] text-slate-400 block font-normal">
                          per {prod.baseUnit}
                        </span>
                      </td>

                      {/* Cost Price (Masked for Cashier) */}
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-semibold ${
                            isCashier
                              ? 'text-slate-400 font-mono italic text-[11px]'
                              : 'text-emerald-700'
                          }`}
                        >
                          {sanitizePriceForRole(sampleCost, currentRole)}
                        </span>
                        {!isCashier && (
                          <span className="text-[10px] text-slate-400 block">
                            Margin: {((1 - sampleCost / sampleSell) * 100).toFixed(0)}%
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        {canEditProducts ? (
                          <button
                            onClick={() => onEditProduct(prod)}
                            className="text-xs px-2.5 py-1 text-emerald-700 hover:text-emerald-800 font-semibold bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                          >
                            Edit
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Read only</span>
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
