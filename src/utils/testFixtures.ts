import {
  Brand,
  Category,
  DiscountRule,
  InventoryItem,
  Order,
  Product,
  ProductBatch,
  PurchaseOrder,
  ReturnRequest,
  ShipmentRecord,
  Supplier,
} from '../types/admin';

/**
 * ISOLATED DEVELOPMENT TEST FIXTURES — DAZZLINGLOOKS.IN
 *
 * Strict Compliance Notice (Section 28):
 * - These records are NEVER loaded by default as live production metrics.
 * - They are strictly isolated behind the explicit "Test Fixture Sandbox" toggle for UI/workflow testing
 *   before the backend developer connects VITE_API_BASE_URL.
 * - Every record is conspicuously labeled with [TEST FIXTURE] identifiers.
 */

export const SANDBOX_CATEGORIES: Category[] = [
  {
    id: 'cat-test-serums',
    name: '[TEST FIXTURE] Facial Serums & Actives',
    slug: 'facial-serums-actives',
    parentId: null,
    description: 'Isolated test category for botanical and clinical facial serums.',
    status: 'ACTIVE',
    productCount: 1,
  },
  {
    id: 'cat-test-lips',
    name: '[TEST FIXTURE] Lip Care & Matte Tints',
    slug: 'lip-care-matte-tints',
    parentId: null,
    description: 'Isolated test category for shade-based lip variations.',
    status: 'ACTIVE',
    productCount: 1,
  },
];

export const SANDBOX_BRANDS: Brand[] = [
  {
    id: 'brand-test-dl',
    name: '[TEST FIXTURE] Dazzlinglooks Botanicals',
    slug: 'dazzlinglooks-botanicals',
    description: 'In-house test fixture brand.',
    status: 'ACTIVE',
    productCount: 2,
  },
];

export const SANDBOX_PRODUCTS: Product[] = [
  {
    id: 'prod-test-01',
    name: '[TEST FIXTURE] Kumkumadi Saffron Radiance Elixir',
    sku: 'TEST-DL-KUMKUMADI-01',
    barcode: '8900000000012',
    brandId: 'brand-test-dl',
    brandName: '[TEST FIXTURE] Dazzlinglooks Botanicals',
    categoryId: 'cat-test-serums',
    categoryName: '[TEST FIXTURE] Facial Serums & Actives',
    shortDescription: 'Test fixture facial oil with volume variations (50 ml, 100 ml).',
    fullDescription:
      'Isolated development test record for verifying volume variations, FEFO batch lot assignment, and SKU uniqueness validation.',
    images: [
      {
        url: '/logo.svg',
        altText: 'Test fixture Kumkumadi Elixir bottle preview',
        isPrimary: true,
      },
    ],
    regularPrice: 899,
    salePrice: 799,
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    isFeatured: true,
    isBestSeller: true,
    ingredients:
      '[TEST FIXTURE INCI] Sesamum Indicum Seed Oil, Crocus Sativus (Saffron) Stigma Extract, Santalum Album, Rubia Cordifolia, Tocopherol.',
    directions: 'Apply 3 drops on damp skin after cleansing.',
    precautions: 'For external use only. Perform a 24-hour patch test.',
    skinTypes: ['Normal', 'Dry', 'Combination', 'Mature'],
    seoTitle: '[TEST FIXTURE] Kumkumadi Saffron Radiance Elixir | Dazzlinglooks.in',
    metaDescription: 'Test fixture SEO meta description for catalogue quality verification.',
    slug: 'test-kumkumadi-saffron-radiance-elixir',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-20T12:00:00Z',
    variants: [
      {
        id: 'var-test-50ml',
        productId: 'prod-test-01',
        name: '50 ml Dropper Bottle',
        optionType: 'VOLUME_SIZE',
        sku: 'TEST-DL-KUMKUMADI-50ML',
        regularPrice: 899,
        salePrice: 799,
        stockOnHand: 28,
        reservedStock: 3,
        availableStock: 25,
        active: true,
      },
      {
        id: 'var-test-100ml',
        productId: 'prod-test-01',
        name: '100 ml Value Bottle',
        optionType: 'VOLUME_SIZE',
        sku: 'TEST-DL-KUMKUMADI-100ML',
        regularPrice: 1599,
        salePrice: 1399,
        stockOnHand: 6,
        reservedStock: 2,
        availableStock: 4,
        active: true,
      },
    ],
  },
  {
    id: 'prod-test-02',
    name: '[TEST FIXTURE] Velvet Silk Matte Lipstick',
    sku: 'TEST-DL-LIP-VELVET',
    brandId: 'brand-test-dl',
    brandName: '[TEST FIXTURE] Dazzlinglooks Botanicals',
    categoryId: 'cat-test-lips',
    categoryName: '[TEST FIXTURE] Lip Care & Matte Tints',
    shortDescription: 'Test fixture shade-based lipstick variations.',
    fullDescription: 'Isolated development test record for verifying lipstick shade options.',
    images: [],
    regularPrice: 499,
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    isFeatured: false,
    isBestSeller: false,
    ingredients:
      '[TEST FIXTURE INCI] Ricinus Communis Seed Oil, Candelilla Cera, Butyrospermum Parkii Butter, CI 77491.',
    directions: 'Glide directly across lips.',
    precautions: 'Store in a cool, dry place below 30°C.',
    skinTypes: ['Normal', 'Dry', 'Sensitive'],
    seoTitle: '[TEST FIXTURE] Velvet Silk Matte Lipstick',
    metaDescription: 'Test fixture lipstick variations.',
    slug: 'test-velvet-silk-matte-lipstick',
    createdAt: '2026-10-05T09:00:00Z',
    updatedAt: '2026-10-21T11:00:00Z',
    variants: [
      {
        id: 'var-test-shade01',
        productId: 'prod-test-02',
        name: 'Shade #01 Royal Plum',
        optionType: 'SHADE',
        sku: 'TEST-DL-LIP-SHADE01',
        regularPrice: 499,
        stockOnHand: 18,
        reservedStock: 0,
        availableStock: 18,
        active: true,
      },
    ],
  },
];

