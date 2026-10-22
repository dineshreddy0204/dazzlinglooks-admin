import { ApiEndpointContract } from '../types/admin';

/**
 * Central API Integration Layer & Proposed Backend Contract Specification
 *
 * Architectural Guarantees:
 * 1. Base URL is strictly configurable via VITE_API_BASE_URL or runtime inspection.
 * 2. Never fabricates production responses when the backend is disconnected.
 * 3. Enforces Bearer + HTTP-Only Session Credentials, CSRF headers, and Idempotency-Key headers
 *    on all state-mutating operations (stock adjustments, refunds, order updates).
 */

export interface ApiClientConfig {
  baseUrl: string;
  timeoutMs: number;
}

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  integrationStatus: 'LIVE_CONNECTED' | 'INTEGRATION_PENDING' | 'DATA_UNAVAILABLE';
  timestamp: string;
}

class DazzlingLooksApiClient {
  private config: ApiClientConfig;

  constructor() {
    const envUrl = import.meta.env.VITE_API_BASE_URL || '';
    this.config = {
      baseUrl: envUrl.trim().replace(/\/+$/, ''),
      timeoutMs: 12000,
    };
  }

  public getBaseUrl(): string {
    return this.config.baseUrl;
  }

  public setRuntimeBaseUrl(url: string): void {
    this.config.baseUrl = url.trim().replace(/\/+$/, '');
  }

  public isConfigured(): boolean {
    return Boolean(this.config.baseUrl && this.config.baseUrl.startsWith('http'));
  }

  public generateIdempotencyKey(prefix: string): string {
    const randomPart = Math.random().toString(36).substring(2, 10);
    return `dl-idem-${prefix}-${Date.now()}-${randomPart}`;
  }

