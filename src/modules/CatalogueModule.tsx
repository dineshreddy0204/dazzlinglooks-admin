import React, { useState } from 'react';
import {
  AlertCircle,
  Archive,
  Check,
  Edit3,
  Layers,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Brand, Category, Product, ProductVariant } from '../types/admin';
import { IntegrationBanner, EmptyOrUnavailableState } from '../components/IntegrationStatusBanner';
import { validateSkuUniqueness } from '../utils/businessRules';

interface CatalogueModuleProps {
  activeSubTab: 'products' | 'categories_brands';
  isBackendConfigured: boolean;
  sandboxMode: boolean;
  products: Product[];
  categories: Category[];
  brands: Brand[];
  onSaveProduct: (product: Product, isNew: boolean) => void;
  onArchiveProduct: (productId: string) => void;
  onDeleteProduct: (productId: string) => void;
  onSaveCategory: (cat: Category) => void;
  onSaveBrand: (brand: Brand) => void;
}

const SKIN_TYPE_OPTIONS: Product['skinTypes'] = [
  'Normal',
  'Dry',
  'Oily',
  'Combination',
  'Sensitive',
  'Acne-Prone',
  'Mature',
];

export const CatalogueModule: React.FC<CatalogueModuleProps> = ({
  activeSubTab,
  isBackendConfigured,
  sandboxMode,
  products,
  categories,
  brands,
  onSaveProduct,
  onArchiveProduct,
  onDeleteProduct,
  onSaveCategory,
  onSaveBrand,
}) => {
  const [subTab, setSubTab] = useState<'products' | 'categories_brands'>(activeSubTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DRAFT' | 'ARCHIVED'>('ALL');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Category & Brand Form State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandSlug, setNewBrandSlug] = useState('');
  const [newBrandDesc, setNewBrandDesc] = useState('');
  const [catBrandError, setCatBrandError] = useState<string | null>(null);

  React.useEffect(() => {
    setSubTab(activeSubTab);
  }, [activeSubTab]);

  const startNewProduct = () => {
    const blank: Product = {
      id: `prod-${Date.now()}`,
      name: '',
      sku: '',
      barcode: '',
      brandId: brands[0]?.id || 'brand-dazzling',
      brandName: brands[0]?.name || 'Dazzlinglooks Naturals',
      categoryId: categories[0]?.id || 'cat-skincare',
      categoryName: categories[0]?.name || 'Facial Serums & Actives',
      shortDescription: '',
      fullDescription: '',
      images: [],
      regularPrice: 0,
      salePrice: undefined,
      status: 'DRAFT',
      visibility: 'PUBLIC',
      isFeatured: false,
      isBestSeller: false,
      ingredients: '',
      directions: '',
      precautions: '',
      skinTypes: [],
      seoTitle: '',
      metaDescription: '',
      slug: '',
      variants: [
        {
          id: `var-${Date.now()}-1`,
          productId: `prod-${Date.now()}`,
          name: '50 ml Standard Bottle',
          optionType: 'VOLUME_SIZE',
          sku: '',
          regularPrice: 0,
          stockOnHand: 0,
          reservedStock: 0,
          availableStock: 0,
          active: true,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingProduct(blank);
    setIsCreatingProduct(true);
    setHasUnsavedChanges(false);
    setValidationError(null);
  };

  const handleCloseEditor = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved product changes. Discard changes and close editor?'
      );
      if (!confirmed) return;
    }
    setEditingProduct(null);
    setIsCreatingProduct(false);
    setHasUnsavedChanges(false);
    setValidationError(null);
  };

  const handleSaveProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (!editingProduct.name.trim()) {
      setValidationError('Product name is required.');
      return;
    }

    const existingSkus = products
      .filter((p) => p.id !== editingProduct.id)
      .flatMap((p) => [p.sku, ...p.variants.map((v) => v.sku)]);

    const skuCheck = validateSkuUniqueness(
      editingProduct.sku,
      existingSkus,
      isCreatingProduct ? undefined : editingProduct.id
    );
    if (!skuCheck.valid) {
      setValidationError(skuCheck.error || 'Invalid SKU');
      return;
    }

    if (editingProduct.regularPrice <= 0) {
      setValidationError('Regular price must be greater than ₹0.');
      return;
    }

    if (
      editingProduct.salePrice !== undefined &&
      editingProduct.salePrice > 0 &&
      editingProduct.salePrice >= editingProduct.regularPrice
    ) {
      setValidationError('Sale price must be strictly lower than the regular price.');
      return;
    }

    if (!editingProduct.ingredients.trim()) {
      setValidationError(
        'Verified product ingredients list is required for beauty & skincare compliance. Do not invent claims.'
      );
      return;
    }

    // Check variant SKU uniqueness
    const variantSkus = new Set<string>();
    for (const v of editingProduct.variants) {
      if (!v.name.trim() || !v.sku.trim()) {
        setValidationError('Every product variant must have a name (e.g. 50 ml, Shade #02) and unique SKU.');
        return;
      }
      const norm = v.sku.trim().toUpperCase();
      if (variantSkus.has(norm) || existingSkus.map((s) => s.toUpperCase()).includes(norm)) {
        setValidationError(`Duplicate variant SKU detected: "${norm}".`);
        return;
      }
      variantSkus.add(norm);
    }

    const updated: Product = {
      ...editingProduct,
      sku: editingProduct.sku.trim().toUpperCase(),
      slug:
        editingProduct.slug.trim() ||
        editingProduct.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      updatedAt: new Date().toISOString(),
    };

    onSaveProduct(updated, isCreatingProduct);
    setEditingProduct(null);
    setIsCreatingProduct(false);
    setHasUnsavedChanges(false);
    setValidationError(null);
  };

  const handleAddVariantRow = () => {
    if (!editingProduct) return;
    const nextVariant: ProductVariant = {
      id: `var-${Date.now()}-${editingProduct.variants.length + 1}`,
      productId: editingProduct.id,
      name: '',
      optionType: 'VOLUME_SIZE',
      sku: `${editingProduct.sku || 'DL'}-V${editingProduct.variants.length + 1}`,
      regularPrice: editingProduct.regularPrice || 0,
      stockOnHand: 0,
      reservedStock: 0,
      availableStock: 0,
      active: true,
    };
    setEditingProduct({
      ...editingProduct,
      variants: [...editingProduct.variants, nextVariant],
    });
    setHasUnsavedChanges(true);
  };

  const filteredProducts = products.filter((p) => {
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.brandName.toLowerCase().includes(q) ||
      p.categoryName.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCatBrandError(null);
    const name = newCategoryName.trim();
    if (!name) {
      setCatBrandError('Category name is required.');
      return;
    }
    const slug =
      newCategorySlug.trim() ||
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (categories.some((c) => c.slug.toLowerCase() === slug.toLowerCase())) {
      setCatBrandError(`Duplicate category slug "${slug}" detected.`);
      return;
    }
    onSaveCategory({
      id: `cat-${Date.now()}`,
      name,
      slug,
      parentId: null,
      description: newCategoryDesc.trim(),
      status: 'ACTIVE',
      productCount: 0,
    });
    setNewCategoryName('');
    setNewCategorySlug('');
    setNewCategoryDesc('');
  };

  const handleCreateBrand = (e: React.FormEvent) => {
    e.preventDefault();
    setCatBrandError(null);
    const name = newBrandName.trim();
    if (!name) {
      setCatBrandError('Brand name is required.');
      return;
    }
    const slug =
      newBrandSlug.trim() ||
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (brands.some((b) => b.slug.toLowerCase() === slug.toLowerCase())) {
      setCatBrandError(`Duplicate brand slug "${slug}" detected.`);
      return;
    }
    onSaveBrand({
      id: `brand-${Date.now()}`,
      name,
      slug,
      description: newBrandDesc.trim(),
      status: 'ACTIVE',
      productCount: 0,
    });
    setNewBrandName('');
    setNewBrandSlug('');
    setNewBrandDesc('');
  };

  return (
    <div className="space-y-6">
      <IntegrationBanner
        moduleName="Product Catalogue, Variations, Categories & Brands"
        endpointPath="GET / POST / PUT /api/v1/admin/products & /api/v1/admin/categories"
        isBackendConfigured={isBackendConfigured}
        sandboxActive={sandboxMode}
        externalDependency="Shared Product Catalogue DB & Media Storage"
      />

      {/* Sub-navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setSubTab('products')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'products'
                ? 'bg-white text-[#3B0764] shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Products & Variations ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('categories_brands')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'categories_brands'
                ? 'bg-white text-[#3B0764] shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Categories ({categories.length}) & Brands ({brands.length})
          </button>
        </div>

        {subTab === 'products' && !editingProduct && (
          <button
            type="button"
            onClick={startNewProduct}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#FF6B00] hover:bg-[#e66000] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Verified Product</span>
          </button>
        )}
      </div>

      {/* PRODUCT EDITOR DRAWER / FORM */}
      {editingProduct && (
        <div className="bg-white border-2 border-[#3B0764]/20 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {isCreatingProduct ? 'Create New Beauty / Skincare Product' : `Edit Product: ${editingProduct.name}`}
              </h3>
              <p className="text-xs text-slate-500">
                Do not invent product claims, ingredients, or manufacturer details. Supply owner-verified attributes only.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCloseEditor}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
              aria-label="Close product editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {validationError && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProductSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => {
                    setEditingProduct({ ...editingProduct, name: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g., Kumkumadi Radiance Facial Oil"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#3B0764]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Master SKU (Unique) *
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.sku}
                  onChange={(e) => {
                    setEditingProduct({ ...editingProduct, sku: e.target.value.toUpperCase() });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g., DL-SERUM-KUMKUMADI"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-[#3B0764]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  EAN / Barcode (Optional)
                </label>
                <input
                  type="text"
                  value={editingProduct.barcode || ''}
                  onChange={(e) => {
                    setEditingProduct({ ...editingProduct, barcode: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="8901234567890"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-[#3B0764]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Regular Price (₹ INR) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={editingProduct.regularPrice || ''}
                  onChange={(e) => {
                    setEditingProduct({
                      ...editingProduct,
                      regularPrice: parseFloat(e.target.value) || 0,
                    });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-[#3B0764]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sale Price (₹ INR, Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingProduct.salePrice || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setEditingProduct({
                      ...editingProduct,
                      salePrice: isNaN(val) ? undefined : val,
                    });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-[#3B0764]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catalogue Status
                </label>
                <select
                  value={editingProduct.status}
                  onChange={(e) => {
                    setEditingProduct({
                      ...editingProduct,
                      status: e.target.value as Product['status'],
                    });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#3B0764]"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Storefront Visibility
                </label>
                <select
                  value={editingProduct.visibility}
                  onChange={(e) => {
                    setEditingProduct({
                      ...editingProduct,
                      visibility: e.target.value as Product['visibility'],
                    });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#3B0764]"
                >
                  <option value="PUBLIC">PUBLIC</option>
                  <option value="CATALOG_ONLY">CATALOG_ONLY</option>
                  <option value="HIDDEN">HIDDEN</option>
                </select>
              </div>
            </div>

            {/* Skin-Type Suitability & Verified Attributes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Verified Skin-Type Suitability
              </label>
              <div className="flex flex-wrap gap-2">
                {SKIN_TYPE_OPTIONS.map((st) => {
                  const selected = editingProduct.skinTypes.includes(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        const updatedTypes = selected
                          ? editingProduct.skinTypes.filter((item) => item !== st)
                          : [...editingProduct.skinTypes, st];
                        setEditingProduct({ ...editingProduct, skinTypes: updatedTypes });
                        setHasUnsavedChanges(true);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#3B0764] text-white border-[#3B0764]'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ingredients, Directions & Precautions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Verified Full Ingredients List (INCI) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingProduct.ingredients}
                  onChange={(e) => {
                    setEditingProduct({ ...editingProduct, ingredients: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Enter exact manufacturer-verified ingredients..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#3B0764]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Directions for Use
                </label>
                <textarea
                  rows={3}
                  value={editingProduct.directions}
                  onChange={(e) => {
                    setEditingProduct({ ...editingProduct, directions: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g., Apply 3-4 drops on cleansed damp face..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#3B0764]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Safety Precautions & Patch Test Notice
                </label>
                <textarea
                  rows={3}
                  value={editingProduct.precautions}
                  onChange={(e) => {
                    setEditingProduct({ ...editingProduct, precautions: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g., Patch test on inner elbow 24h prior to use..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#3B0764]"
                />
              </div>
            </div>

            {/* Product Variations Matrix (Volumes, Shades, Multipacks) */}
            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">
                    Purchasable Product Variations (Sizes / Volumes / Shades / Multipacks)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Each variant maintains a stable ID, independent SKU, price, and inventory link.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddVariantRow}
                  className="px-3 py-1.5 text-xs font-semibold text-[#3B0764] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  + Add Variant Option
                </button>
              </div>

              <div className="space-y-2.5">
                {editingProduct.variants.map((v, idx) => (
                  <div
                    key={v.id}
                    className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 p-3 rounded-lg bg-[#FAF9F6] border border-slate-200 items-center"
                  >
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Option Type</label>
                      <select
                        value={v.optionType}
                        onChange={(e) => {
                          const updatedVars = [...editingProduct.variants];
                          updatedVars[idx] = {
                            ...v,
                            optionType: e.target.value as ProductVariant['optionType'],
                          };
                          setEditingProduct({ ...editingProduct, variants: updatedVars });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
                      >
                        <option value="VOLUME_SIZE">Volume / Size (ml/g)</option>
                        <option value="SHADE">Lipstick / Makeup Shade</option>
                        <option value="MULTIPACK">Multipack Bundle</option>
                        <option value="CUSTOM">Custom Option</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">
                        Variant Label *
                      </label>
                      <input
                        type="text"
                        required
                        value={v.name}
                        onChange={(e) => {
                          const updatedVars = [...editingProduct.variants];
                          updatedVars[idx] = { ...v, name: e.target.value };
                          setEditingProduct({ ...editingProduct, variants: updatedVars });
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="50 ml / Crimson #04"
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Variant SKU *</label>
                      <input
                        type="text"
                        required
                        value={v.sku}
                        onChange={(e) => {
                          const updatedVars = [...editingProduct.variants];
                          updatedVars[idx] = { ...v, sku: e.target.value.toUpperCase() };
                          setEditingProduct({ ...editingProduct, variants: updatedVars });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Price (₹)</label>
                      <input
                        type="number"
                        min="1"
                        value={v.regularPrice || ''}
                        onChange={(e) => {
                          const updatedVars = [...editingProduct.variants];
                          updatedVars[idx] = {
                            ...v,
                            regularPrice: parseFloat(e.target.value) || 0,
                          };
                          setEditingProduct({ ...editingProduct, variants: updatedVars });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">
                        Available Stock
                      </label>
                      <input
                        type="number"
                        disabled
                        value={v.availableStock}
                        title="Stock must be modified through the Inventory Adjustment module"
                        className="w-full px-2 py-1.5 text-xs font-mono border border-slate-200 rounded bg-slate-100 text-slate-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3">
                      <label className="inline-flex items-center gap-1 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={v.active}
                          onChange={(e) => {
                            const updatedVars = [...editingProduct.variants];
                            updatedVars[idx] = { ...v, active: e.target.checked };
                            setEditingProduct({ ...editingProduct, variants: updatedVars });
                            setHasUnsavedChanges(true);
                          }}
                        />
                        <span>Active</span>
                      </label>
                      {editingProduct.variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct({
                              ...editingProduct,
                              variants: editingProduct.variants.filter((_, i) => i !== idx),
                            });
                            setHasUnsavedChanges(true);
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Remove variant"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEO Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL Slug</label>
                <input
                  type="text"
                  value={editingProduct.slug}
                  onChange={(e) => {
                    setEditingProduct({ ...editingProduct, slug: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="auto-generated-from-name"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">SEO Title</label>
                <input
                  type="text"
                  value={editingProduct.seoTitle}
                  onChange={(e) => {
                    setEditingProduct({ ...editingProduct, seoTitle: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Meta title (max 60 chars recommended)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Meta Description
                </label>
                <input
                  type="text"
                  value={editingProduct.metaDescription}
                  onChange={(e) => {
                    setEditingProduct({ ...editingProduct, metaDescription: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Meta description for search snippets"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCloseEditor}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#3B0764] hover:bg-[#2a0548] rounded-lg cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save & Validate Product</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PRODUCTS LIST VIEW */}
      {subTab === 'products' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by product name, SKU, brand or category..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#3B0764]"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['ALL', 'ACTIVE', 'DRAFT', 'ARCHIVED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white text-[#3B0764] shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-6">
              <EmptyOrUnavailableState
                state={isBackendConfigured ? 'EMPTY_RECORDS' : 'INTEGRATION_PENDING'}
                title="No Verified Products in Catalogue View"
                description="Product records must come from the shared Dazzlinglooks.in backend or be created by the store owner. Click 'Create Verified Product' above to test full SKU and variant validation."
                endpoint="GET /api/v1/admin/products"
                primaryActionLabel="Create Verified Product"
                onPrimaryAction={startNewProduct}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                    <th className="py-3 px-4">Product & Master SKU</th>
                    <th className="py-3 px-4">Brand · Category</th>
                    <th className="py-3 px-4">Variations</th>
                    <th className="py-3 px-4 text-right">Regular / Sale Price</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{prod.name}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          SKU: {prod.sku} · Slug: /{prod.slug}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span>{prod.brandName}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{prod.categoryName}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium">
                          {prod.variants.length} variant(s)
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {prod.variants.map((v) => `${v.name} (${v.availableStock})`).join(' · ')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <div className="font-semibold text-slate-900">
                          ₹{prod.regularPrice.toFixed(2)}
                        </div>
                        {prod.salePrice && (
                          <div className="text-[11px] text-[#FF6B00] font-semibold">
                            Sale: ₹{prod.salePrice.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {prod.status} · {prod.visibility}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct(prod);
                              setIsCreatingProduct(false);
                              setHasUnsavedChanges(false);
                              setValidationError(null);
                            }}
                            className="p-1.5 text-slate-600 hover:text-[#3B0764] hover:bg-slate-100 rounded cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onArchiveProduct(prod.id)}
                            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded cursor-pointer"
                            title="Archive Product"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                          {confirmDeleteId === prod.id ? (
                            <div className="inline-flex items-center gap-1 bg-red-50 px-2 py-1 rounded border border-red-200">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteProduct(prod.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="text-[11px] font-bold text-red-700 hover:underline cursor-pointer"
                              >
                                Confirm Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-[11px] text-slate-500 ml-1 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(prod.id)}
                              className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CATEGORIES & BRANDS VIEW */}
      {subTab === 'categories_brands' && (
        <div className="space-y-6">
          {catBrandError && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {catBrandError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Categories Panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Categories Management</h3>
                <p className="text-xs text-slate-500">
                  Duplicate slug detection and safe handling of associated products on archive.
                </p>
              </div>

              <form onSubmit={handleCreateCategory} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category Name *"
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  value={newCategorySlug}
                  onChange={(e) => setNewCategorySlug(e.target.value)}
                  placeholder="Slug (optional)"
                  className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
                <button
                  type="submit"
                  className="px-3 py-2 text-xs font-semibold text-white bg-[#3B0764] hover:bg-[#2a0548] rounded-lg cursor-pointer"
                >
                  + Add Category
                </button>
              </form>

              <div className="divide-y divide-slate-100 text-xs">
                {categories.length === 0 ? (
                  <p className="text-slate-500 py-4">No categories loaded.</p>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-900">{cat.name}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono text-slate-500">/{cat.slug}</span>
                      </div>
                      <div className="text-slate-600 font-mono tabular-nums">
                        {products.filter((p) => p.categoryId === cat.id).length} products · {cat.status}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Brands Panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Brands Registry</h3>
                <p className="text-xs text-slate-500">
                  Manage beauty & skincare brands, logos, and real product counts.
                </p>
              </div>

              <form onSubmit={handleCreateBrand} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Brand Name *"
                  className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  value={newBrandSlug}
                  onChange={(e) => setNewBrandSlug(e.target.value)}
                  placeholder="Slug (optional)"
                  className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
                <button
                  type="submit"
                  className="px-3 py-2 text-xs font-semibold text-white bg-[#3B0764] hover:bg-[#2a0548] rounded-lg cursor-pointer"
                >
                  + Add Brand
                </button>
              </form>

              <div className="divide-y divide-slate-100 text-xs">
                {brands.length === 0 ? (
                  <p className="text-slate-500 py-4">No brands loaded.</p>
                ) : (
                  brands.map((b) => (
                    <div key={b.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-900">{b.name}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono text-slate-500">/{b.slug}</span>
                      </div>
                      <div className="text-slate-600 font-mono tabular-nums">
                        {products.filter((p) => p.brandId === b.id).length} products · {b.status}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
