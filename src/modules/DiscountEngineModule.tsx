import React, { useState } from 'react';
import { Calculator, CheckCircle2, Plus, ShieldAlert, Tag, XCircle } from 'lucide-react';
import { DiscountRule, QuantityDiscountTier } from '../types/admin';
import { IntegrationBanner, EmptyOrUnavailableState } from '../components/IntegrationStatusBanner';
import { calculateTransparentCheckoutBreakdown } from '../utils/businessRules';

interface DiscountEngineModuleProps {
  isBackendConfigured: boolean;
  sandboxMode: boolean;
  discountRules: DiscountRule[];
  onSaveDiscountRule: (rule: DiscountRule) => void;
  onToggleDiscountStatus: (ruleId: string) => void;
}

export const DiscountEngineModule: React.FC<DiscountEngineModuleProps> = ({
  isBackendConfigured,
  sandboxMode,
  discountRules,
  onSaveDiscountRule,
  onToggleDiscountStatus,
}) => {
  // New Discount Rule Form
  const [name, setName] = useState('');
  const [category, setCategory] = useState<DiscountRule['category']>('COUPON_CODE');
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<DiscountRule['discountType']>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [minOrderValue, setMinOrderValue] = useState<number>(999);
  const [priceFloor, setPriceFloor] = useState<number>(299);
  const [allowStacking, setAllowStacking] = useState<boolean>(false);
  const [newCustomersOnly, setNewCustomersOnly] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('2026-10-22T00:00');
  const [endDate, setEndDate] = useState<string>('2026-12-31T23:59');
  const [formError, setFormError] = useState<string | null>(null);

  // Interactive Server-Recalculation Simulator State
  const [simUnitPrice, setSimUnitPrice] = useState<number>(850);
  const [simQty, setSimQty] = useState<number>(3);
  const [simProdDiscPct, setSimProdDiscPct] = useState<number>(10);
  const [simCouponCode, setSimCouponCode] = useState<string>('GLOW15');
  const [simCouponAllowStack, setSimCouponAllowStack] = useState<boolean>(false);
  const [simMinOrder, setSimMinOrder] = useState<number>(1200);
  const [simPriceFloorPerUnit, setSimPriceFloorPerUnit] = useState<number>(600);

  const sampleTiers: QuantityDiscountTier[] = [
    { minQuantity: 2, maxQuantity: 3, discountType: 'PERCENTAGE', discountValue: 5 },
    { minQuantity: 4, maxQuantity: null, discountType: 'PERCENTAGE', discountValue: 12 },
  ];

  const breakdown = calculateTransparentCheckoutBreakdown({
    unitPrice: simUnitPrice,
    quantity: simQty,
    productDiscountPercent: simProdDiscPct,
    quantityTiers: sampleTiers,
    couponCode: simCouponCode.trim()
      ? {
          code: simCouponCode.trim().toUpperCase(),
          type: 'PERCENTAGE',
          value: 15,
          minOrderValue: simMinOrder,
          allowStacking: simCouponAllowStack,
        }
      : undefined,
    priceFloorPerUnit: simPriceFloorPerUnit,
    baseShippingCharge: 79,
    freeShippingThreshold: 1499,
    gstRatePercent: 18,
  });

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Promotion / rule name is required.');
      return;
    }
    if (category === 'COUPON_CODE' && !code.trim()) {
      setFormError('Coupon code string is required for coupon rules.');
      return;
    }
    if (discountType === 'PERCENTAGE' && (discountValue <= 0 || discountValue > 80)) {
      setFormError('Percentage discount must be between 1% and 80%.');
      return;
    }
    if (priceFloor <= 0) {
      setFormError('A positive price floor (₹) is mandatory to prevent accidental negative/zero pricing.');
      return;
    }

    const rule: DiscountRule = {
      id: `disc-${Date.now()}`,
      name: name.trim(),
      category,
      code: category === 'COUPON_CODE' ? code.trim().toUpperCase() : undefined,
      discountType,
      discountValue,
      minOrderValue,
      priceFloor,
      newCustomersOnly,
      allowStacking,
      priority: discountRules.length + 1,
      startDate,
      endDate,
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
      quantityTiers: category === 'QUANTITY_TIER' ? sampleTiers : undefined,
    };

    onSaveDiscountRule(rule);
    setName('');
    setCode('');
  };

  return (
    <div className="space-y-6">
      <IntegrationBanner
        moduleName="Automatic Discount Engine, Stacking Priority & Price-Floor Verifier"
        endpointPath="POST /api/v1/admin/discounts/evaluate & /api/v1/admin/discounts"
        isBackendConfigured={isBackendConfigured}
        sandboxActive={sandboxMode}
        externalDependency="Server-Side Authoritative Checkout Recalculation Engine"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Configured Rules & New Rule Builder */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Create Promotion, Quantity Tier, or Coupon Rule
              </h3>
              <p className="text-xs text-slate-500">
                Supports quantity-based tiers, product/category discounts, coupon codes, scheduled promotions (Asia/Kolkata), and stacking exclusions.
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rule Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Festive Skincare Bundle Tier"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rule Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DiscountRule['category'])}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="COUPON_CODE">Coupon Code</option>
                    <option value="QUANTITY_TIER">Quantity-Based Tier Discount</option>
                    <option value="PRODUCT_SPECIFIC">Product-Specific Discount</option>
                    <option value="CATEGORY_SPECIFIC">Category-Specific Discount</option>
                    <option value="SCHEDULED_PROMO">Scheduled Flash Promotion</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Coupon Code {category === 'COUPON_CODE' && '*'}
                  </label>
                  <input
                    type="text"
                    disabled={category !== 'COUPON_CODE'}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="DAZZLE20"
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) =>
                      setDiscountType(e.target.value as DiscountRule['discountType'])
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                    <option value="FREE_SHIPPING">Free Shipping</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Value</label>
                  <input
                    type="number"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Min Order Value (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mandatory Price Floor (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={priceFloor}
                    onChange={(e) => setPriceFloor(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Start Timestamp (Asia/Kolkata)
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Expiry Timestamp (Asia/Kolkata)
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowStacking}
                      onChange={(e) => setAllowStacking(e.target.checked)}
                    />
                    <span className="font-medium text-slate-700">
                      Allow Stacking with Product/Quantity Discounts
                    </span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCustomersOnly}
                      onChange={(e) => setNewCustomersOnly(e.target.checked)}
                    />
                    <span className="font-medium text-slate-700">New Customers Only</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-[#3B0764] hover:bg-[#2a0548] rounded-lg cursor-pointer"
                >
                  + Save Discount Rule
                </button>
              </div>
            </form>
          </div>

          {/* Configured Discount Rules Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">
                Configured Promotions & Stacking Priority Matrix ({discountRules.length})
              </h3>
            </div>

            {discountRules.length === 0 ? (
              <div className="p-6">
                <EmptyOrUnavailableState
                  state={isBackendConfigured ? 'EMPTY_RECORDS' : 'INTEGRATION_PENDING'}
                  title="No Active Discount Rules Loaded"
                  description="Create a discount rule above or load test fixtures to inspect priority ordering and stacking behavior."
                  endpoint="GET /api/v1/admin/discounts"
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                      <th className="py-2.5 px-4">Priority · Name</th>
                      <th className="py-2.5 px-4">Type & Value</th>
                      <th className="py-2.5 px-4">Floor & Min Order</th>
                      <th className="py-2.5 px-4">Stacking</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {discountRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            #{rule.priority} · {rule.name}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {rule.category} {rule.code ? `(${rule.code})` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-[#3B0764]">
                          {rule.discountType === 'PERCENTAGE'
                            ? `${rule.discountValue}% OFF`
                            : rule.discountType === 'FIXED_AMOUNT'
                            ? `₹${rule.discountValue} OFF`
                            : 'FREE SHIPPING'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          Min: ₹{rule.minOrderValue} · Floor: ₹{rule.priceFloor}
                        </td>
                        <td className="py-3 px-4">
                          {rule.allowStacking ? (
                            <span className="text-emerald-700 font-medium">Stackable</span>
                          ) : (
                            <span className="text-slate-600">Exclusive (No Double Discount)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{rule.status}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onToggleDiscountStatus(rule.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-[#3B0764] bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                          >
                            {rule.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Transparent Checkout Price Breakdown & Stacking Verifier */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calculator className="w-4 h-4 text-[#FF6B00] shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Checkout Price Breakdown & Floor Verifier
              </h3>
              <p className="text-[11px] text-slate-500">
                Tests server-side recalculation, stacking rules, and price-floor safeguards.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-600 mb-1">Unit Price (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={simUnitPrice}
                  onChange={(e) => setSimUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Quantity (Tiers: 2+, 4+)</label>
                <input
                  type="number"
                  min="1"
                  value={simQty}
                  onChange={(e) => setSimQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-600 mb-1">Product Promo (%)</label>
                <input
                  type="number"
                  min="0"
                  max="70"
                  value={simProdDiscPct}
                  onChange={(e) => setSimProdDiscPct(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Price Floor / Unit (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={simPriceFloorPerUnit}
                  onChange={(e) => setSimPriceFloorPerUnit(parseFloat(e.target.value) || 1)}
                  className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-600 mb-1">Test Coupon (15%)</label>
                <input
                  type="text"
                  value={simCouponCode}
                  onChange={(e) => setSimCouponCode(e.target.value)}
                  className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Coupon Min Order (₹)</label>
                <input
                  type="number"
                  value={simMinOrder}
                  onChange={(e) => setSimMinOrder(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-1.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={simCouponAllowStack}
                onChange={(e) => setSimCouponAllowStack(e.target.checked)}
              />
              <span className="text-slate-700 font-medium">
                Allow Coupon Stacking with Active Product/Tier Discounts
              </span>
            </label>
          </div>

          {/* Transparent Breakdown Ledger */}
          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Item Subtotal:</span>
              <span className="font-mono tabular-nums font-semibold">
                ₹{breakdown.itemSubtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Eligible Product Discount:</span>
              <span className="font-mono tabular-nums">
                -₹{breakdown.eligibleProductDiscount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Eligible Quantity-Tier Discount:</span>
              <span className="font-mono tabular-nums">
                -₹{breakdown.eligibleQuantityDiscount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Coupon Discount:</span>
              <span className="font-mono tabular-nums">-₹{breakdown.couponDiscount.toFixed(2)}</span>
            </div>
            {breakdown.priceFloorAdjustment > 0 && (
              <div className="flex justify-between text-[#FF6B00] font-semibold">
                <span>Price Floor Protection Clamp:</span>
                <span className="font-mono tabular-nums">
                  +₹{breakdown.priceFloorAdjustment.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="text-slate-600">Shipping Charges:</span>
              <span className="font-mono tabular-nums">
                {breakdown.shippingCharges === 0
                  ? 'FREE (₹0.00)'
                  : `₹${breakdown.shippingCharges.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">GST (18%):</span>
              <span className="font-mono tabular-nums">₹{breakdown.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-300 text-sm font-bold text-[#3B0764]">
              <span>Final Payable Amount:</span>
              <span className="font-mono tabular-nums">
                ₹{breakdown.finalPayableAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Explicit Applied / Rejected Explanation Log */}
          <div className="space-y-1.5 text-[11px]">
            <div className="font-semibold text-slate-700">Rule Decision Audit:</div>
            {breakdown.appliedRulesLog.map((msg, i) => (
              <div key={i} className="text-emerald-700 flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{msg}</span>
              </div>
            ))}
            {breakdown.rejectedRulesLog.map((msg, i) => (
              <div key={i} className="text-red-600 flex items-start gap-1.5">
                <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
