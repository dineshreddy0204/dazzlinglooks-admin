import React, { useState } from 'react';
import {
  CheckCircle2,
  Code2,
  Database,
  FileCheck2,
  HardDrive,
  Lock,
  Play,
  Settings,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { AdminSession, AuditLogEntry, StoreSettingsConfig } from '../types/admin';
import { IntegrationBanner } from '../components/IntegrationStatusBanner';
import { apiClient, PROPOSED_API_CONTRACTS } from '../services/apiClient';
import {
  calculateTransparentCheckoutBreakdown,
  deduplicateShipmentEvents,
  evaluateBatchFEFO,
  isValidOrderTransition,
  validateSkuUniqueness,
  validateStockAdjustment,
} from '../utils/businessRules';

interface SystemArchitectureModuleProps {
  activeSubTab:
    | 'store_settings'
    | 'owner_access_control'
    | 'audit_security'
    | 'api_contracts'
    | 'backup_recovery'
    | 'media_storage'
    | 'qa_verification';
  isBackendConfigured: boolean;
  sandboxMode: boolean;
  session: AdminSession;
  auditLogs: AuditLogEntry[];
  onUpdateApiBaseUrl: (url: string) => void;
  onRecordAudit: (action: string, moduleName: string, recordId: string, details: string) => void;
}

interface TestSuiteResult {
  id: string;
  category: string;
  name: string;
  passed: boolean;
  assertionDetail: string;
}

export const SystemArchitectureModule: React.FC<SystemArchitectureModuleProps> = ({
  activeSubTab,
  isBackendConfigured,
  sandboxMode,
  session,
  auditLogs,
  onUpdateApiBaseUrl,
  onRecordAudit,
}) => {
  const [subTab, setSubTab] = useState(activeSubTab);
  const [runtimeUrlInput, setRuntimeUrlInput] = useState(apiClient.getBaseUrl());
  const [urlSavedMsg, setUrlSavedMsg] = useState<string | null>(null);

  // Store Settings State (Module 21)
  const [storeSettings, setStoreSettings] = useState<StoreSettingsConfig>({
    storeName: 'Dazzlinglooks.in',
    tagline: 'Beauty Begins Here',
    supportEmail: 'support@dazzlinglooks.in',
    supportPhone: '+91-',
    currencyCode: 'INR',
    currencySymbol: '₹',
    timezone: 'Asia/Kolkata',
    gstinNumber: '',
    defaultGstPercent: 18,
    allowBackordersDefault: false,
    lowStockDefaultThreshold: 10,
    nearExpiryAlertDays: 60,
  });
  const [settingsSavedNotice, setSettingsSavedNotice] = useState<string | null>(null);

  // Media Validation State (Module 30)
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [mediaValidationMsg, setMediaValidationMsg] = useState<{
    valid: boolean;
    text: string;
  } | null>(null);

  // Self-Test Runner State (Module 35)
  const [testResults, setTestResults] = useState<TestSuiteResult[]>([]);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  React.useEffect(() => {
    setSubTab(activeSubTab);
  }, [activeSubTab]);

  const handleSaveStoreSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onRecordAudit(
      'UPDATE_STORE_SETTINGS',
      'Store Settings',
      'STORE-CONFIG-MAIN',
      `Updated store settings (${storeSettings.storeName}, GST ${storeSettings.defaultGstPercent}%, Low-stock threshold ${storeSettings.lowStockDefaultThreshold})`
    );
    setSettingsSavedNotice(
      isBackendConfigured
        ? 'Store settings dispatched to /api/v1/admin/settings/store.'
        : 'Store settings staged locally and logged in audit trail. Backend persistence requires VITE_API_BASE_URL connection.'
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile({ name: file.name, size: file.size, type: file.type });

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxBytes = 5 * 1024 * 1024; // 5 MB

    if (!allowedTypes.includes(file.type)) {
      setMediaValidationMsg({
        valid: false,
        text: `Rejected: Unsupported MIME type "${file.type}". Only JPEG, PNG, and WebP images are permitted.`,
      });
      return;
    }

    if (file.size > maxBytes) {
      setMediaValidationMsg({
        valid: false,
        text: `Rejected: File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds the 5.00 MB security limit.`,
      });
      return;
    }

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    setMediaValidationMsg({
      valid: true,
      text: `Pre-flight validation passed for "${safeFileName}" (${(file.size / 1024).toFixed(1)} KB). Upload is NOT marked complete until backend presigned URL storage (/api/v1/admin/media/presigned-upload) confirms persistence.`,
    });
  };

  const runDeterministicTestSuite = () => {
    const results: TestSuiteResult[] = [];

    // Test 1: SKU Uniqueness & Format Validation
    const skuDup = validateSkuUniqueness('dl-serum-01', ['DL-SERUM-01', 'DL-CREAM-02']);
    const skuValid = validateSkuUniqueness('DL-TONER-09', ['DL-SERUM-01']);
    results.push({
      id: 'TEST-01',
      category: 'Form & Catalogue Validation',
      name: 'Duplicate SKU Detection & Format Enforcement',
      passed: skuDup.valid === false && skuValid.valid === true,
      assertionDetail: `Duplicate 'dl-serum-01' blocked (${skuDup.error}); unique 'DL-TONER-09' accepted.`,
    });

    // Test 2: Inventory Negative Stock Prevention
    const negStock = validateStockAdjustment({
      currentStockOnHand: 10,
      reservedQuantity: 4,
      deltaQuantity: -8, // Would leave -2 available
      allowBackorders: false,
      reasonCode: 'DAMAGED',
      notes: 'Damaged bottle test',
    });
    results.push({
      id: 'TEST-02',
      category: 'Inventory Consistency',
      name: 'Prevention of Negative Available Stock When Backorders Disabled',
      passed: negStock.valid === false && negStock.newAvailableQuantity === -2,
      assertionDetail: `Stock adjustment of -8 on 6 available units rejected: "${negStock.error}"`,
    });

    // Test 3: Mandatory Audit Notes for Large Stock Adjustments (≥50 units)
    const largeAdjNoNote = validateStockAdjustment({
      currentStockOnHand: 100,
      reservedQuantity: 0,
      deltaQuantity: -60,
      allowBackorders: false,
      reasonCode: 'CYCLE_COUNT_RECONCILIATION',
      notes: 'short',
    });
    results.push({
      id: 'TEST-03',
      category: 'Inventory Consistency',
      name: 'Mandatory Detailed Audit Notes on Adjustments ≥ 50 Units',
      passed: largeAdjNoNote.valid === false,
      assertionDetail: `Adjustment of -60 units with short note rejected: "${largeAdjNoNote.error}"`,
    });

    // Test 4: FEFO (First-Expired, First-Out) Sorting & Expired Quarantine
    const fefoOut = evaluateBatchFEFO(
      [
        {
          batchNumber: 'LOT-LATE',
          manufacturingDate: '2026-01-01',
          expiryDate: '2027-08-01',
          quantityRemaining: 40,
        },
        {
          batchNumber: 'LOT-EXPIRED',
          manufacturingDate: '2024-01-01',
          expiryDate: '2025-05-01',
          quantityRemaining: 15,
        },
        {
          batchNumber: 'LOT-SOONEST',
          manufacturingDate: '2026-01-01',
          expiryDate: '2026-11-15',
          quantityRemaining: 25,
        },
      ],
      '2026-10-22T00:00:00Z'
    );
    const soonest = fefoOut.find((b) => b.batchNumber === 'LOT-SOONEST');
    const expired = fefoOut.find((b) => b.batchNumber === 'LOT-EXPIRED');
    results.push({
      id: 'TEST-04',
      category: 'FEFO Batch & Expiry Engine',
      name: 'First-Expired First-Out Picking Order & Expired Lot Blocking',
      passed:
        soonest?.fefoRank === 1 &&
        expired?.status === 'EXPIRED' &&
        expired?.pickEligible === false,
      assertionDetail: `LOT-SOONEST ranked #1 for picking; LOT-EXPIRED marked EXPIRED and blocked from fulfillment.`,
    });

    // Test 5: Discount Stacking Rejection & Price Floor Clamp
    const calcResult = calculateTransparentCheckoutBreakdown({
      unitPrice: 500,
      quantity: 2, // Subtotal 1000
      productDiscountPercent: 20, // -200 => 800
      quantityTiers: [
        { minQuantity: 2, maxQuantity: null, discountType: 'FIXED_AMOUNT', discountValue: 150 },
      ], // -150 => 650
      couponCode: {
        code: 'NOSTACK50',
        type: 'PERCENTAGE',
        value: 50,
        minOrderValue: 500,
        allowStacking: false,
      },
      priceFloorPerUnit: 350, // Min allowed for 2 units = 700 (clamps 650 -> 700)
      baseShippingCharge: 79,
      freeShippingThreshold: 1500,
      gstRatePercent: 18,
    });
    results.push({
      id: 'TEST-05',
      category: 'Discount & Price Floor Engine',
      name: 'Non-Stackable Coupon Rejection & Price Floor Enforcement',
      passed:
        calcResult.couponDiscount === 0 &&
        calcResult.priceFloorAdjustment === 50 &&
        calcResult.netMerchandiseTotal === 700,
      assertionDetail: `Non-stackable coupon rejected; net merchandise clamped from ₹650 to ₹700 price floor (+₹50 adjustment).`,
    });

    // Test 6: Order State Transition Guard
    const invalidOrderStep = isValidOrderTransition('PENDING', 'DELIVERED');
    const validOrderStep = isValidOrderTransition('PENDING', 'CONFIRMED');
    results.push({
      id: 'TEST-06',
      category: 'Order Lifecycle State Machine',
      name: 'Block Invalid Order State Transitions (PENDING → DELIVERED)',
      passed: invalidOrderStep.valid === false && validOrderStep.valid === true,
      assertionDetail: `Direct jump PENDING → DELIVERED blocked; PENDING → CONFIRMED permitted.`,
    });

    // Test 7: Courier Webhook Event Deduplication & Idempotency Key Generation
    const dupEvents = deduplicateShipmentEvents([
      { timestamp: '2026-10-22T04:00:00Z', statusCode: 'IN_TRANSIT', location: 'Mumbai Hub' },
      { timestamp: '2026-10-22T04:00:00Z', statusCode: 'in_transit', location: 'MUMBAI HUB' },
      { timestamp: '2026-10-22T08:00:00Z', statusCode: 'OUT_FOR_DELIVERY', location: 'Pune Hub' },
    ]);
    const idemKey = apiClient.generateIdempotencyKey('refund');
    results.push({
      id: 'TEST-07',
      category: 'Shipment & Refund Idempotency',
      name: 'Duplicate Courier Scan Filtering & Idempotency Key Generation',
      passed:
        dupEvents.uniqueEvents.length === 2 &&
        dupEvents.duplicatesRemoved === 1 &&
        idemKey.startsWith('dl-idem-refund-'),
      assertionDetail: `Removed 1 duplicate webhook scan event; generated idempotency key ${idemKey}.`,
    });

    setTestResults(results);
    setLastRunAt(new Date().toISOString());
    onRecordAudit(
      'RUN_QA_VERIFICATION_SUITE',
      'QA & Verification Center',
      'SUITE-ALL',
      `Executed ${results.length} deterministic verification tests (${results.filter((r) => r.passed).length}/${results.length} passed)`
    );
  };

  React.useEffect(() => {
    if (testResults.length === 0) {
      runDeterministicTestSuite();
    }
  }, []);

  return (
    <div className="space-y-6">
      <IntegrationBanner
        moduleName="Store Settings, Owner Access Control, Audit Logs, API Contracts, Backup Status & Media Storage"
        endpointPath="/api/v1/admin/settings/store · /api/v1/admin/auth/session · /api/v1/admin/audit-logs"
        isBackendConfigured={isBackendConfigured}
        sandboxActive={sandboxMode}
        externalDependency="Backend Session Store, Object Storage & Cloud Backup Monitor"
      />

      {/* Sub-navigation bar */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
        {(
          [
            { id: 'store_settings', label: '21. Store Settings' },
            { id: 'owner_access_control', label: '22. Owner Auth & Access Control' },
            { id: 'audit_security', label: `23. Audit Logs (${auditLogs.length})` },
            { id: 'api_contracts', label: `24. API Integration & Docs (${PROPOSED_API_CONTRACTS.length})` },
            { id: 'backup_recovery', label: '25. Backup & Recovery Status' },
            { id: 'media_storage', label: 'Media Storage' },
            { id: 'qa_verification', label: 'QA Verification Suite' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === tab.id
                ? 'bg-white text-[#3B0764] shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 21. STORE SETTINGS */}
      {subTab === 'store_settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Store Identity, Tax (GST), Currency & Operational Preferences
              </h3>
              <p className="text-xs text-slate-500">
                Payment and notification providers are never shown as enabled until verified by the backend. Secrets remain exclusively on the server.
              </p>
            </div>

            {settingsSavedNotice && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                {settingsSavedNotice}
              </div>
            )}

            <form onSubmit={handleSaveStoreSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Store Name</label>
                  <input
                    type="text"
                    value={storeSettings.storeName}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, storeName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand Tagline</label>
                  <input
                    type="text"
                    value={storeSettings.tagline}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, tagline: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Support Email</label>
                  <input
                    type="email"
                    value={storeSettings.supportEmail}
                    onChange={(e) =>
                      setStoreSettings({ ...storeSettings, supportEmail: e.target.value })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={storeSettings.gstinNumber}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        gstinNumber: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="27AAACD0000A1Z5"
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Default Beauty/Skincare GST (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="28"
                    value={storeSettings.defaultGstPercent}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        defaultGstPercent: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Currency & Timezone
                  </label>
                  <input
                    type="text"
                    disabled
                    value="INR (₹) · Asia/Kolkata (IST)"
                    className="w-full px-3 py-2 font-mono border border-slate-200 bg-slate-100 text-slate-600 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Default Low-Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={storeSettings.lowStockDefaultThreshold}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        lowStockDefaultThreshold: parseInt(e.target.value, 10) || 5,
                      })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    FEFO Near-Expiry Alert Window (Days)
                  </label>
                  <input
                    type="number"
                    min="15"
                    value={storeSettings.nearExpiryAlertDays}
                    onChange={(e) =>
                      setStoreSettings({
                        ...storeSettings,
                        nearExpiryAlertDays: parseInt(e.target.value, 10) || 60,
                      })
                    }
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2 font-semibold text-white bg-[#3B0764] hover:bg-[#2a0548] rounded-lg cursor-pointer"
              >
                Save Store Settings Configuration
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-xs">
            <h3 className="text-sm font-semibold text-slate-900">
              External Provider Configuration Status
            </h3>
            <p className="text-slate-500">
              Honest verification states for third-party payment, courier, and messaging providers:
            </p>
            <div className="space-y-2.5 pt-1">
              <div className="p-3 rounded-lg bg-[#FAF9F6] border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">Payment Gateway (Razorpay/Cashfree)</div>
                  <div className="text-[11px] text-slate-500">Server-side webhook secret required</div>
                </div>
                <span className="font-mono text-amber-700 font-semibold">PENDING</span>
              </div>
              <div className="p-3 rounded-lg bg-[#FAF9F6] border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">Courier Tracking API (Delhivery/Shiprocket)</div>
                  <div className="text-[11px] text-slate-500">Live AWB scan webhook pending</div>
                </div>
                <span className="font-mono text-amber-700 font-semibold">PENDING</span>
              </div>
              <div className="p-3 rounded-lg bg-[#FAF9F6] border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">Email / WhatsApp Notification API</div>
                  <div className="text-[11px] text-slate-500">Requires opt-in consent & provider key</div>
                </div>
                <span className="font-mono text-amber-700 font-semibold">PENDING</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 22. OWNER AUTHENTICATION & ACCESS CONTROL */}
      {subTab === 'owner_access_control' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Lock className="w-4 h-4 text-[#3B0764]" />
              <h3>Owner-Only Authentication & Access Control Architecture</h3>
            </div>
            <p className="text-slate-600">
              This dashboard is designed exclusively for the authorized store owner of Dazzlinglooks.in:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>
                <strong>No Client-Side Security Bypass:</strong> Never treats a hidden URL, frontend email comparison, or `localStorage` flag as authorization.
              </li>
              <li>
                <strong>No Hardcoded Credentials:</strong> Zero universal passwords, API keys, database credentials, or payment secrets exist in browser code.
              </li>
              <li>
                <strong>Server-Side Session Verification:</strong> Every privileged operation requires an authenticated HTTP-only `SameSite=Strict` session cookie and `X-CSRF-Token` verified by the backend.
              </li>
              <li>
                <strong>Current Auth Provider Status:</strong>{' '}
                <span className="font-mono font-semibold text-amber-700">
                  {session.authProviderStatus}
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-xs">
            <h3 className="text-sm font-semibold text-slate-900">
              Privileged Role Matrix (Server-Enforced)
            </h3>
            <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">STORE_OWNER (Primary Administrator)</span>
                <span className="font-mono text-[#3B0764] font-semibold">REQUIRED ROLE</span>
              </div>
              <p className="text-slate-500">
                Full access to catalogue, pricing, inventory adjustments, discount rules, refunds, manual AWB entry, customer PII unmasking (audited), and store settings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 23. AUDIT LOGS */}
      {subTab === 'audit_security' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Immutable Administrative Audit Log (Append-Only)
              </h3>
              <p className="text-xs text-slate-500">
                Records actor, timestamp, action, affected record, and outcome. Audit entries cannot be edited or deleted through dashboard controls.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Module · Action</th>
                  <th className="py-2.5 px-4">Record ID</th>
                  <th className="py-2.5 px-4">Outcome · Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{log.actorEmail}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#3B0764]">{log.action}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="text-slate-600">{log.module}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{log.affectedRecordId}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="font-mono font-semibold text-slate-800">[{log.result}]</span>{' '}
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 24. API INTEGRATION & DOCUMENTATION */}
      {subTab === 'api_contracts' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Configurable API Base URL (`VITE_API_BASE_URL`)
            </h3>
            <p className="text-xs text-slate-500">
              Configure the target backend URL developed by your friend for the customer website. All endpoints below are documented as Proposed Contracts until verified against the shared backend. Never place private secrets in `VITE_` variables.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                value={runtimeUrlInput}
                onChange={(e) => setRuntimeUrlInput(e.target.value)}
                placeholder="https://api.dazzlinglooks.in/v1"
                className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  onUpdateApiBaseUrl(runtimeUrlInput);
                  setUrlSavedMsg(
                    runtimeUrlInput.trim()
                      ? `Runtime API Base URL set to ${runtimeUrlInput.trim()}.`
                      : 'API Base URL cleared (Backend Integration Pending mode).'
                  );
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#3B0764] hover:bg-[#2a0548] rounded-lg whitespace-nowrap cursor-pointer"
              >
                Update API Target URL
              </button>
            </div>
            {urlSavedMsg && <p className="text-xs text-emerald-700 font-medium">{urlSavedMsg}</p>}
          </div>

          <div className="space-y-4">
            {PROPOSED_API_CONTRACTS.map((contract) => (
              <div
                key={contract.id}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#FF6B00]">{contract.method}</span>
                    <span className="font-mono font-semibold text-slate-900">{contract.path}</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#3B0764] font-semibold">
                    {contract.status} · {contract.id} ({contract.module})
                  </span>
                </div>

                <p className="text-slate-700 font-medium">{contract.purpose}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                  <div className="p-3 rounded-lg bg-[#FAF9F6] border border-slate-200">
                    <div className="text-slate-500 mb-1 font-sans font-semibold">
                      Request Schema & Auth:
                    </div>
                    <div className="text-slate-800 break-words">{contract.requestSchema}</div>
                    <div className="text-slate-500 mt-1">
                      Auth: {contract.authRequired} · Idempotency-Key:{' '}
                      {contract.idempotencyKeyRequired ? 'REQUIRED' : 'Optional'}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#FAF9F6] border border-slate-200">
                    <div className="text-slate-500 mb-1 font-sans font-semibold">
                      Expected Response & Error Codes:
                    </div>
                    <div className="text-slate-800 break-words">{contract.responseSchema}</div>
                    <div className="text-slate-500 mt-1">
                      Errors: {contract.errorCodes.join(' | ')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 25. BACKUP AND RECOVERY STATUS */}
      {subTab === 'backup_recovery' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#FF6B00]" />
              <h3 className="text-sm font-semibold text-slate-900">
                Database & Media Backup / Recovery Status
              </h3>
            </div>
            <span className="font-mono font-semibold text-amber-700">
              BACKUP STATUS: UNVERIFIED (AWAITING INFRASTRUCTURE)
            </span>
          </div>

          <p className="text-slate-600">
            In strict compliance with Section 29, this dashboard never claims that database or media backups exist or have succeeded until verified by the production infrastructure. No backup credentials are exposed in frontend code.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900">
                1. Shared PostgreSQL Database Backup Protocol
              </div>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>Automated daily encrypted snapshots with 30-day retention.</li>
                <li>Continuous Write-Ahead Log (WAL) archiving for Point-in-Time Recovery (PITR) prior to bulk catalogue or stock mutations.</li>
                <li>Restoration drills must be executed on an isolated staging database before switching production traffic.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900">
                2. Object Storage & Media Recovery Protocol
              </div>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>Bucket object versioning enabled for product images, banners, and review attachments.</li>
                <li>Soft-delete retention policy (14 days) to prevent broken product gallery references.</li>
                <li>Cross-region replication recommended for production storefront media assets.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 30. MEDIA STORAGE & SIGNED UPLOAD GATEWAY */}
      {subTab === 'media_storage' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Media Storage & Presigned Upload Validator (Hostinger / S3-Compatible)
            </h3>
            <p className="text-xs text-slate-500">
              Validates MIME type (JPEG/PNG/WebP), file-size cap (≤5 MB), and filename sanitization before requesting a short-lived signed upload URL from the backend. Never embeds storage credentials in frontend code.
            </p>
          </div>

          <div className="p-6 border-2 border-dashed border-slate-300 rounded-xl bg-[#FAF9F6] text-center space-y-3">
            <UploadCloud className="w-8 h-8 text-[#3B0764] mx-auto" />
            <div className="text-xs text-slate-700 font-medium">
              Select a product, banner, or review image to test pre-flight validation
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#3B0764] file:text-white hover:file:bg-[#2a0548] cursor-pointer"
            />
          </div>

          {mediaValidationMsg && (
            <div
              className={`p-4 rounded-xl border text-xs ${
                mediaValidationMsg.valid
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {mediaValidationMsg.text}
            </div>
          )}
        </div>
      )}

      {/* 35. QA VERIFICATION SUITE & HONEST COMPLETION REPORT */}
      {subTab === 'qa_verification' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Automated Frontend & Business-Rule Verification Suite
                </h3>
                <p className="text-xs text-slate-500">
                  Executes real deterministic assertions against the discount calculator, FEFO batch engine, inventory negative-stock guard, order state machine, and webhook deduplicator.
                </p>
              </div>
              <button
                type="button"
                onClick={runDeterministicTestSuite}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#3B0764] hover:bg-[#2a0548] rounded-lg cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Re-Run Verification Suite</span>
              </button>
            </div>

            {lastRunAt && (
              <div className="text-xs font-mono text-slate-500">
                Last Executed: {new Date(lastRunAt).toLocaleString()} · Passed:{' '}
                {testResults.filter((t) => t.passed).length} / {testResults.length}
              </div>
            )}

            <div className="divide-y divide-slate-100 text-xs">
              {testResults.map((t) => (
                <div key={t.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900">
                      {t.id}: {t.name}{' '}
                      <span className="text-slate-500 font-normal">({t.category})</span>
                    </div>
                    <div className="text-slate-600 font-mono text-[11px]">{t.assertionDetail}</div>
                  </div>
                  <span
                    className={`font-mono font-bold shrink-0 ${
                      t.passed ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {t.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
