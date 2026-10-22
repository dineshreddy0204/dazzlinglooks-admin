/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BarChart3,
  Bell,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  CreditCard,
  Database,
  FileText,
  FolderTree,
  Globe,
  HardDrive,
  Image,
  LayoutDashboard,
  Lock,
  Menu,
  MessageSquare,
  Package,
  Percent,
  RotateCcw,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { BrandLogo } from './components/BrandLogo';
import {
  AdminSession,
  AuditLogEntry,
  Brand,
  Category,
  DiscountRule,
  InventoryItem,
  ModuleId,
  Order,
  OrderStatus,
  Product,
  ProductBatch,
  PurchaseOrder,
  ReturnRequest,
  ShipmentRecord,
  StockAdjustmentRecord,
  Supplier,
} from './types/admin';
import { apiClient } from './services/apiClient';
import { OverviewModule } from './modules/OverviewModule';
import { CatalogueModule } from './modules/CatalogueModule';
import { InventorySupplyModule } from './modules/InventorySupplyModule';
import { DiscountEngineModule } from './modules/DiscountEngineModule';
import { OrdersFulfillmentModule } from './modules/OrdersFulfillmentModule';
import { OperationsGrowthModule } from './modules/OperationsGrowthModule';
import { SystemArchitectureModule } from './modules/SystemArchitectureModule';
import {
  SANDBOX_BATCHES,
  SANDBOX_BRANDS,
  SANDBOX_CATEGORIES,
  SANDBOX_DISCOUNT_RULES,
  SANDBOX_INVENTORY,
  SANDBOX_ORDERS,
  SANDBOX_PRODUCTS,
  SANDBOX_PURCHASE_ORDERS,
  SANDBOX_RETURNS,
  SANDBOX_SHIPMENTS,
  SANDBOX_SUPPLIERS,
} from './utils/testFixtures';

interface NavGroup {
  groupLabel: string;
  items: {
    id: ModuleId;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[];
}

/**
 * Complete 25-Module Navigation Architecture (Section 4)
 * Every menu item navigates to its dedicated functional screen.
 */
const NAVIGATION_GROUPS: NavGroup[] = [
  {
    groupLabel: 'Overview & Command',
    items: [{ id: 'overview', label: '1. Dashboard Overview', icon: LayoutDashboard }],
  },
  {
    groupLabel: 'Catalogue & Inventory',
    items: [
      { id: 'products', label: '2. Products & Variations', icon: Package },
      { id: 'categories_brands', label: '3. Categories & Brands', icon: FolderTree },
      { id: 'inventory', label: '4. Inventory Management', icon: Boxes },
      { id: 'batches_expiry', label: '5. Batch & Expiry (FEFO)', icon: ClipboardCheck },
      { id: 'suppliers_po', label: '6. Suppliers & Purchase Orders', icon: ShoppingBag },
    ],
  },
  {
    groupLabel: 'Orders, Payments & Logistics',
    items: [
      { id: 'orders', label: '7. Orders & Lifecycle', icon: ShoppingCart },
      { id: 'payments_refunds', label: '8. Payments & Refunds', icon: CreditCard },
      { id: 'shipments_tracking', label: '9. Courier & AWB Tracking', icon: Truck },
      { id: 'returns_exchanges', label: '10. Returns & Exchanges', icon: RotateCcw },
    ],
  },
  {
    groupLabel: 'Customers, Offers & Content',
    items: [
      { id: 'customers', label: '11. Customer Management', icon: Users },
      { id: 'abandoned_carts', label: '12. Abandoned Carts', icon: ShoppingBag },
      { id: 'reviews_moderation', label: '13. Reviews & Moderation', icon: MessageSquare },
      { id: 'discounts', label: '14. Offers & Discount Engine', icon: Percent },
      { id: 'banners_cms', label: '15. Banners & Homepage', icon: Image },
      { id: 'analytics_reports', label: '16. Reports & Analytics', icon: BarChart3 },
      { id: 'pages_content', label: '17. Pages & Content', icon: FileText },
      { id: 'seo_quality', label: '18. SEO & Catalogue Quality', icon: Globe },
      { id: 'shipping_rules', label: '19. Shipping Rules & PINs', icon: Truck },
      { id: 'notifications', label: '20. Notification Center', icon: Bell },
    ],
  },
  {
    groupLabel: 'Settings, Security & API',
    items: [
      { id: 'store_settings', label: '21. Store Settings', icon: Settings },
      { id: 'owner_access_control', label: '22. Owner Auth & Access', icon: Lock },
      { id: 'audit_security', label: '23. Audit Logs', icon: Shield },
      { id: 'api_contracts', label: '24. API Integration & Docs', icon: Code2 },
      { id: 'backup_recovery', label: '25. Backup & Recovery', icon: Database },
      { id: 'media_storage', label: 'Media Storage', icon: HardDrive },
      { id: 'qa_verification', label: 'QA Verification Suite', icon: CheckCircle2 },
    ],
  },
];

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Strict Backend & Sandbox State Separation (Default: Live Mode with Zero Fake Data)
  const [isBackendConfigured, setIsBackendConfigured] = useState<boolean>(
    apiClient.isConfigured()
  );
  const [sandboxMode, setSandboxMode] = useState<boolean>(false);

