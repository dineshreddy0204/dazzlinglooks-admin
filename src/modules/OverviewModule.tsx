import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Calendar,
  Clock,
  Download,
  FolderTree,
  Image,
  IndianRupee,
  Package,
  Percent,
  PieChart,
  Plus,
  ShoppingCart,
  Tag,
  Truck,
  Users,
} from 'lucide-react';
import { IntegrationBanner, EmptyOrUnavailableState } from '../components/IntegrationStatusBanner';
import {
  AuditLogEntry,
  Category,
  InventoryItem,
  ModuleId,
  Order,
  Product,
  ProductBatch,
  ReturnRequest,
  ShipmentRecord,
} from '../types/admin';

interface OverviewModuleProps {
  isBackendConfigured: boolean;
  sandboxMode: boolean;
  onToggleSandboxMode: () => void;
  onNavigateModule: (moduleId: ModuleId) => void;
  products: Product[];
  categories: Category[];
  orders: Order[];
  inventory: InventoryItem[];
  batches: ProductBatch[];
  shipments: ShipmentRecord[];
  returns: ReturnRequest[];
  auditLogs: AuditLogEntry[];
}

export const OverviewModule: React.FC<OverviewModuleProps> = ({
  isBackendConfigured,
  sandboxMode,
  onToggleSandboxMode,
  onNavigateModule,
  products,
  categories,
  orders,
  inventory,
  batches,
  shipments,
  returns,
  auditLogs,
}) => {
  const [dateRange, setDateRange] = useState<'7D' | '30D' | '90D' | 'YTD'>('30D');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Authoritative calculations strictly from current state (empty in live unconfigured mode; test fixtures only if sandboxMode is toggled)
  const hasVerifiedData = sandboxMode || orders.length > 0 || products.length > 0;
  const verifiedOrders = orders.filter((o) => o.status !== 'CANCELLED');
  const grossSales = verifiedOrders.reduce((acc, o) => acc + o.itemSubtotal, 0);
  const totalDiscounts = verifiedOrders.reduce(
    (acc, o) => acc + o.productDiscountTotal + o.quantityDiscountTotal + o.couponDiscountTotal,
    0
  );
  const refundsTotal = orders
    .filter((o) => o.paymentStatus === 'REFUNDED' || o.paymentStatus === 'PARTIALLY_REFUNDED')
    .reduce((acc, o) => acc + o.finalPayableAmount, 0);
  const netSales = Math.max(0, grossSales - totalDiscounts - refundsTotal);
  const shippingCollected = verifiedOrders.reduce((acc, o) => acc + o.shippingCharges, 0);

  const uniqueCustomerCount = new Set(orders.map((o) => o.customerId)).size;
  const lowStockAlerts = inventory.filter(
    (i) => i.availableQuantity > 0 && i.availableQuantity <= i.lowStockThreshold
  );
  const outOfStockAlerts = inventory.filter((i) => i.availableQuantity <= 0);
  const nearExpiryBatches = batches.filter(
    (b) => b.status === 'NEAR_EXPIRY' || b.status === 'EXPIRED'
  );
  const shipmentExceptions = shipments.filter(
    (s) =>
      s.shipmentStatus === 'EXCEPTION_DELAYED' ||
      s.shipmentStatus === 'FAILED_ATTEMPT' ||
      s.shipmentStatus === 'RTO_INITIATED'
  );
  const pendingReturns = returns.filter((r) => r.approvalStatus === 'PENDING_REVIEW');

  const handleExportSummary = () => {
    if (!sandboxMode && orders.length === 0) {
      setExportNotice(
        'Export aborted: No verified backend financial records available for the selected range.'
      );
      return;
    }

    const csvRows = [
      ['Metric', 'Definition', 'Amount (INR)', 'Source Status'],
      [
        'Gross Sales',
        'Sum of item subtotals prior to discounts, shipping, and taxes',
        grossSales.toFixed(2),
        sandboxMode ? 'TEST_FIXTURE' : 'VERIFIED_BACKEND',
      ],
      [
        'Total Discounts',
        'Combined product, quantity-tier, and coupon discounts applied',
        totalDiscounts.toFixed(2),
        sandboxMode ? 'TEST_FIXTURE' : 'VERIFIED_BACKEND',
      ],
      [
        'Processed Refunds',
        'Confirmed gateway refunds deducted from gross revenue',
        refundsTotal.toFixed(2),
        sandboxMode ? 'TEST_FIXTURE' : 'VERIFIED_BACKEND',
      ],
      [
        'Net Merchandise Sales',
        'Gross Sales minus Total Discounts minus Processed Refunds',
        netSales.toFixed(2),
        sandboxMode ? 'TEST_FIXTURE' : 'VERIFIED_BACKEND',
      ],
      [
        'Shipping Charges Collected',
        'Delivery fees billed to customers',
        shippingCollected.toFixed(2),
        sandboxMode ? 'TEST_FIXTURE' : 'VERIFIED_BACKEND',
      ],
    ];

    const csvString = csvRows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dazzlinglooks-financial-summary-${dateRange.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExportNotice(`Exported financial summary CSV for period ${dateRange}.`);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Welcome Back, Store Owner
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dazzlinglooks.in Store Administration Console · Zero fabricated metrics or unverified provider data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['7D', '30D', '90D', 'YTD'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDateRange(range)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  dateRange === range
                    ? 'bg-white text-[#3B0764] shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleSandboxMode}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              sandboxMode
                ? 'bg-[#FF6B00]/10 border-[#FF6B00] text-[#3B0764] font-semibold'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {sandboxMode ? 'Purge Test Fixtures' : 'Load Isolated Test Fixtures'}
          </button>

          <button
            type="button"
            onClick={handleExportSummary}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#E11D48] hover:bg-[#be123c] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      <IntegrationBanner
        moduleName="Dashboard Overview & Real-Time Store Telemetry"
        endpointPath="GET /api/v1/admin/analytics/summary"
        isBackendConfigured={isBackendConfigured}
        sandboxActive={sandboxMode}
        externalDependency="Shared PostgreSQL Order, Inventory & Batch Tables"
      />

      {exportNotice && (
        <div className="bg-slate-900 text-white text-xs px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{exportNotice}</span>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            className="text-slate-300 hover:text-white underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Row: 4 Primary KPI Cards + Branded Store Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Net Revenue */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Net Merchandise Sales</span>
            <div className="w-8 h-8 rounded-full bg-rose-50 text-[#E11D48] flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
              {hasVerifiedData
                ? `₹${netSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                : isBackendConfigured
                ? 'Data Unavailable'
                : 'Integration Pending'}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            {hasVerifiedData
              ? `Gross ₹${grossSales.toFixed(0)} · Disc -₹${totalDiscounts.toFixed(0)}`
              : 'Awaiting verified backend ledger'}
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Orders</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
              {hasVerifiedData
                ? orders.length
                : isBackendConfigured
                ? 'Data Unavailable'
                : 'Integration Pending'}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            {hasVerifiedData
              ? `Confirmed/Active: ${verifiedOrders.length}`
              : 'GET /api/v1/admin/orders'}
          </div>
        </div>

        {/* Card 3: Total Customers */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Verified Customers</span>
            <div className="w-8 h-8 rounded-full bg-purple-50 text-[#3B0764] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
              {hasVerifiedData
                ? uniqueCustomerCount
                : isBackendConfigured
                ? 'Data Unavailable'
                : 'Integration Pending'}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            {hasVerifiedData ? 'PII masked by default' : 'GET /api/v1/admin/customers'}
          </div>
        </div>

        {/* Card 4: Total Products */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Catalogue Products</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 text-[#FF6B00] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
              {hasVerifiedData
                ? products.length
                : isBackendConfigured
                ? 'Data Unavailable'
                : 'Integration Pending'}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            {hasVerifiedData
              ? `${products.reduce((a, p) => a + p.variants.length, 0)} purchasable variants`
              : 'GET /api/v1/admin/products'}
          </div>
        </div>

        {/* Card 5: Branded Beauty Begins Here Showcase Card */}
        <div className="bg-gradient-to-br from-[#24053E] via-[#3B0764] to-[#1A042D] text-white rounded-xl p-4 flex flex-col justify-between border border-[#D4AF37]/30">
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-[#F3E5AB]">
              DAZZLINGLOOKS.IN
            </div>
            <div
              className="text-lg font-bold text-white mt-0.5"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Beauty Begins Here
            </div>
            <p className="text-[11px] text-slate-200 mt-1 leading-relaxed">
              Manage verified skincare catalogue, FEFO batches, promotions, and courier AWB tracking.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateModule('products')}
            className="mt-3 w-full py-1.5 px-3 text-xs font-semibold text-[#24053E] bg-[#F3E5AB] hover:bg-[#D4AF37] rounded-lg transition-colors cursor-pointer"
          >
            Open Product Catalogue
          </button>
        </div>
      </div>

      {/* Explicit Financial Metric Definitions Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Authoritative Financial Ledger Definitions ({dateRange})
            </h2>
            <p className="text-xs text-slate-500">
              Distinguishes Gross Sales, Discounts, Confirmed Refunds, Net Merchandise Sales, Shipping Costs, Product COGS, and Profit.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {sandboxMode
              ? 'SOURCE: ISOLATED_TEST_FIXTURES'
              : isBackendConfigured
              ? 'SOURCE: AWAITING_SERVER_RESPONSE'
              : 'SOURCE: INTEGRATION_PENDING'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#FAF9F6] border border-slate-200/80">
            <div className="text-slate-500 mb-1">1. Gross Sales</div>
            <div className="text-base font-bold font-mono tabular-nums text-slate-900">
              {hasVerifiedData ? `₹${grossSales.toFixed(2)}` : '—'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#FAF9F6] border border-slate-200/80">
            <div className="text-slate-500 mb-1">2. Discounts</div>
            <div className="text-base font-bold font-mono tabular-nums text-[#FF6B00]">
              {hasVerifiedData ? `-₹${totalDiscounts.toFixed(2)}` : '—'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#FAF9F6] border border-slate-200/80">
            <div className="text-slate-500 mb-1">3. Refunds</div>
            <div className="text-base font-bold font-mono tabular-nums text-red-600">
              {hasVerifiedData ? `-₹${refundsTotal.toFixed(2)}` : '—'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#FAF9F6] border border-slate-200/80">
            <div className="text-slate-500 mb-1">4. Net Sales</div>
            <div className="text-base font-bold font-mono tabular-nums text-[#3B0764]">
              {hasVerifiedData ? `₹${netSales.toFixed(2)}` : '—'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#FAF9F6] border border-slate-200/80">
            <div className="text-slate-500 mb-1">5. Shipping Billed</div>
            <div className="text-base font-bold font-mono tabular-nums text-slate-900">
              {hasVerifiedData ? `₹${shippingCollected.toFixed(2)}` : '—'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#FAF9F6] border border-slate-200/80">
            <div className="text-slate-500 mb-1">6. Verified Profit</div>
            <div className="text-xs font-semibold font-mono text-slate-600">
              Pending COGS Ledger
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Excludes unrecorded ad/gateway fees
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Sales Overview Chart + Top Categories + Store Operational Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Overview Chart Container */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Sales Overview</h3>
              <p className="text-xs text-slate-500">Time-series revenue & order velocity</p>
            </div>
            <BarChart3 className="w-4 h-4 text-[#E11D48]" />
          </div>

          {!hasVerifiedData ? (
            <div className="py-8 text-center space-y-2 bg-[#FAF9F6] rounded-lg border border-slate-200/70 p-4">
              <div className="text-xs font-semibold text-slate-800">
                {isBackendConfigured ? 'Data Unavailable' : 'Chart Integration Pending'}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Per the No-Fake-Data Policy, random or illustrative chart points are never generated. Connect <code className="font-mono">/api/v1/admin/analytics/summary</code> to render live time-series points.
              </p>
            </div>
          ) : (
            <div className="space-y-3 my-2">
              {orders.map((ord) => (
                <div key={ord.id} className="space-y-1 text-xs">
                  <div className="flex justify-between font-mono">
                    <span>{new Date(ord.createdAt).toLocaleDateString()} ({ord.orderNumber})</span>
                    <span className="font-bold text-[#3B0764]">₹{ord.finalPayableAmount.toFixed(2)}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#E11D48] rounded-full w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Performance */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Category Performance</h3>
              <p className="text-xs text-slate-500">Product distribution across categories</p>
            </div>
            <PieChart className="w-4 h-4 text-[#3B0764]" />
          </div>

          {categories.length === 0 ? (
            <div className="py-8 text-center space-y-2 bg-[#FAF9F6] rounded-lg border border-slate-200/70 p-4">
              <div className="text-xs font-semibold text-slate-800">
                {isBackendConfigured ? 'No Categories Found' : 'Category Breakdown Pending'}
              </div>
              <p className="text-[11px] text-slate-500">
                Category percentages are computed strictly from verified backend records.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => {
                const count = products.filter((p) => p.categoryId === cat.id).length;
                const pct = products.length > 0 ? Math.round((count / products.length) * 100) : 0;
                return (
                  <div key={cat.id} className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-800">{cat.name}</span>
                      <span className="font-mono tabular-nums text-slate-600">
                        {count} product(s) · {pct}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#3B0764] rounded-full"
                        style={{ width: `${Math.max(pct, 8)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Operational & Exception Summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Operational Health & Alerts</h3>
            <Bell className="w-4 h-4 text-[#FF6B00]" />
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-600">Low-Stock Variants</span>
              <span className="font-mono font-bold text-[#FF6B00]">{lowStockAlerts.length}</span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-600">Out-of-Stock Variants</span>
              <span className="font-mono font-bold text-red-600">{outOfStockAlerts.length}</span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-600">Near-Expiry / Expired Batches</span>
              <span className="font-mono font-bold text-amber-700">{nearExpiryBatches.length}</span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-600">Shipment Exceptions / RTO</span>
              <span className="font-mono font-bold text-slate-900">{shipmentExceptions.length}</span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-600">Pending Return Inspections</span>
              <span className="font-mono font-bold text-[#3B0764]">{pendingReturns.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Orders + Best-Selling Products + Low-Stock & Batch Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Recent Orders {sandboxMode && '(Test Fixtures)'}
              </h3>
              <p className="text-xs text-slate-500">
                Verified order status, payment verification, and payable totals
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateModule('orders')}
              className="text-xs font-semibold text-[#E11D48] hover:underline cursor-pointer"
            >
              View All Orders →
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="p-6">
              <EmptyOrUnavailableState
                state={isBackendConfigured ? 'EMPTY_RECORDS' : 'INTEGRATION_PENDING'}
                title="No Verified Orders to Display"
                description="Connect VITE_API_BASE_URL to fetch live customer orders or click 'Load Isolated Test Fixtures' in the top bar to test order workflows."
                endpoint="GET /api/v1/admin/orders"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-4">Order #</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4">Items</th>
                    <th className="py-2.5 px-4">Payment · Status</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {orders.slice(0, 5).map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-[#3B0764]">
                        {ord.orderNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{ord.customerName}</td>
                      <td className="py-3 px-4 text-slate-600">{ord.items.length} item(s)</td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="font-semibold">{ord.paymentStatus}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{ord.status}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        ₹{ord.finalPayableAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Best-Selling Products & Low-Stock / Audit Summary */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Best-Selling Products</h3>
              <button
                type="button"
                onClick={() => onNavigateModule('products')}
                className="text-xs font-semibold text-[#E11D48] hover:underline cursor-pointer"
              >
                View All →
              </button>
            </div>
            {products.filter((p) => p.isBestSeller).length === 0 ? (
              <p className="text-xs text-slate-500">
                No verified best-selling products available yet.
              </p>
            ) : (
              <div className="space-y-2.5 text-xs">
                {products
                  .filter((p) => p.isBestSeller)
                  .map((p, idx) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-lg bg-[#FAF9F6] border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono font-bold text-[#FF6B00] mr-2">#{idx + 1}</span>
                        <span className="font-semibold text-slate-900">{p.name}</span>
                      </div>
                      <span className="font-mono tabular-nums font-semibold text-[#3B0764]">
                        ₹{(p.salePrice || p.regularPrice).toFixed(0)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Low Stock & FEFO Batch Alerts</h3>
              <button
                type="button"
                onClick={() => onNavigateModule('inventory')}
                className="text-xs font-semibold text-[#E11D48] hover:underline cursor-pointer"
              >
                Inventory →
              </button>
            </div>
            {lowStockAlerts.length === 0 && nearExpiryBatches.length === 0 ? (
              <p className="text-xs text-slate-500">
                No low-stock SKUs or near-expiry batches flagged.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {lowStockAlerts.map((item) => (
                  <div
                    key={item.variantId}
                    className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{item.productName}</div>
                      <div className="text-[11px] text-slate-500">{item.variantName}</div>
                    </div>
                    <span className="font-mono font-bold text-[#E11D48]">
                      Stock: {item.availableQuantity} left
                    </span>
                  </div>
                ))}
                {nearExpiryBatches.map((b) => (
                  <div
                    key={b.id}
                    className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">Lot {b.batchNumber}</div>
                      <div className="text-[11px] text-slate-500">Exp: {b.expiryDate}</div>
                    </div>
                    <span className="font-mono font-semibold text-amber-800">{b.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Bar (Inspired by Reference Design) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="text-xs font-bold text-slate-800 mb-3">Quick Actions</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            type="button"
            onClick={() => onNavigateModule('products')}
            className="p-3 rounded-xl border border-slate-200 hover:border-[#E11D48] bg-[#FAF9F6] text-left transition-colors cursor-pointer"
          >
            <Package className="w-4 h-4 text-[#E11D48] mb-1.5" />
            <div className="text-xs font-semibold text-slate-900">Add Product</div>
            <div className="text-[11px] text-slate-500">Create new SKU</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateModule('categories_brands')}
            className="p-3 rounded-xl border border-slate-200 hover:border-[#E11D48] bg-[#FAF9F6] text-left transition-colors cursor-pointer"
          >
            <FolderTree className="w-4 h-4 text-[#3B0764] mb-1.5" />
            <div className="text-xs font-semibold text-slate-900">Add Category</div>
            <div className="text-[11px] text-slate-500">Manage hierarchy</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateModule('categories_brands')}
            className="p-3 rounded-xl border border-slate-200 hover:border-[#E11D48] bg-[#FAF9F6] text-left transition-colors cursor-pointer"
          >
            <Tag className="w-4 h-4 text-[#FF6B00] mb-1.5" />
            <div className="text-xs font-semibold text-slate-900">Add Brand</div>
            <div className="text-[11px] text-slate-500">Register brand</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateModule('discounts')}
            className="p-3 rounded-xl border border-slate-200 hover:border-[#E11D48] bg-[#FAF9F6] text-left transition-colors cursor-pointer"
          >
            <Percent className="w-4 h-4 text-[#E11D48] mb-1.5" />
            <div className="text-xs font-semibold text-slate-900">Create Offer</div>
            <div className="text-[11px] text-slate-500">Discounts & coupons</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateModule('banners_cms')}
            className="p-3 rounded-xl border border-slate-200 hover:border-[#E11D48] bg-[#FAF9F6] text-left transition-colors cursor-pointer"
          >
            <Image className="w-4 h-4 text-[#3B0764] mb-1.5" />
            <div className="text-xs font-semibold text-slate-900">Upload Banner</div>
            <div className="text-[11px] text-slate-500">Homepage hero</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateModule('orders')}
            className="p-3 rounded-xl border border-slate-200 hover:border-[#E11D48] bg-[#FAF9F6] text-left transition-colors cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 text-[#FF6B00] mb-1.5" />
            <div className="text-xs font-semibold text-slate-900">View Orders</div>
            <div className="text-[11px] text-slate-500">Fulfillment & AWB</div>
          </button>
        </div>
      </div>
    </div>
  );
};
