import { OrderStatus, QuantityDiscountTier } from '../types/admin';

/**
 * Pure, deterministic business rule validators and engines for Dazzlinglooks.in.
 * Used across the admin UI and verified via the built-in QA test suite.
 */

// 1. Order Lifecycle State Transition Matrix
export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

export function isValidOrderTransition(current: OrderStatus, next: OrderStatus): {
  valid: boolean;
  reason?: string;
} {
  if (current === next) {
    return { valid: false, reason: `Order is already in ${current} status.` };
  }
  const allowed = ALLOWED_ORDER_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    return {
      valid: false,
      reason: `Invalid state transition from ${current} to ${next}. Allowed transitions from ${current}: ${
        allowed.length ? allowed.join(', ') : 'None (terminal state)'
      }.`,
    };
  }
  return { valid: true };
}

// 2. Inventory Consistency & Adjustment Validator
export function validateStockAdjustment(params: {
  currentStockOnHand: number;
  reservedQuantity: number;
  deltaQuantity: number;
  allowBackorders: boolean;
  reasonCode: string;
  notes: string;
}): {
  valid: boolean;
  newStockOnHand: number;
  newAvailableQuantity: number;
  error?: string;
} {
  const { currentStockOnHand, reservedQuantity, deltaQuantity, allowBackorders, reasonCode, notes } = params;

  if (!reasonCode || reasonCode.trim() === '') {
    return {
      valid: false,
      newStockOnHand: currentStockOnHand,
      newAvailableQuantity: currentStockOnHand - reservedQuantity,
      error: 'A mandatory reason code is required for all stock adjustments.',
    };
  }

  if (deltaQuantity === 0) {
    return {
      valid: false,
      newStockOnHand: currentStockOnHand,
      newAvailableQuantity: currentStockOnHand - reservedQuantity,
      error: 'Adjustment delta cannot be zero.',
    };
  }

  if (Math.abs(deltaQuantity) >= 50 && (!notes || notes.trim().length < 10)) {
    return {
      valid: false,
      newStockOnHand: currentStockOnHand,
      newAvailableQuantity: currentStockOnHand - reservedQuantity,
      error: 'Adjustments of 50+ units require an explanatory audit note (minimum 10 characters).',
    };
  }

  const newStockOnHand = currentStockOnHand + deltaQuantity;
  const newAvailableQuantity = newStockOnHand - reservedQuantity;

  if (!allowBackorders && newAvailableQuantity < 0) {
    return {
      valid: false,
      newStockOnHand,
      newAvailableQuantity,
      error: `Negative available stock (${newAvailableQuantity}) is prohibited unless backorders are explicitly enabled for this SKU.`,
    };
  }

  return {
    valid: true,
    newStockOnHand,
    newAvailableQuantity,
  };
}

// 3. FEFO (First-Expired, First-Out) Batch Sorting & Expiry Quarantine Engine
export interface BatchInput {
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  quantityRemaining: number;
  quarantined?: boolean;
}

export function evaluateBatchFEFO(
  batches: BatchInput[],
  referenceDateIso: string = new Date().toISOString()
): {
  batchNumber: string;
  expiryDate: string;
  daysUntilExpiry: number;
  status: 'ACTIVE_SELLABLE' | 'NEAR_EXPIRY' | 'EXPIRED' | 'QUARANTINED';
  pickEligible: boolean;
  fefoRank: number | null;
}[] {
  const refTime = new Date(referenceDateIso).getTime();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const evaluated = batches.map((b) => {
    const expTime = new Date(b.expiryDate).getTime();
    const daysUntilExpiry = Math.ceil((expTime - refTime) / MS_PER_DAY);

    let status: 'ACTIVE_SELLABLE' | 'NEAR_EXPIRY' | 'EXPIRED' | 'QUARANTINED' = 'ACTIVE_SELLABLE';
    if (b.quarantined) {
      status = 'QUARANTINED';
    } else if (daysUntilExpiry <= 0) {
      status = 'EXPIRED';
    } else if (daysUntilExpiry <= 60) {
      status = 'NEAR_EXPIRY';
    }

    const pickEligible =
      (status === 'ACTIVE_SELLABLE' || status === 'NEAR_EXPIRY') && b.quantityRemaining > 0;

    return {
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      daysUntilExpiry,
      status,
      pickEligible,
      fefoRank: null as number | null,
    };
  });

  // Sort eligible batches by earliest expiry date first (FEFO)
  const eligibleSorted = [...evaluated]
    .filter((item) => item.pickEligible)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  eligibleSorted.forEach((item, idx) => {
    item.fefoRank = idx + 1;
  });

  return evaluated.map((item) => {
    const match = eligibleSorted.find((e) => e.batchNumber === item.batchNumber);
    return match ? { ...item, fefoRank: match.fefoRank } : item;
  });
}