  // Owner Authentication Session State (Pending until connected to real auth provider)
  const [session] = useState<AdminSession>({
    authenticated: false,
    ownerId: null,
    email: null,
    role: null,
    sessionExpiresAt: null,
    authProviderStatus: 'PENDING_BACKEND_AUTH',
  });

  // Live vs Isolated Sandbox State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustmentRecord[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'audit-init-1',
      timestamp: new Date().toISOString(),
      actorEmail: 'system@dazzlinglooks.in',
      actorRole: 'SYSTEM_INIT',
      action: 'INITIALIZE_ADMIN_SHELL',
      module: 'Application Shell',
      affectedRecordId: 'APP-BOOT',
      result: 'SUCCESS',
      details: apiClient.isConfigured()
        ? `Configured API target: ${apiClient.getBaseUrl()}`
        : 'Booted in strict zero-fake-data mode. VITE_API_BASE_URL is awaiting backend connection.',
    },
  ]);

  const recordAudit = (
    action: string,
    moduleName: string,
    affectedRecordId: string,
    details: string
  ) => {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      actorEmail: session.email || 'owner-workspace@dazzlinglooks.in',
      actorRole: 'STORE_OWNER',
      action,
      module: moduleName,
      affectedRecordId,
      result: isBackendConfigured ? 'SUCCESS' : 'PENDING_BACKEND',
      details,
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  const handleToggleSandboxMode = () => {
    if (!sandboxMode) {
      setSandboxMode(true);
      setCategories(SANDBOX_CATEGORIES);
      setBrands(SANDBOX_BRANDS);
      setProducts(SANDBOX_PRODUCTS);
      setInventory(SANDBOX_INVENTORY);
      setBatches(SANDBOX_BATCHES);
      setSuppliers(SANDBOX_SUPPLIERS);
      setPurchaseOrders(SANDBOX_PURCHASE_ORDERS);
      setDiscountRules(SANDBOX_DISCOUNT_RULES);
      setOrders(SANDBOX_ORDERS);
      setShipments(SANDBOX_SHIPMENTS);
      setReturns(SANDBOX_RETURNS);
      recordAudit(
        'ENABLE_TEST_FIXTURE_SANDBOX',
        'System Environment',
        'SANDBOX-ON',
        'Loaded isolated development test fixtures labeled [TEST FIXTURE] for UI workflow inspection.'
      );
    } else {
      setSandboxMode(false);
      setCategories([]);
      setBrands([]);
      setProducts([]);
      setInventory([]);
      setBatches([]);
      setSuppliers([]);
      setPurchaseOrders([]);
      setDiscountRules([]);
      setOrders([]);
      setShipments([]);
      setReturns([]);
      recordAudit(
        'DISABLE_TEST_FIXTURE_SANDBOX',
        'System Environment',
        'SANDBOX-OFF',
        'Purged all test fixtures and restored clean unseeded production state.'
      );
    }
  };

  // Module Handlers
  const handleSaveProduct = (product: Product, isNew: boolean) => {
    if (isNew) {
      setProducts((prev) => [product, ...prev]);
      const newInvItems: InventoryItem[] = product.variants.map((v) => ({
        variantId: v.id,
        productId: product.id,
        productName: product.name,
        variantName: v.name,
        sku: v.sku,
        stockOnHand: v.stockOnHand,
        reservedQuantity: v.reservedStock,
        availableQuantity: v.availableStock,
        lowStockThreshold: 10,
        allowBackorders: false,
        lastUpdatedAt: new Date().toISOString(),
      }));
      setInventory((prev) => [...newInvItems, ...prev]);
      recordAudit(
        'CREATE_PRODUCT',
        'Product Catalogue',
        product.sku,
        `Created product "${product.name}" with ${product.variants.length} variant(s).`
      );
    } else {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
      recordAudit(
        'UPDATE_PRODUCT',
        'Product Catalogue',
        product.sku,
        `Updated product "${product.name}" (${product.status}).`
      );
    }
  };

  const handleArchiveProduct = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, status: 'ARCHIVED' } : p))
    );
    recordAudit('ARCHIVE_PRODUCT', 'Product Catalogue', productId, 'Archived product record.');
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setInventory((prev) => prev.filter((i) => i.productId !== productId));
    recordAudit('DELETE_PRODUCT', 'Product Catalogue', productId, 'Deleted product record.');
  };

  const handleApplyStockAdjustment = (adj: StockAdjustmentRecord, newStockOnHand: number) => {
    setAdjustments((prev) => [adj, ...prev]);
    setInventory((prev) =>
      prev.map((item) =>
        item.variantId === adj.variantId
          ? {
              ...item,
              stockOnHand: newStockOnHand,
              availableQuantity: newStockOnHand - item.reservedQuantity,
              lastUpdatedAt: adj.timestamp,
            }
          : item
      )
    );
    recordAudit(
      'STOCK_ADJUSTMENT',
      'Inventory Management',
      adj.sku,
      `Adjusted ${adj.sku} by ${adj.deltaQuantity} (${adj.reasonCode}): ${adj.previousStock} -> ${adj.newStock}`
    );
  };

  const handleQuarantineBatch = (batchId: string) => {
    setBatches((prev) =>
      prev.map((b) => (b.id === batchId ? { ...b, status: 'QUARANTINED' } : b))
    );
    recordAudit(
      'QUARANTINE_BATCH_LOT',
      'Batch & Expiry (FEFO)',
      batchId,
      'Quarantined batch lot and removed from FEFO picking queue.'
    );
  };

  const handleCreatePurchaseOrder = (po: PurchaseOrder) => {
    setPurchaseOrders((prev) => [po, ...prev]);
    recordAudit(
      'ISSUE_PURCHASE_ORDER',
      'Suppliers & Purchase Orders',
      po.poNumber,
      `Issued PO ${po.poNumber} to ${po.supplierName} (Stock unchanged until receipt confirmation).`
    );
  };

  const handleConfirmPoReceipt = (poId: string) => {
    const targetPo = purchaseOrders.find((p) => p.id === poId);
    if (!targetPo || targetPo.status === 'COMPLETED_RECEIVED') return;

    setPurchaseOrders((prev) =>
      prev.map((p) =>
        p.id === poId
          ? {
              ...p,
              status: 'COMPLETED_RECEIVED',
              items: p.items.map((it) => ({ ...it, receivedQty: it.requestedQty })),
            }
          : p
      )
    );

    targetPo.items.forEach((it) => {
      setInventory((prev) =>
        prev.map((inv) =>
          inv.variantId === it.variantId
            ? {
                ...inv,
                stockOnHand: inv.stockOnHand + it.requestedQty,
                availableQuantity: inv.availableQuantity + it.requestedQty,
                lastUpdatedAt: new Date().toISOString(),
              }
            : inv
        )
      );
    });

    recordAudit(
      'CONFIRM_PO_RECEIPT',
      'Suppliers & Purchase Orders',
      targetPo.poNumber,
      `Confirmed goods receipt for ${targetPo.poNumber} and incremented sellable inventory.`
    );
  };

  const handleTransitionOrderStatus = (
    orderId: string,
    nextStatus: OrderStatus,
    notes: string
  ) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: nextStatus, notes, updatedAt: new Date().toISOString() }
          : o
      )
    );
    recordAudit(
      'ORDER_STATUS_TRANSITION',
      'Orders & Lifecycle',
      orderId,
      `Transitioned order ${orderId} to ${nextStatus}. Note: ${notes}`
    );
  };

  const handleInitiateRefund = (orderId: string, amount: number, reason: string) => {
    recordAudit(
      'INITIATE_GATEWAY_REFUND',
      'Payments & Refunds',
      orderId,
      `Requested refund of ₹${amount.toFixed(2)} (Reason: ${reason}). Status: Awaiting Payment Provider Confirmation.`
    );
  };

  const handleSaveManualShipment = (shipment: ShipmentRecord) => {
    setShipments((prev) => [shipment, ...prev]);
    recordAudit(
      'SAVE_MANUAL_AWB',
      'Courier & Shipment Tracking',
      shipment.awbNumber,
      `Saved manual courier booking AWB ${shipment.awbNumber} (${shipment.courierName}) for Order ${shipment.orderNumber}.`
    );
  };

  const handleInspectReturnDecision = (
    returnId: string,
    approval: 'APPROVED' | 'REJECTED',
    restock: 'APPROVED_RESELLABLE' | 'QUARANTINE_DISPOSE'
  ) => {
    const targetRet = returns.find((r) => r.id === returnId);
    if (!targetRet) return;

    setReturns((prev) =>
      prev.map((r) =>
        r.id === returnId
          ? { ...r, approvalStatus: approval, restockDecision: restock }
          : r
      )
    );

    if (approval === 'APPROVED' && restock === 'APPROVED_RESELLABLE') {
      setInventory((prev) =>
        prev.map((inv) =>
          inv.sku === targetRet.itemSku
            ? {
                ...inv,
                stockOnHand: inv.stockOnHand + targetRet.quantity,
                availableQuantity: inv.availableQuantity + targetRet.quantity,
              }
            : inv
        )
      );
    }

    recordAudit(
      'RETURN_HYGIENE_INSPECTION',
      'Returns & Exchanges',
      targetRet.returnNumber,
      `Return ${targetRet.returnNumber} marked ${approval} with restock decision ${restock}.`
    );
  };

  const activeNavItem = NAVIGATION_GROUPS.flatMap((g) => g.items).find(
    (i) => i.id === activeModule
  );

  const matchingSearchModules = globalSearch.trim()
    ? NAVIGATION_GROUPS.flatMap((g) => g.items).filter((item) =>
        item.label.toLowerCase().includes(globalSearch.trim().toLowerCase())
      )
    : [];

  return (
    <div className="min-h-screen flex bg-[#FAF7F5] text-slate-900 overflow-x-hidden">
      {/* Desktop Dark Branded Sidebar (Inspired by Supplied Reference Screenshots) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:shrink-0 bg-[#140D1F] text-slate-200 border-r border-slate-800 select-none">
        {/* Exact Dazzlinglooks.in Brand Lockup */}
        <div className="px-5 py-4 border-b border-white/10 flex flex-col items-center justify-center bg-[#1A1027]">
          <BrandLogo size="md" theme="dark" />
          <span className="text-[11px] font-medium text-slate-400 mt-1">
            Admin Panel · Store Owner
          </span>
        </div>

        {/* 25-Module Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Admin Modules">
          {NAVIGATION_GROUPS.map((group) => (
            <div key={group.groupLabel}>
              <div className="px-3 mb-1.5 text-[10px] font-semibold text-[#D4AF37]/80 tracking-wider uppercase">
                {group.groupLabel}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveModule(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-[#E11D48] to-[#FF6B00] text-white font-semibold shadow-sm'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-white' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Branded Promo Card (Matching Reference Sidebar Footer) */}
        <div className="p-3.5 m-3 rounded-xl bg-gradient-to-br from-[#2B0948] to-[#140D1F] border border-[#D4AF37]/40 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#F3E5AB]">Dazzlinglooks.in</span>
            <span className="font-mono text-[10px] text-[#FF6B00] font-semibold">
              Owner Console
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Manage your beauty business with verified inventory, FEFO batches, and API contracts.
          </p>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="w-full py-1.5 px-3 text-xs font-semibold text-[#140D1F] bg-[#F3E5AB] hover:bg-[#D4AF37] rounded-lg transition-colors cursor-pointer"
          >
            Owner Auth & Security Status
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-xs bg-[#140D1F] text-white h-full flex flex-col z-10">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#1A1027]">
              <BrandLogo size="sm" theme="dark" />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
              {NAVIGATION_GROUPS.map((group) => (
                <div key={group.groupLabel}>
                  <div className="px-3 mb-1 text-[10px] font-semibold text-[#D4AF37]/80 uppercase">
                    {group.groupLabel}
                  </div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveModule(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg ${
                          isActive
                            ? 'bg-gradient-to-r from-[#E11D48] to-[#FF6B00] text-white font-semibold'
                            : 'text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Zone 1 (Breadcrumb / Mobile Menu) — Zone 2 (Global Search) — Zone 3 (Primary Action) */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-8 sticky top-0 z-30">
          {/* Zone 1: Breadcrumb */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-lg"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm font-semibold text-slate-900 whitespace-nowrap shrink-0">
              <span className="text-slate-400 font-normal">Dazzlinglooks.in / </span>
              <span className="text-[#3B0764]">{activeNavItem?.label || 'Dashboard'}</span>
            </div>
          </div>

          {/* Zone 2: Global Module Search */}
          <div className="hidden md:flex items-center gap-6 flex-1 max-w-md relative">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search modules, products, orders, categories, API docs..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF7F5] border border-slate-200 rounded-lg focus:outline-none focus:border-[#3B0764]"
              />
            </div>

            {matchingSearchModules.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-40">
                {matchingSearchModules.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setActiveModule(m.id);
                      setGlobalSearch('');
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#3B0764] font-medium cursor-pointer"
                  >
                    Open Module: {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveModule('api_contracts')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#3B0764] hover:bg-[#2a0548] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              API Contract & Status
            </button>
          </div>
        </header>

        {/* Active Module Viewport */}
        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto">
          {activeModule === 'overview' && (
            <OverviewModule
              isBackendConfigured={isBackendConfigured}
              sandboxMode={sandboxMode}
              onToggleSandboxMode={handleToggleSandboxMode}
              onNavigateModule={(mod) => setActiveModule(mod)}
              products={products}
              categories={categories}
              orders={orders}
              inventory={inventory}
              batches={batches}
              shipments={shipments}
              returns={returns}
              auditLogs={auditLogs}
            />
          )}

          {(activeModule === 'products' || activeModule === 'categories_brands') && (
            <CatalogueModule
              activeSubTab={activeModule}
              isBackendConfigured={isBackendConfigured}
              sandboxMode={sandboxMode}
              products={products}
              categories={categories}
              brands={brands}
              onSaveProduct={handleSaveProduct}
              onArchiveProduct={handleArchiveProduct}
              onDeleteProduct={handleDeleteProduct}
              onSaveCategory={(cat) => {
                setCategories((prev) => [...prev, cat]);
                recordAudit(
                  'CREATE_CATEGORY',
                  'Categories & Brands',
                  cat.slug,
                  `Added category ${cat.name}`
                );
              }}
              onSaveBrand={(b) => {
                setBrands((prev) => [...prev, b]);
                recordAudit(
                  'CREATE_BRAND',
                  'Categories & Brands',
                  b.slug,
                  `Added brand ${b.name}`
                );
              }}
            />
          )}

          {(activeModule === 'inventory' ||
            activeModule === 'batches_expiry' ||
            activeModule === 'suppliers_po') && (
            <InventorySupplyModule
              activeSubTab={activeModule}
              isBackendConfigured={isBackendConfigured}
              sandboxMode={sandboxMode}
              inventory={inventory}
              adjustments={adjustments}
              batches={batches}
              suppliers={suppliers}
              purchaseOrders={purchaseOrders}
              onApplyStockAdjustment={handleApplyStockAdjustment}
              onQuarantineBatch={handleQuarantineBatch}
              onCreatePurchaseOrder={handleCreatePurchaseOrder}
              onConfirmPoReceipt={handleConfirmPoReceipt}
            />
          )}

          {activeModule === 'discounts' && (
            <DiscountEngineModule
              isBackendConfigured={isBackendConfigured}
              sandboxMode={sandboxMode}
              discountRules={discountRules}
              onSaveDiscountRule={(rule) => {
                setDiscountRules((prev) => [...prev, rule]);
                recordAudit(
                  'CREATE_DISCOUNT_RULE',
                  'Discount Engine',
                  rule.id,
                  `Created promotion rule "${rule.name}" (${rule.category})`
                );
              }}
              onToggleDiscountStatus={(ruleId) => {
                setDiscountRules((prev) =>
                  prev.map((r) =>
                    r.id === ruleId
                      ? { ...r, status: r.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }
                      : r
                  )
                );
                recordAudit(
                  'TOGGLE_DISCOUNT_STATUS',
                  'Discount Engine',
                  ruleId,
                  'Toggled rule status'
                );
              }}
            />
          )}

          {(activeModule === 'orders' ||
            activeModule === 'payments_refunds' ||
            activeModule === 'shipments_tracking' ||
            activeModule === 'returns_exchanges') && (
            <OrdersFulfillmentModule
              activeSubTab={activeModule}
              isBackendConfigured={isBackendConfigured}
              sandboxMode={sandboxMode}
              orders={orders}
              shipments={shipments}
              returns={returns}
              onTransitionOrderStatus={handleTransitionOrderStatus}
              onInitiateRefund={handleInitiateRefund}
              onSaveManualShipment={handleSaveManualShipment}
              onInspectReturnDecision={handleInspectReturnDecision}
            />
          )}

          {(activeModule === 'customers' ||
            activeModule === 'abandoned_carts' ||
            activeModule === 'reviews_moderation' ||
            activeModule === 'banners_cms' ||
            activeModule === 'pages_content' ||
            activeModule === 'seo_quality' ||
            activeModule === 'shipping_rules' ||
            activeModule === 'notifications' ||
            activeModule === 'analytics_reports') && (
            <OperationsGrowthModule
              activeSubTab={activeModule}
              isBackendConfigured={isBackendConfigured}
              sandboxMode={sandboxMode}
              products={products}
              orders={orders}
              onRecordAudit={recordAudit}
            />
          )}

          {(activeModule === 'store_settings' ||
            activeModule === 'owner_access_control' ||
            activeModule === 'audit_security' ||
            activeModule === 'api_contracts' ||
            activeModule === 'backup_recovery' ||
            activeModule === 'media_storage' ||
            activeModule === 'qa_verification') && (
            <SystemArchitectureModule
              activeSubTab={activeModule}
              isBackendConfigured={isBackendConfigured}
              sandboxMode={sandboxMode}
              session={session}
              auditLogs={auditLogs}
              onUpdateApiBaseUrl={(url) => {
                apiClient.setRuntimeBaseUrl(url);
                setIsBackendConfigured(apiClient.isConfigured());
                recordAudit(
                  'CONFIGURE_API_BASE_URL',
                  'API Client',
                  'VITE_API_BASE_URL',
                  `Updated runtime API Base URL to "${url || 'EMPTY'}"`
                );
              }}
              onRecordAudit={recordAudit}
            />
          )}
        </main>

        {/* Quiet Copyright & Architectural Boundary Footer */}
        <footer className="bg-white border-t border-slate-200 px-6 py-4 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            Dazzlinglooks.in Store Owner Administration Console · Beauty Begins Here
          </div>
          <div>
            Strict No-Fake-Data Policy Enforced · All 25 Modules Active
          </div>
        </footer>
      </div>

      {/* Owner Authentication & Session Boundary Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#3B0764]" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Owner-Only Authentication & Session Enforcement
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAuthModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                <strong>Authentication Status:</strong>{' '}
                <span className="font-mono font-semibold text-amber-700">
                  PENDING_BACKEND_AUTH_PROVIDER
                </span>
              </p>
              <p>
                Per Section 27 (Owner-Only Authentication and Access Control), this frontend does not contain a hardcoded production password, universal login, or client-side-only email bypass.
              </p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>
                  Point <code className="font-mono text-[#3B0764]">VITE_API_BASE_URL</code> to the shared Dazzlinglooks.in backend.
                </li>
                <li>
                  Implement <code className="font-mono text-[#3B0764]">POST /api/v1/admin/auth/session</code> on the backend with HTTP-only session cookies and CSRF tokens.
                </li>
                <li>
                  Enforce server-side role verification (<code className="font-mono">STORE_OWNER</code>) on every <code className="font-mono">/api/v1/admin/*</code> route.
                </li>
              </ol>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setAuthModalOpen(false);
                  setActiveModule('api_contracts');
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#3B0764] hover:bg-[#2a0548] rounded-lg cursor-pointer"
              >
                View Auth API Contract (AUTH-01)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
