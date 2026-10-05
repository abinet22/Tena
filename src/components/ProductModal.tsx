import React, { useState, useEffect } from 'react';
import { X, Pill, Package, AlertCircle, Info, Sparkles, ShieldAlert } from 'lucide-react';
import {
  Product, ProductType, Category, Generic, Manufacturer, Unit, StorageCondition
} from '../types/pharmacy';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  onSave: (product: Partial<Product>) => void;
  categories: Category[];
  generics: Generic[];
  manufacturers: Manufacturer[];
  units: Unit[];
  language: 'en' | 'am';
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSave,
  categories,
  generics,
  manufacturers,
  units,
  language,
}) => {
  const [productType, setProductType] = useState<ProductType>('MEDICINE');
  const [categoryId, setCategoryId] = useState('');
  const [brandName, setBrandName] = useState('');
  const [barcode, setBarcode] = useState('');

  // Medicine fields
  const [genericId, setGenericId] = useState('');
  const [dosageForm, setDosageForm] = useState('Capsule');
  const [strength, setStrength] = useState('500mg');
  const [packSize, setPackSize] = useState('10 x 10');
  const [manufacturerId, setManufacturerId] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('Ethiopia');
  const [storageCondition, setStorageCondition] = useState<StorageCondition>('ROOM_TEMPERATURE');
  const [isControlled, setIsControlled] = useState(false);
  const [prescriptionRequired, setPrescriptionRequired] = useState(true);
  const [isVatExempt, setIsVatExempt] = useState(true);

  // Unit conversion
  const [baseUnit, setBaseUnit] = useState('Capsule');
  const [secondaryUnit, setSecondaryUnit] = useState('Strip');
  const [secondaryRatio, setSecondaryRatio] = useState<number>(10);
  const [tertiaryUnit, setTertiaryUnit] = useState('Box');
  const [tertiaryRatio, setTertiaryRatio] = useState<number>(100);

  // General fields
  const [variantSize, setVariantSize] = useState('');
  const [standardSellingPrice, setStandardSellingPrice] = useState<number>(1200);

  // Reorder
  const [reorderLevel, setReorderLevel] = useState<number>(100);
  const [reorderQuantity, setReorderQuantity] = useState<number>(500);

  // Populate form on edit
  useEffect(() => {
    if (productToEdit) {
      setProductType(productToEdit.productType);
      setCategoryId(productToEdit.categoryId);
      setBrandName(productToEdit.brandName);
      setBarcode(productToEdit.barcode || '');
      setGenericId(productToEdit.genericId || '');
      setDosageForm(productToEdit.dosageForm || 'Tablet');
      setStrength(productToEdit.strength || '');
      setPackSize(productToEdit.packSize || '');
      setManufacturerId(productToEdit.manufacturerId || '');
      setCountryOfOrigin(productToEdit.countryOfOrigin || 'Ethiopia');
      setStorageCondition(productToEdit.storageCondition || 'ROOM_TEMPERATURE');
      setIsControlled(!!productToEdit.isControlled);
      setPrescriptionRequired(productToEdit.prescriptionRequired ?? true);
      setIsVatExempt(productToEdit.isVatExempt ?? true);

      setBaseUnit(productToEdit.baseUnit || 'Tablet');
      setSecondaryUnit(productToEdit.secondaryUnit || 'Strip');
      setSecondaryRatio(productToEdit.secondaryRatio || 10);
      setTertiaryUnit(productToEdit.tertiaryUnit || 'Box');
      setTertiaryRatio(productToEdit.tertiaryRatio || 100);

      setVariantSize(productToEdit.variantSize || '');
      setStandardSellingPrice(productToEdit.standardSellingPrice || 0);
      setReorderLevel(productToEdit.reorderLevel || 50);
      setReorderQuantity(productToEdit.reorderQuantity || 200);
    } else {
      // Defaults
      setProductType('MEDICINE');
      if (categories.length > 0) setCategoryId(categories[0].id);
      if (generics.length > 0) setGenericId(generics[0].id);
      if (manufacturers.length > 0) setManufacturerId(manufacturers[0].id);
      setBrandName('');
      setBarcode('');
      setIsControlled(false);
      setPrescriptionRequired(true);
      setBaseUnit('Capsule');
      setSecondaryUnit('Strip');
      setSecondaryRatio(10);
      setTertiaryUnit('Box');
      setTertiaryRatio(100);
    }
  }, [productToEdit, isOpen, categories, generics, manufacturers]);

  if (!isOpen) return null;

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim() || !categoryId) return;

    onSave({
      productType,
      categoryId,
      brandName,
      barcode: barcode || undefined,
      genericId: productType === 'MEDICINE' ? genericId || undefined : undefined,
      dosageForm: productType === 'MEDICINE' ? dosageForm : undefined,
      strength: productType === 'MEDICINE' ? strength : undefined,
      packSize: productType === 'MEDICINE' ? packSize : undefined,
      manufacturerId: manufacturerId || undefined,
      countryOfOrigin,
      storageCondition,
      isControlled: productType === 'MEDICINE' ? isControlled : false,
      prescriptionRequired: productType === 'MEDICINE' ? prescriptionRequired : false,
      isVatExempt: productType === 'MEDICINE' ? isVatExempt : false,
      baseUnit,
      secondaryUnit: secondaryUnit || undefined,
      secondaryRatio: secondaryRatio ? Number(secondaryRatio) : undefined,
      tertiaryUnit: tertiaryUnit || undefined,
      tertiaryRatio: tertiaryRatio ? Number(tertiaryRatio) : undefined,
      variantSize: productType === 'GENERAL' ? variantSize : undefined,
      standardSellingPrice: productType === 'GENERAL' ? Number(standardSellingPrice) : undefined,
      reorderLevel: Number(reorderLevel) || 50,
      reorderQuantity: Number(reorderQuantity) || 200,
      isActive: true,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-700/60 flex items-center justify-center">
              {productType === 'MEDICINE' ? <Pill className="w-5 h-5 text-white" /> : <Package className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-base font-bold">
                {productToEdit
                  ? (language === 'am' ? 'መድሃኒት / እቃ አድስ' : 'Edit Product')
                  : (language === 'am' ? 'አዲስ መድሃኒት ወይም አጠቃላይ እቃ መዝግብ' : 'Register New Medicine or General Item')}
              </h2>
              <p className="text-xs text-emerald-100">
                Ethiopian Food & Drug Authority (EFDA) compliant catalog definition
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Product Type Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setProductType('MEDICINE');
                setBaseUnit('Capsule');
              }}
              className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                productType === 'MEDICINE'
                  ? 'bg-white text-emerald-800 shadow-xs border border-emerald-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Pill className="w-4 h-4 text-emerald-600" />
              <span>Medicine (መድሃኒት)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setProductType('GENERAL');
                setBaseUnit('Can');
              }}
              className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                productType === 'GENERAL'
                  ? 'bg-white text-teal-800 shadow-xs border border-teal-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-4 h-4 text-teal-600" />
              <span>General Product (Baby Milk, Diapers, Cosmetics)</span>
            </button>
          </div>

          {/* Category selection and Flag Warning Notice */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 block">Category & Compliance Rules *</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                required
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  const cat = categories.find((c) => c.id === e.target.value);
                  if (cat) {
                    if (cat.isMedicine && productType !== 'MEDICINE') setProductType('MEDICINE');
                    if (!cat.isMedicine && productType === 'MEDICINE') setProductType('GENERAL');
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:ring-1 focus:ring-emerald-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.isMedicine ? '(Medicine)' : '(General)'}
                  </option>
                ))}
              </select>

              {/* Dynamic Category Flags Pill */}
              {selectedCategory && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center gap-3 text-[11px] text-slate-600">
                  <span className="font-medium text-slate-700">Category Flags:</span>
                  <span className={`px-1.5 py-0.5 rounded font-semibold ${selectedCategory.trackBatch ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                    {selectedCategory.trackBatch ? '✓ Batch Tracked' : '✗ No Batch'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded font-semibold ${selectedCategory.trackExpiry ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                    {selectedCategory.trackExpiry ? '✓ Expiry Tracked' : '✗ No Expiry'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Primary Name & Barcode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 mb-1 block">Brand / Trade Name *</label>
              <input
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Amoxil 500mg, Panadol Extra, Bebelac 1"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 mb-1 block">Barcode / GS1 GTIN</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or enter barcode (e.g. 8901234567890)"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Medicine Specific Section */}
          {productType === 'MEDICINE' ? (
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs pb-1 border-b border-emerald-200">
                <Pill className="w-4 h-4 text-emerald-600" />
                <span>Ethiopian Food & Drug Authority (EFDA) Medicine Profile</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">INN Generic Active Ingredient *</label>
                  <select
                    value={genericId}
                    onChange={(e) => setGenericId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    {generics.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.therapeuticClass || 'Generic'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Dosage Form</label>
                  <input
                    type="text"
                    value={dosageForm}
                    onChange={(e) => setDosageForm(e.target.value)}
                    placeholder="Capsule, Tablet, Syrup, Injection..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Strength</label>
                  <input
                    type="text"
                    value={strength}
                    onChange={(e) => setStrength(e.target.value)}
                    placeholder="500mg, 250mg/5ml..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Manufacturer</label>
                  <select
                    value={manufacturerId}
                    onChange={(e) => setManufacturerId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    {manufacturers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.country})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Country of Origin</label>
                  <input
                    type="text"
                    value={countryOfOrigin}
                    onChange={(e) => setCountryOfOrigin(e.target.value)}
                    placeholder="Ethiopia, India, UK..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Storage Condition</label>
                  <select
                    value={storageCondition}
                    onChange={(e) => setStorageCondition(e.target.value as StorageCondition)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="ROOM_TEMPERATURE">Room Temperature (15°C - 25°C)</option>
                    <option value="COLD_CHAIN">Cold Chain (2°C - 8°C Insulin/Vaccines)</option>
                    <option value="COOL">Cool Place (8°C - 15°C)</option>
                    <option value="PROTECT_FROM_LIGHT">Protect from Direct Light</option>
                  </select>
                </div>
              </div>

              {/* Medicine Flags */}
              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-emerald-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isControlled}
                    onChange={(e) => setIsControlled(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300"
                  />
                  <span className="font-semibold text-rose-700 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Controlled Substance (EFDA Narcotic/Psychotropic Schedule)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prescriptionRequired}
                    onChange={(e) => setPrescriptionRequired(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                  />
                  <span className="font-medium text-slate-700">Prescription Required (Rx Only)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVatExempt}
                    onChange={(e) => setIsVatExempt(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                  />
                  <span className="font-medium text-slate-700">VAT Exempt (Essential Medicines List)</span>
                </label>
              </div>
            </div>
          ) : (
            /* General Product Section */
            <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-200 space-y-3">
              <div className="flex items-center gap-2 text-teal-900 font-bold text-xs pb-1 border-b border-teal-200">
                <Package className="w-4 h-4 text-teal-600" />
                <span>General Merchandise Specifications</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Variant / Size / Model</label>
                  <input
                    type="text"
                    value={variantSize}
                    onChange={(e) => setVariantSize(e.target.value)}
                    placeholder="e.g. Size 4 Maxi, 400g Tin, Medium"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Manufacturer / Brand Owner</label>
                  <select
                    value={manufacturerId}
                    onChange={(e) => setManufacturerId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    {manufacturers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.country})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Standard Retail Price (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={standardSellingPrice}
                    onChange={(e) => setStandardSellingPrice(parseFloat(e.target.value) || 0)}
                    placeholder="1200.00"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Unit Conversions Engine (Box -> Strip -> Tablet) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <span className="font-bold text-slate-800 text-xs">
                Multi-Tier Packaging & Unit Conversions
              </span>
              <span className="text-[11px] text-slate-500">
                Enables dispensing partial strips or whole cartons seamlessly
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">
                  Base Unit (Smallest Dispensed) *
                </label>
                <input
                  type="text"
                  required
                  value={baseUnit}
                  onChange={(e) => setBaseUnit(e.target.value)}
                  placeholder="Tablet, Capsule, Piece, Can"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">
                  Secondary Unit (e.g. Strip)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={secondaryUnit}
                    onChange={(e) => setSecondaryUnit(e.target.value)}
                    placeholder="Strip"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">=</span>
                    <input
                      type="number"
                      min="1"
                      value={secondaryRatio}
                      onChange={(e) => setSecondaryRatio(parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 text-center font-bold"
                    />
                    <span className="text-slate-500 text-[10px]">{baseUnit}s</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">
                  Tertiary Unit (e.g. Box / Carton)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tertiaryUnit}
                    onChange={(e) => setTertiaryUnit(e.target.value)}
                    placeholder="Box"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">=</span>
                    <input
                      type="number"
                      min="1"
                      value={tertiaryRatio}
                      onChange={(e) => setTertiaryRatio(parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 text-center font-bold"
                    />
                    <span className="text-slate-500 text-[10px]">{baseUnit}s</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live conversion summary badge */}
            <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg px-3 py-1.5 flex items-center justify-between text-[11px]">
              <span className="font-semibold">Conversion Formula:</span>
              <span className="font-mono">
                1 {tertiaryUnit || 'Box'} = {tertiaryRatio} {baseUnit}s{' '}
                {secondaryUnit && secondaryRatio
                  ? `(${tertiaryRatio && secondaryRatio ? Math.floor(tertiaryRatio / secondaryRatio) : 1} ${secondaryUnit}s @ ${secondaryRatio} ${baseUnit}s/strip)`
                  : ''}
              </span>
            </div>
          </div>

          {/* Reorder Thresholds */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 mb-1 block">
                Reorder Alert Level (Base Units)
              </label>
              <input
                type="number"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 mb-1 block">
                Standard Reorder Quantity (Base Units)
              </label>
              <input
                type="number"
                value={reorderQuantity}
                onChange={(e) => setReorderQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors"
            >
              {productToEdit ? 'Save Changes' : 'Register Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
