/**
 * Dazzlinglooks.in Admin Dashboard — Shared Domain Types & Schemas
 * Strictly typed contracts for API requests, responses, and business entities.
 */

export type IntegrationStatus =
  | 'CONNECTED_VERIFIED'
  | 'INTEGRATION_PENDING'
  | 'DATA_UNAVAILABLE'
  | 'SANDBOX_FIXTURE_MODE';

export type ModuleId =
  | 'overview'
  | 'products'
  | 'categories_brands'
  | 'inventory'
  | 'batches_expiry'
  | 'suppliers_po'
  | 'orders'
  | 'payments_refunds'
  | 'shipments_tracking'
  | 'returns_exchanges'
  | 'customers'
  | 'abandoned_carts'
  | 'reviews_moderation'
  | 'discounts'
  | 'banners_cms'
  | 'analytics_reports'
  | 'pages_content'
  | 'seo_quality'
  | 'shipping_rules'
  | 'notifications'
  | 'store_settings'
  | 'owner_access_control'
  | 'audit_security'
  | 'api_contracts'
  | 'backup_recovery'
  | 'media_storage'
  | 'qa_verification';

export interface StoreSettingsConfig {
  storeName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  currencyCode: 'INR';
  currencySymbol: '₹';
  timezone: 'Asia/Kolkata';
  gstinNumber: string;
  defaultGstPercent: number;
  allowBackordersDefault: boolean;
  lowStockDefaultThreshold: number;
  nearExpiryAlertDays: number;
}

export interface AdminSession {
  authenticated: boolean;
  ownerId: string | null;
  email: string | null;
  role: 'STORE_OWNER' | null;
  sessionExpiresAt: string | null;
  authProviderStatus: 'PENDING_BACKEND_AUTH' | 'VERIFIED_SERVER_SESSION';
  csrfToken?: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string; // e.g., "50 ml", "100 ml", "Ruby Matte #04", "Multipack (2x 50ml)"
  optionType: 'VOLUME_SIZE' | 'SHADE' | 'MULTIPACK' | 'CUSTOM';
  sku: string;
  barcode?: string;
  regularPrice: number;
  salePrice?: number;
  stockOnHand: number;
  reservedStock: number;
  availableStock: number;
  active: boolean;
  imageUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  shortDescription: string;
  fullDescription: string;
  images: { url: string; altText: string; isPrimary: boolean }[];
  regularPrice: number;
  salePrice?: number;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  visibility: 'PUBLIC' | 'HIDDEN' | 'CATALOG_ONLY';
  isFeatured: boolean;
  isBestSeller: boolean;
  ingredients: string;
  directions: string;
  precautions: string;
  skinTypes: ('Normal' | 'Dry' | 'Oily' | 'Combination' | 'Sensitive' | 'Acne-Prone' | 'Mature')[];
  seoTitle: string;
  metaDescription: string;
  slug: string;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parentName?: string;
  description: string;
  imageUrl?: string;
  status: 'ACTIVE' | 'INACTIVE';
  productCount: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string;
  status: 'ACTIVE' | 'INACTIVE';
  productCount: number;
}

export interface InventoryItem {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  stockOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  allowBackorders: boolean;
  supplierReference?: string;
  lastUpdatedAt: string;
}

export interface StockAdjustmentRecord {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  deltaQuantity: number;
  previousStock: number;
  newStock: number;
  reasonCode: 'DAMAGED' | 'RESTOCK_RECEIPT' | 'CYCLE_COUNT_RECONCILIATION' | 'EXPIRED_WRITE_OFF' | 'RETURN_INSPECTED';
  notes: string;
  actorEmail: string;
  timestamp: string;
}