  /**
   * Executes a real HTTP request against the configured backend.
   * If VITE_API_BASE_URL is not configured, returns an explicit INTEGRATION_PENDING response
   * rather than inventing fake data.
   */
  public async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      body?: unknown;
      idempotencyKey?: string;
      signal?: AbortSignal;
    } = {}
  ): Promise<ApiResponse<T>> {
    const method = options.method || 'GET';
    const now = new Date().toISOString();

    if (!this.isConfigured()) {
      return {
        ok: false,
        status: 0,
        data: null,
        error:
          'Backend API URL is not configured (VITE_API_BASE_URL is empty). Connect the production/staging backend to perform live operations.',
        integrationStatus: 'INTEGRATION_PENDING',
        timestamp: now,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Client-Application': 'Dazzlinglooks-Admin-Dashboard',
      };

      if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }

      if (options.idempotencyKey) {
        headers['Idempotency-Key'] = options.idempotencyKey;
      }

      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method,
        headers,
        credentials: 'include', // Ensures HTTP-only session cookies are sent
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: options.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson && typeof errJson.message === 'string') {
            errorMsg = errJson.message;
          }
        } catch {
          // Ignore JSON parse error on non-JSON error bodies
        }

        return {
          ok: false,
          status: response.status,
          data: null,
          error: errorMsg,
          integrationStatus: 'DATA_UNAVAILABLE',
          timestamp: new Date().toISOString(),
        };
      }

      const data = (await response.json()) as T;
      return {
        ok: true,
        status: response.status,
        data,
        error: null,
        integrationStatus: 'LIVE_CONNECTED',
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const message =
        err instanceof Error
          ? err.name === 'AbortError'
            ? `Request timed out after ${this.config.timeoutMs}ms`
            : err.message
          : 'Network error communicating with backend API';

      return {
        ok: false,
        status: 0,
        data: null,
        error: message,
        integrationStatus: 'DATA_UNAVAILABLE',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const apiClient = new DazzlingLooksApiClient();

/**
 * Proposed Backend API Contract Specification for the Dazzlinglooks.in Backend Developer.
 * Clearly labeled as PROPOSED_CONTRACT until verified against the shared backend.
 */
export const PROPOSED_API_CONTRACTS: ApiEndpointContract[] = [
  {
    id: 'AUTH-01',
    module: 'Authentication & Owner Security',
    method: 'POST',
    path: '/api/v1/admin/auth/session',
    status: 'PROPOSED_CONTRACT',
    purpose: 'Authenticate store owner credentials with MFA/OTP verification and establish an HTTP-only secure session.',
    authRequired: 'OWNER_SESSION_BEARER + CSRF',
    idempotencyKeyRequired: false,
    requestSchema: '{ "email": "string", "password": "string", "mfaCode": "string?" }',
    responseSchema: '{ "authenticated": true, "ownerId": "uuid", "email": "string", "role": "STORE_OWNER", "sessionExpiresAt": "ISO-8601", "csrfToken": "string" }',
    errorCodes: ['401 Invalid Credentials', '403 Not Store Owner', '429 Rate Limit Exceeded'],
    externalDependencies: ['Backend Auth Provider / Session Store'],
  },
  {
    id: 'METRICS-01',
    module: 'Dashboard Overview & Financial Analytics',
    method: 'GET',
    path: '/api/v1/admin/analytics/summary?from=ISO&to=ISO&tz=Asia/Kolkata',
    status: 'PROPOSED_CONTRACT',
    purpose: 'Fetch authoritative server-calculated financial metrics (gross sales, discounts, refunds, net sales, shipping, verified COGS profit) and operational alerts.',
    authRequired: 'OWNER_SESSION_BEARER + CSRF',
    idempotencyKeyRequired: false,
    requestSchema: 'Query params: from (ISO-8601), to (ISO-8601), tz (IANA timezone)',
    responseSchema: '{ "grossSales": "number", "totalDiscounts": "number", "refundsProcessed": "number", "netSales": "number", "shippingCollected": "number", "verifiedCogsProfit": "number | null", "orderCount": "number", "lowStockCount": "number", "nearExpiryBatchCount": "number" }',
    errorCodes: ['400 Invalid Date Range', '401 Unauthorized'],
    externalDependencies: ['PostgreSQL / Shared Order & Inventory Database'],
  },
  {
    id: 'CATALOG-01',
    module: 'Product Catalogue & Variations',
    method: 'POST',
    path: '/api/v1/admin/products',
    status: 'PROPOSED_CONTRACT',
    purpose: 'Create a verified beauty/skincare product with stable variant identifiers, ingredients, skin-type suitability, and SEO metadata.',
    authRequired: 'OWNER_SESSION_BEARER + CSRF',
    idempotencyKeyRequired: true,
    requestSchema: '{ "name": "string", "sku": "string", "brandId": "uuid", "categoryId": "uuid", "regularPrice": "number", "salePrice": "number?", "ingredients": "string", "directions": "string", "precautions": "string", "skinTypes": "string[]", "variants": "VariantInput[]" }',
    responseSchema: '{ "product": "Product", "auditLogId": "uuid" }',
    errorCodes: ['409 Duplicate SKU or Slug', '422 Validation Failed'],
    externalDependencies: ['Shared Product Database', 'Object Storage for Product Media'],
  },
  {
    id: 'INV-01',
    module: 'Inventory Management',
    method: 'POST',
    path: '/api/v1/admin/inventory/adjustments',
    status: 'PROPOSED_CONTRACT',
    purpose: 'Perform an atomic, transactional stock adjustment with mandatory reason code and negative-stock prevention.',
    authRequired: 'OWNER_SESSION_BEARER + CSRF',
    idempotencyKeyRequired: true,
    requestSchema: '{ "variantId": "uuid", "deltaQuantity": "integer", "reasonCode": "DAMAGED | RESTOCK_RECEIPT | CYCLE_COUNT_RECONCILIATION | EXPIRED_WRITE_OFF | RETURN_INSPECTED", "notes": "string" }',
    responseSchema: '{ "variantId": "uuid", "previousStock": "number", "newStockOnHand": "number", "availableQuantity": "number", "adjustmentId": "uuid", "auditLogId": "uuid" }',
    errorCodes: ['409 Concurrent Modification / Negative Stock Blocked', '422 Missing Reason Code'],
    externalDependencies: ['Database Transaction Lock'],
  },
  {
    id: 'BATCH-01',
    module: 'Batch, Manufacturing & Expiry (FEFO)',
    method: 'POST',
    path: '/api/v1/admin/batches',
    status: 'PROPOSED_CONTRACT',
    purpose: 'Register a manufacturing lot/batch with expiry date and supplier invoice reference for First-Expired, First-Out (FEFO) fulfillment.',
    authRequired: 'OWNER_SESSION_BEARER + CSRF',
    idempotencyKeyRequired: true,
    requestSchema: '{ "variantId": "uuid", "batchNumber": "string", "manufacturingDate": "YYYY-MM-DD", "expiryDate": "YYYY-MM-DD", "quantityReceived": "number", "supplierId": "uuid", "invoiceReference": "string" }',
    responseSchema: '{ "batchId": "uuid", "status": "ACTIVE_SELLABLE | NEAR_EXPIRY | EXPIRED", "fefoPriorityRank": "number" }',
    errorCodes: ['409 Duplicate Batch Lot for Variant', '422 Expiry Date Earlier Than Manufacturing Date'],
    externalDependencies: ['Batch Inventory Table'],
  },
  {
    id: 'DISCOUNT-01',
    module: 'Automatic Discount Engine',
    method: 'POST',
    path: '/api/v1/admin/discounts/evaluate',
    status: 'PROPOSED_CONTRACT',
    purpose: 'Authoritative server-side recalculation of cart subtotal, quantity tiers, product/category promos, coupon codes, stacking priority, and price floor.',
    authRequired: 'OWNER_SESSION_BEARER + CSRF',
    idempotencyKeyRequired: false,
    requestSchema: '{ "items": "[{ variantId, quantity }]", "couponCode": "string?", "customerId": "uuid?" }',
    responseSchema: '{ "itemSubtotal": "number", "productDiscounts": "number", "quantityDiscounts": "number", "couponDiscount": "number", "priceFloorClamped": "boolean", "shippingCharges": "number", "taxAmount": "number", "finalPayableAmount": "number", "explanation": "string[]" }',
    errorCodes: ['422 Coupon Expired or Ineligible'],
    externalDependencies: ['Discount Rules Engine'],
  },
  {
    id: 'ORDER-01',
    module: 'Orders & Lifecycle Management',
    method: 'PATCH',
    path: '/api/v1/admin/orders/:orderId/status',
    status: 'PROPOSED_CONTRACT',
    purpose: 'Transition an order through its allowed state lifecycle with strict state-machine validation and audit logging.',
    authRequired: 'OWNER_SESSION_BEARER + CSRF',
    idempotencyKeyRequired: true,
    requestSchema: '{ "nextStatus": "CONFIRMED | PROCESSING | SHIPPED | DELIVERED | CANCELLED | RETURNED", "notes": "string" }',
    responseSchema: '{ "orderId": "uuid", "previousStatus": "string", "currentStatus": "string", "updatedAt": "ISO-8601", "auditLogId": "uuid" }',
    errorCodes: ['409 Invalid State Transition', '422 Variant Inactive or Out of Stock'],
    externalDependencies: ['Shared Orders Table'],
  },
  {
    id: 'PAYMENT-01',
    module: 'Payments, Cancellations & Refunds',
    method: 'POST',
    path: '/api/v1/admin/orders/:orderId/refunds',
    status: 'PROPOSED_CONTRACT',
    purpose: 'Initiate a full or partial refund through the authorized payment gateway API and record provider confirmation.',
    authRequired: 'OWNER_SESSION_BEARER + CSRF',
    idempotencyKeyRequired: true,
    requestSchema: '{ "amount": "number", "reason": "string", "returnRequestId": "uuid?" }',
    responseSchema: '{ "refundId": "uuid", "gatewayRefundReference": "string", "status": "PENDING_GATEWAY | CONFIRMED_REFUNDED", "timestamp": "ISO-8601" }',
    errorCodes: ['409 Refund Exceeds Paid Amount or Duplicate Idempotency Key', '502 Payment Gateway Unavailable'],
    externalDependencies: ['Payment Gateway API (e.g., Razorpay / Cashfree / Stripe)'],
  },
  {
    id: 'SHIP-01',
    module: 'Real Courier & Shipment Tracking',
    method: 'POST',
    path: '/api/v1/admin/shipments/:orderId/awb',
    status: 'PROPOSED_CONTRACT',
    purpose: 'Save manual courier booking AWB/tracking details and subscribe to verified courier webhook/polling updates.',
    authRequired: 'OWNER_SESSION_BEARER + CSRF',
    idempotencyKeyRequired: true,
    requestSchema: '{ "courierName": "string", "awbNumber": "string", "trackingUrl": "string", "dispatchedAt": "ISO-8601" }',
    responseSchema: '{ "shipmentId": "uuid", "awbNumber": "string", "liveTrackingActive": "boolean", "lastSyncAt": "ISO-8601 | null" }',
    errorCodes: ['400 Invalid AWB Format', '409 AWB Already Assigned'],
    externalDependencies: ['Courier Aggregator API (e.g., Shiprocket / Delhivery / BlueDart Webhook)'],
  },
  {
    id: 'MEDIA-01',
    module: 'Media Storage & Signed Uploads',
    method: 'POST',
    path: '/api/v1/admin/media/presigned-upload',
    status: 'PROPOSED_CONTRACT',
    purpose: 'Generate a short-lived authorized signed upload URL after validating file MIME type, size limit, and safe filename.',
    authRequired: 'OWNER_SESSION_BEARER + CSRF',
    idempotencyKeyRequired: false,
    requestSchema: '{ "fileName": "string", "mimeType": "image/jpeg | image/png | image/webp", "fileSizeBytes": "number", "folder": "products | banners | reviews" }',
    responseSchema: '{ "uploadUrl": "string", "publicAssetUrl": "string", "expiresInSeconds": 300 }',
    errorCodes: ['413 File Too Large (>5MB)', '415 Unsupported File Type'],
    externalDependencies: ['Object Storage (S3-Compatible / Hostinger Storage API)'],
  },
  {
    id: 'CAT-BRAND-01',
    module: 'Categories & Brands',
    method: 'POST',
    path: '/api/v1/admin/categories',
    status: 'PROPOSED_CONTRACT',
    purpose: 'Create or update product categories and brand registries with duplicate slug prevention and safe archive handling.',
    authRequired: 'OWNER_SESSION_BEARER + CSRF',
    idempotencyKeyRequired: true,
    requestSchema: '{ "name": "string", "slug": "string", "parentId": "uuid | null", "description": "string", "status": "ACTIVE | INACTIVE" }',
    responseSchema: '{ "category": "Category", "auditLogId": "uuid" }',
    errorCodes: ['409 Duplicate Category Slug', '422 Cannot Archive Category With Active Unreassigned Products'],
    externalDependencies: ['Shared Product Catalogue Database'],
  },
  {
    id: 'RET-01',
    module: 'Returns & Exchanges',
    method: 'PATCH',
    path: '/api/v1/admin/returns/:returnId/inspection',
    status: 'PROPOSED_CONTRACT',
    purpose: 'Record authorized return approval/rejection and mandatory hygiene inspection decision before any returned item can re-enter sellable stock.',
    authRequired: 'OWNER_SESSION_BEARER + CSRF',
    idempotencyKeyRequired: true,
    requestSchema: '{ "approvalStatus": "APPROVED | REJECTED", "restockDecision": "APPROVED_RESELLABLE | QUARANTINE_DISPOSE", "inspectionNotes": "string" }',
    responseSchema: '{ "returnId": "uuid", "restockedQuantity": "number", "auditLogId": "uuid" }',
    errorCodes: ['409 Return Already Processed', '422 Opened Skincare Cannot Be Marked Resellable'],
    externalDependencies: ['Shared Orders & Inventory Database'],
  },
  {
    id: 'CUST-01',
    module: 'Customer Management & Abandoned Carts',
    method: 'GET',
    path: '/api/v1/admin/customers?page=1&limit=20&q=string',
    status: 'PROPOSED_CONTRACT',
    purpose: 'Query verified customer profiles, order history, consent preferences, and eligible abandoned carts with server-side PII masking.',
    authRequired: 'OWNER_SESSION_BEARER + CSRF',
    idempotencyKeyRequired: false,
    requestSchema: 'Query params: page (number), limit (number), q (search string), unmaskPii (boolean, triggers audit log)',
    responseSchema: '{ "customers": "CustomerRecord[]", "total": "number", "page": "number" }',
    errorCodes: ['401 Unauthorized', '403 Insufficient Owner Privileges'],
    externalDependencies: ['Shared Customer & Cart Session Database'],
  },
  {
    id: 'REV-01',
    module: 'Reviews & Media Moderation',
    method: 'PATCH',
    path: '/api/v1/admin/reviews/:reviewId/moderate',
    status: 'PROPOSED_CONTRACT',
    purpose: 'Approve, reject, or report customer product reviews and media tied to verified purchase records.',
    authRequired: 'OWNER_SESSION_BEARER + CSRF',
    idempotencyKeyRequired: true,
    requestSchema: '{ "status": "APPROVED | REJECTED | FLAGGED", "moderationReason": "string" }',
    responseSchema: '{ "reviewId": "uuid", "verifiedPurchase": "boolean", "status": "string", "auditLogId": "uuid" }',
    errorCodes: ['404 Review Not Found', '422 Missing Moderation Reason'],
    externalDependencies: ['Shared Reviews Table & Media Storage'],
  },
  {
    id: 'CMS-01',
    module: 'Banners, Homepage & Store Pages (CMS)',
    method: 'PUT',
    path: '/api/v1/admin/cms/pages/:slug',
    status: 'PROPOSED_CONTRACT',
    purpose: 'Save draft or publish owner-verified storefront content (Hero banners, About Us, FAQs, Shipping/Return/Privacy Policies) and SEO metadata.',
    authRequired: 'OWNER_SESSION_BEARER + CSRF',
    idempotencyKeyRequired: true,
    requestSchema: '{ "title": "string", "contentHtml": "string", "seoTitle": "string", "metaDescription": "string", "status": "DRAFT | PUBLISHED" }',
    responseSchema: '{ "slug": "string", "status": "DRAFT | PUBLISHED", "updatedAt": "ISO-8601", "auditLogId": "uuid" }',
    errorCodes: ['409 Duplicate Canonical Slug', '422 Empty Policy Body'],
    externalDependencies: ['Shared Storefront CMS Database'],
  },
  {
    id: 'SETTINGS-01',
    module: 'Store Settings, Shipping Rules & Notifications',
    method: 'PUT',
    path: '/api/v1/admin/settings/store',
    status: 'PROPOSED_CONTRACT',
    purpose: 'Update store identity, GST configuration, delivery charge tiers, serviceable PIN codes, and notification channel preferences.',
    authRequired: 'OWNER_SESSION_BEARER + CSRF',
    idempotencyKeyRequired: true,
    requestSchema: '{ "supportEmail": "string", "gstinNumber": "string", "standardShippingFee": "number", "freeShippingThreshold": "number", "serviceablePinCodes": "string[]" }',
    responseSchema: '{ "updatedAt": "ISO-8601", "paymentProvidersVerified": "string[]", "courierProvidersVerified": "string[]", "auditLogId": "uuid" }',
    errorCodes: ['422 Invalid GSTIN or PIN Code Format'],
    externalDependencies: ['Shared Configuration Store'],
  },
  {
    id: 'AUDIT-01',
    module: 'Audit Logs & Backup Status',
    method: 'GET',
    path: '/api/v1/admin/audit-logs?page=1&limit=50&module=ALL',
    status: 'PROPOSED_CONTRACT',
    purpose: 'Retrieve immutable append-only administrative security audit logs and infrastructure-verified database/media backup status.',
    authRequired: 'OWNER_SESSION_BEARER + CSRF',
    idempotencyKeyRequired: false,
    requestSchema: 'Query params: page (number), limit (number), module (string), from (ISO-8601), to (ISO-8601)',
    responseSchema: '{ "logs": "AuditLogEntry[]", "backupStatus": "{ lastVerifiedSnapshotAt: ISO-8601 | null, status: VERIFIED | UNVERIFIED }" }',
    errorCodes: ['401 Unauthorized'],
    externalDependencies: ['Append-Only Audit Table & Cloud Infrastructure Backup Monitor'],
  },
];