// 4. Transparent Discount & Price Floor Calculation Engine
export interface CartCalculationInput {
  unitPrice: number;
  quantity: number;
  productDiscountPercent: number; // e.g., 10 for 10%
  quantityTiers: QuantityDiscountTier[];
  couponCode?: {
    code: string;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
    value: number;
    minOrderValue: number;
    allowStacking: boolean;
  };
  priceFloorPerUnit: number;
  baseShippingCharge: number;
  freeShippingThreshold: number;
  gstRatePercent: number; // e.g., 18%
}

export interface PriceBreakdownResult {
  itemSubtotal: number;
  eligibleProductDiscount: number;
  eligibleQuantityDiscount: number;
  couponDiscount: number;
  priceFloorAdjustment: number;
  netMerchandiseTotal: number;
  shippingCharges: number;
  taxAmount: number;
  finalPayableAmount: number;
  appliedRulesLog: string[];
  rejectedRulesLog: string[];
}

export function calculateTransparentCheckoutBreakdown(
  input: CartCalculationInput
): PriceBreakdownResult {
  const appliedRulesLog: string[] = [];
  const rejectedRulesLog: string[] = [];

  const itemSubtotal = Math.round(input.unitPrice * input.quantity * 100) / 100;

  // Step 1: Product-specific discount
  let eligibleProductDiscount = 0;
  if (input.productDiscountPercent > 0) {
    eligibleProductDiscount =
      Math.round(itemSubtotal * (input.productDiscountPercent / 100) * 100) / 100;
    appliedRulesLog.push(
      `Product Discount (${input.productDiscountPercent}%): -₹${eligibleProductDiscount.toFixed(2)}`
    );
  }

  // Step 2: Quantity-tier discount
  let eligibleQuantityDiscount = 0;
  const matchingTier = input.quantityTiers.find(
    (t) =>
      input.quantity >= t.minQuantity &&
      (t.maxQuantity === null || input.quantity <= t.maxQuantity)
  );
  if (matchingTier) {
    const baseAfterProd = itemSubtotal - eligibleProductDiscount;
    if (matchingTier.discountType === 'PERCENTAGE') {
      eligibleQuantityDiscount =
        Math.round(baseAfterProd * (matchingTier.discountValue / 100) * 100) / 100;
      appliedRulesLog.push(
        `Quantity Tier (${matchingTier.minQuantity}+ units @ ${matchingTier.discountValue}%): -₹${eligibleQuantityDiscount.toFixed(2)}`
      );
    } else {
      eligibleQuantityDiscount = Math.min(baseAfterProd, matchingTier.discountValue);
      appliedRulesLog.push(
        `Quantity Tier (${matchingTier.minQuantity}+ units flat): -₹${eligibleQuantityDiscount.toFixed(2)}`
      );
    }
  }

  // Step 3: Coupon evaluation with stacking & minimum order checks
  let couponDiscount = 0;
  const subtotalBeforeCoupon = itemSubtotal - eligibleProductDiscount - eligibleQuantityDiscount;
  const hasPriorDiscounts = eligibleProductDiscount > 0 || eligibleQuantityDiscount > 0;

  if (input.couponCode) {
    const c = input.couponCode;
    if (subtotalBeforeCoupon < c.minOrderValue) {
      rejectedRulesLog.push(
        `Coupon "${c.code}" rejected: Subtotal ₹${subtotalBeforeCoupon.toFixed(2)} is below minimum order value ₹${c.minOrderValue.toFixed(2)}.`
      );
    } else if (hasPriorDiscounts && !c.allowStacking) {
      rejectedRulesLog.push(
        `Coupon "${c.code}" rejected: Coupon is configured as non-stackable with active product/quantity promotions.`
      );
    } else {
      if (c.type === 'PERCENTAGE') {
        couponDiscount = Math.round(subtotalBeforeCoupon * (c.value / 100) * 100) / 100;
        appliedRulesLog.push(`Coupon "${c.code}" (${c.value}%): -₹${couponDiscount.toFixed(2)}`);
      } else if (c.type === 'FIXED_AMOUNT') {
        couponDiscount = Math.min(subtotalBeforeCoupon, c.value);
        appliedRulesLog.push(`Coupon "${c.code}" (Flat ₹${c.value}): -₹${couponDiscount.toFixed(2)}`);
      } else if (c.type === 'FREE_SHIPPING') {
        appliedRulesLog.push(`Coupon "${c.code}": Free shipping unlocked.`);
      }
    }
  }

  // Step 4: Enforce configured price floor
  const minimumAllowedTotal = Math.round(input.priceFloorPerUnit * input.quantity * 100) / 100;
  let rawNetTotal = subtotalBeforeCoupon - couponDiscount;
  let priceFloorAdjustment = 0;

  if (rawNetTotal < minimumAllowedTotal) {
    priceFloorAdjustment = Math.round((minimumAllowedTotal - rawNetTotal) * 100) / 100;
    rawNetTotal = minimumAllowedTotal;
    appliedRulesLog.push(
      `Price Floor Safeguard: Total clamped to minimum floor ₹${minimumAllowedTotal.toFixed(2)} (+₹${priceFloorAdjustment.toFixed(2)} cap adjustment).`
    );
  }

  // Step 5: Shipping calculation
  let shippingCharges = input.baseShippingCharge;
  const freeShipCouponActive =
    input.couponCode?.type === 'FREE_SHIPPING' &&
    rejectedRulesLog.length === 0;

  if (rawNetTotal >= input.freeShippingThreshold || freeShipCouponActive) {
    shippingCharges = 0;
  }

  // Step 6: Tax (GST) calculation
  const taxAmount = Math.round(rawNetTotal * (input.gstRatePercent / 100) * 100) / 100;
  const finalPayableAmount = Math.round((rawNetTotal + shippingCharges + taxAmount) * 100) / 100;

  return {
    itemSubtotal,
    eligibleProductDiscount,
    eligibleQuantityDiscount,
    couponDiscount,
    priceFloorAdjustment,
    netMerchandiseTotal: rawNetTotal,
    shippingCharges,
    taxAmount,
    finalPayableAmount,
    appliedRulesLog,
    rejectedRulesLog,
  };
}