export interface ProductBatch {
  id: string;
  batchNumber: string;
  productId: string;
  productName: string;
  variantId: string;
  variantSku: string;
  manufacturingDate: string;
  expiryDate: string;
  quantityRemaining: number;
  supplierId: string;
  supplierName: string;
  invoiceReference: string;
  status: 'ACTIVE_SELLABLE' | 'NEAR_EXPIRY' | 'EXPIRED' | 'QUARANTINED';
  fefoPriorityRank: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin?: string;
  city: string;
  active: boolean;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'COMPLETED_RECEIVED' | 'CANCELLED';
  invoiceReference?: string;
  totalCost: number;
  createdAt: string;
  items: {
    variantId: string;
    sku: string;
    productName: string;
    requestedQty: number;
    receivedQty: number;
    unitCost: number;
  }[];
}

export interface QuantityDiscountTier {
  minQuantity: number;
  maxQuantity: number | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
}

export interface DiscountRule {
  id: string;
  name: string;
  category: 'QUANTITY_TIER' | 'PRODUCT_SPECIFIC' | 'CATEGORY_SPECIFIC' | 'COUPON_CODE' | 'SCHEDULED_PROMO';
  code?: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  discountValue: number;
  minOrderValue: number;
  priceFloor: number;
  usageLimitTotal?: number;
  usageLimitPerCustomer?: number;
  newCustomersOnly: boolean;
  allowStacking: boolean;
  priority: number;
  startDate: string;
  endDate: string;
  timezone: string;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'EXPIRED';
  quantityTiers?: QuantityDiscountTier[];
  eligibleProductIds?: string[];
  excludedCategoryIds?: string[];
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: OrderStatus;
  paymentStatus: 'PENDING' | 'VERIFIED_PAID' | 'COD_PENDING' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  paymentMethod: string;
  paymentReference: string;
  fulfillmentStatus: 'UNFULFILLED' | 'PARTIALLY_FULFILLED' | 'DISPATCHED' | 'DELIVERED' | 'RTO';
  itemSubtotal: number;
  productDiscountTotal: number;
  quantityDiscountTotal: number;
  couponDiscountTotal: number;
  shippingCharges: number;
  taxAmount: number;
  finalPayableAmount: number;
  shippingAddress: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  };
  items: {
    variantId: string;
    productName: string;
    variantName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    lineTotal: number;
  }[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  courierName: string;
  awbNumber: string;
  trackingUrl: string;
  dispatchedAt: string;
  shipmentStatus: 'BOOKED_MANUAL' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'EXCEPTION_DELAYED' | 'FAILED_ATTEMPT' | 'RTO_INITIATED';
  estimatedDeliveryDate: string | null; // Null unless supplied by courier provider
  lastProviderSyncAt: string | null;
  liveTrackingConfigured: boolean;
  customerNotified: boolean;
  events: {
    id: string;
    timestamp: string;
    statusCode: string;
    location: string;
    description: string;
    providerSource: string;
  }[];
}

export interface ReturnRequest {
  id: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  itemSku: string;
  productName: string;
  quantity: number;
  reason: string;
  condition: 'UNOPENED_SEALED' | 'OPENED_TESTED' | 'DAMAGED_IN_TRANSIT' | 'WRONG_ITEM_SENT';
  supportingImages: string[];
  approvalStatus: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  returnAwb?: string;
  refundStatus: 'NOT_INITIATED' | 'PENDING_GATEWAY' | 'CONFIRMED_REFUNDED';
  restockDecision: 'PENDING_INSPECTION' | 'APPROVED_RESELLABLE' | 'QUARANTINE_DISPOSE';
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  module: string;
  affectedRecordId: string;
  result: 'SUCCESS' | 'REJECTED_UNAUTHORIZED' | 'VALIDATION_ERROR' | 'PENDING_BACKEND';
  details: string;
}

export interface ApiEndpointContract {
  id: string;
  module: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  status: 'PROPOSED_CONTRACT' | 'AWAITING_BACKEND_VERIFICATION';
  purpose: string;
  authRequired: 'OWNER_SESSION_BEARER + CSRF';
  idempotencyKeyRequired: boolean;
  requestSchema: string;
  responseSchema: string;
  errorCodes: string[];
  externalDependencies: string[];
}