export const SANDBOX_INVENTORY: InventoryItem[] = [
  {
    variantId: 'var-test-50ml',
    productId: 'prod-test-01',
    productName: '[TEST FIXTURE] Kumkumadi Saffron Radiance Elixir',
    variantName: '50 ml Dropper Bottle',
    sku: 'TEST-DL-KUMKUMADI-50ML',
    stockOnHand: 28,
    reservedQuantity: 3,
    availableQuantity: 25,
    lowStockThreshold: 10,
    allowBackorders: false,
    supplierReference: 'SUP-TEST-AYUR',
    lastUpdatedAt: '2026-10-21T10:00:00Z',
  },
  {
    variantId: 'var-test-100ml',
    productId: 'prod-test-01',
    productName: '[TEST FIXTURE] Kumkumadi Saffron Radiance Elixir',
    variantName: '100 ml Value Bottle',
    sku: 'TEST-DL-KUMKUMADI-100ML',
    stockOnHand: 6,
    reservedQuantity: 2,
    availableQuantity: 4, // Low stock alert (<= 10)
    lowStockThreshold: 10,
    allowBackorders: false,
    supplierReference: 'SUP-TEST-AYUR',
    lastUpdatedAt: '2026-10-21T10:00:00Z',
  },
  {
    variantId: 'var-test-shade01',
    productId: 'prod-test-02',
    productName: '[TEST FIXTURE] Velvet Silk Matte Lipstick',
    variantName: 'Shade #01 Royal Plum',
    sku: 'TEST-DL-LIP-SHADE01',
    stockOnHand: 18,
    reservedQuantity: 0,
    availableQuantity: 18,
    lowStockThreshold: 8,
    allowBackorders: false,
    supplierReference: 'SUP-TEST-COSM',
    lastUpdatedAt: '2026-10-21T10:00:00Z',
  },
];

export const SANDBOX_BATCHES: ProductBatch[] = [
  {
    id: 'batch-test-01',
    batchNumber: 'TEST-LOT-2026-A1',
    productId: 'prod-test-01',
    productName: '[TEST FIXTURE] Kumkumadi Saffron Radiance Elixir (50 ml)',
    variantId: 'var-test-50ml',
    variantSku: 'TEST-DL-KUMKUMADI-50ML',
    manufacturingDate: '2025-06-01',
    expiryDate: '2026-11-25', // Near expiry (within 60 days of Oct 2026) -> FEFO Rank #1
    quantityRemaining: 10,
    supplierId: 'sup-test-01',
    supplierName: '[TEST FIXTURE] Vedic Botanicals Extracts Pvt Ltd',
    invoiceReference: 'TEST-INV-401',
    status: 'NEAR_EXPIRY',
    fefoPriorityRank: 1,
  },
  {
    id: 'batch-test-02',
    batchNumber: 'TEST-LOT-2026-B4',
    productId: 'prod-test-01',
    productName: '[TEST FIXTURE] Kumkumadi Saffron Radiance Elixir (50 ml)',
    variantId: 'var-test-50ml',
    variantSku: 'TEST-DL-KUMKUMADI-50ML',
    manufacturingDate: '2026-04-15',
    expiryDate: '2027-10-15', // Later expiry -> FEFO Rank #2
    quantityRemaining: 18,
    supplierId: 'sup-test-01',
    supplierName: '[TEST FIXTURE] Vedic Botanicals Extracts Pvt Ltd',
    invoiceReference: 'TEST-INV-712',
    status: 'ACTIVE_SELLABLE',
    fefoPriorityRank: 2,
  },
];