// 5. Idempotency & Duplicate Event Guard (Refunds & Courier Webhooks)
export function deduplicateShipmentEvents<
  T extends { timestamp: string; statusCode: string; location: string }
>(events: T[]): { uniqueEvents: T[]; duplicatesRemoved: number } {
  const seen = new Set<string>();
  const uniqueEvents: T[] = [];
  let duplicatesRemoved = 0;

  for (const ev of events) {
    const compositeKey = `${ev.timestamp.trim()}|${ev.statusCode.trim().toUpperCase()}|${ev.location.trim().toUpperCase()}`;
    if (seen.has(compositeKey)) {
      duplicatesRemoved++;
    } else {
      seen.add(compositeKey);
      uniqueEvents.push(ev);
    }
  }

  return { uniqueEvents, duplicatesRemoved };
}

export function validateSkuUniqueness(
  candidateSku: string,
  existingSkus: string[],
  currentProductId?: string
): { valid: boolean; error?: string } {
  const normalized = candidateSku.trim().toUpperCase();
  if (!normalized) {
    return { valid: false, error: 'SKU is required.' };
  }
  if (!/^[A-Z0-9-_]{3,32}$/.test(normalized)) {
    return {
      valid: false,
      error: 'SKU must be 3–32 characters using uppercase letters, numbers, hyphens, or underscores.',
    };
  }
  const isDuplicate = existingSkus.some((s) => s.trim().toUpperCase() === normalized);
  if (isDuplicate && !currentProductId) {
    return {
      valid: false,
      error: `Duplicate SKU detected: "${normalized}" already exists in the catalogue.`,
    };
  }
  return { valid: true };
}