export const SANDBOX_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-test-01',
    name: '[TEST FIXTURE] Vedic Botanicals Extracts Pvt Ltd',
    contactPerson: 'Test Procurement Contact',
    email: 'procurement-fixture@example.com',
    phone: '+91-9000000001',
    gstin: '27AAACT0000A1Z5',
    city: 'Mumbai',
    active: true,
  },
];

export const SANDBOX_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-test-01',
    poNumber: 'TEST-PO-2026-101',
    supplierId: 'sup-test-01',
    supplierName: '[TEST FIXTURE] Vedic Botanicals Extracts Pvt Ltd',
    status: 'ISSUED',
    invoiceReference: 'TEST-INV-890',
    totalCost: 12000,
    createdAt: '2026-10-19T09:30:00Z',
    items: [
      {
        variantId: 'var-test-100ml',
        sku: 'TEST-DL-KUMKUMADI-100ML',
        productName: '[TEST FIXTURE] Kumkumadi Saffron Radiance Elixir (100 ml)',
        requestedQty: 20,
        receivedQty: 0,
        unitCost: 600,
      },
    ],
  },
];

export const SANDBOX_DISCOUNT_RULES: DiscountRule[] = [
  {
    id: 'disc-test-01',
    name: '[TEST FIXTURE] Festive Skincare 15% Coupon',
    category: 'COUPON_CODE',
    code: 'TESTGLOW15',
    discountType: 'PERCENTAGE',
    discountValue: 15,
    minOrderValue: 999,
    priceFloor: 399,
    newCustomersOnly: false,
    allowStacking: false,
    priority: 1,
    startDate: '2026-10-01T00:00',
    endDate: '2026-12-31T23:59',
    timezone: 'Asia/Kolkata',
    status: 'ACTIVE',
  },
];

export const SANDBOX_ORDERS: Order[] = [
  {
    id: 'ord-test-01',
    orderNumber: 'TEST-ORD-1001',
    customerId: 'cust-test-01',
    customerName: '[TEST FIXTURE] Ananya Sharma',
    customerEmail: 'ananya.fixture@example.com',
    customerPhone: '+919800001122',
    status: 'CONFIRMED',
    paymentStatus: 'VERIFIED_PAID',
    paymentMethod: 'UPI_PREPAID',
    paymentReference: 'TEST-PAY-REF-9910',
    fulfillmentStatus: 'UNFULFILLED',
    itemSubtotal: 1798,
    productDiscountTotal: 200,
    quantityDiscountTotal: 0,
    couponDiscountTotal: 0,
    shippingCharges: 0,
    taxAmount: 287.64,
    finalPayableAmount: 1885.64,
    shippingAddress: {
      line1: 'Test Fixture Apt 4B, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560038',
    },
    items: [
      {
        variantId: 'var-test-50ml',
        productName: '[TEST FIXTURE] Kumkumadi Saffron Radiance Elixir',
        variantName: '50 ml Dropper Bottle',
        sku: 'TEST-DL-KUMKUMADI-50ML',
        quantity: 2,
        unitPrice: 899,
        discountAmount: 200,
        lineTotal: 1598,
      },
    ],
    notes: 'Isolated test fixture order for state-machine verification.',
    createdAt: '2026-10-21T14:20:00Z',
    updatedAt: '2026-10-21T14:25:00Z',
  },
];

export const SANDBOX_SHIPMENTS: ShipmentRecord[] = [
  {
    id: 'ship-test-01',
    orderId: 'ord-test-01',
    orderNumber: 'TEST-ORD-1001',
    courierName: 'Delhivery Surface [TEST FIXTURE]',
    awbNumber: 'TESTAWB900123IN',
    trackingUrl: 'https://www.delhivery.com/track/package/TESTAWB900123IN',
    dispatchedAt: '2026-10-21T16:00:00Z',
    shipmentStatus: 'BOOKED_MANUAL',
    estimatedDeliveryDate: null,
    lastProviderSyncAt: null,
    liveTrackingConfigured: false,
    customerNotified: false,
    events: [],
  },
];

export const SANDBOX_RETURNS: ReturnRequest[] = [
  {
    id: 'ret-test-01',
    returnNumber: 'TEST-RET-501',
    orderId: 'ord-test-01',
    orderNumber: 'TEST-ORD-1001',
    customerName: '[TEST FIXTURE] Ananya Sharma',
    itemSku: 'TEST-DL-KUMKUMADI-50ML',
    productName: '[TEST FIXTURE] Kumkumadi Saffron Radiance Elixir (50 ml)',
    quantity: 1,
    reason: 'Ordered two bottles by mistake; one bottle remains factory sealed.',
    condition: 'UNOPENED_SEALED',
    supportingImages: [],
    approvalStatus: 'PENDING_REVIEW',
    refundStatus: 'NOT_INITIATED',
    restockDecision: 'PENDING_INSPECTION',
    createdAt: '2026-10-22T02:15:00Z',
  },
];
