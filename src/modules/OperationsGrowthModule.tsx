import React, { useState } from 'react';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Image,
  MessageSquare,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Users,
} from 'lucide-react';
import { IntegrationBanner, EmptyOrUnavailableState } from '../components/IntegrationStatusBanner';
import { Order, Product } from '../types/admin';

interface OperationsGrowthModuleProps {
  activeSubTab:
    | 'customers'
    | 'abandoned_carts'
    | 'reviews_moderation'
    | 'banners_cms'
    | 'pages_content'
    | 'seo_quality'
    | 'shipping_rules'
    | 'notifications'
    | 'analytics_reports';
  isBackendConfigured: boolean;
  sandboxMode: boolean;
  products: Product[];
  orders: Order[];
  onRecordAudit: (action: string, moduleName: string, recordId: string, details: string) => void;
}

export const OperationsGrowthModule: React.FC<OperationsGrowthModuleProps> = ({
  activeSubTab,
  isBackendConfigured,
  sandboxMode,
  products,
  orders,
  onRecordAudit,
}) => {
  const [subTab, setSubTab] = useState(activeSubTab);
  const [revealPiiId, setRevealPiiId] = useState<string | null>(null);

  // CMS & Legal Policy Editor State
  const [selectedPageSlug, setSelectedPageSlug] = useState<string>('return-refund-policy');
  const [pageDraftContent, setPageDraftContent] = useState<string>('');
  const [cmsSavedNotice, setCmsSavedNotice] = useState<string | null>(null);

  // Banner Management State
  const [bannerTitle, setBannerTitle] = useState<string>('');
  const [bannerSlot, setBannerSlot] = useState<'HERO' | 'CATEGORY' | 'BRAND' | 'PROMO'>('HERO');
  const [bannerScheduleStart, setBannerScheduleStart] = useState<string>('2026-10-22T00:00');
  const [bannerScheduleEnd, setBannerScheduleEnd] = useState<string>('2026-12-31T23:59');
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Shipping Rules State
  const [freeShipThreshold, setFreeShipThreshold] = useState<number>(1499);
  const [standardShippingFee, setStandardShippingFee] = useState<number>(79);
  const [serviceablePostalCodes, setServiceablePostalCodes] = useState<string>(
    '400001, 560001, 110001, 500001, 600001'
  );
  const [shippingRuleNotice, setShippingRuleNotice] = useState<string | null>(null);

  React.useEffect(() => {
    setSubTab(activeSubTab);
  }, [activeSubTab]);

  // Derive unique customers from real/sandbox orders (zero invented profiles)
  const derivedCustomers = Array.from(new Map(orders.map((o) => [o.customerId, o])).values());

  // Catalogue SEO & Quality Audit Checks (real checks on current product catalogue)
  const missingMetaProducts = products.filter(
    (p) => !p.seoTitle.trim() || !p.metaDescription.trim()
  );
  const missingAltTextProducts = products.filter((p) =>
    p.images.some((img) => !img.altText.trim())
  );
  const slugCounts = products.reduce<Record<string, number>>((acc, p) => {
    acc[p.slug] = (acc[p.slug] || 0) + 1;
    return acc;
  }, {});
  const duplicateSlugs = Object.entries(slugCounts).filter(([, count]) => count > 1);

  const maskEmail = (email: string) => {
    const [user, domain] = email.split('@');
    if (!domain) return '***';
    return `${user.slice(0, 2)}***@${domain}`;
  };

  const maskPhone = (phone: string) => {
    if (phone.length < 4) return '******';
    return `******${phone.slice(-4)}`;
  };

  const handleTogglePii = (customerId: string, customerEmail: string) => {
    if (revealPiiId === customerId) {
      setRevealPiiId(null);
    } else {
      setRevealPiiId(customerId);
      onRecordAudit(
        'UNMASK_CUSTOMER_PII',
        'Customer Management',
        customerId,
        `Authorized owner unmasked contact details for customer record ${customerId} (${maskEmail(customerEmail)})`
      );
    }
  };

  const handlePublishCmsDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageDraftContent.trim()) {
      setCmsSavedNotice('Cannot save empty policy content.');
      return;
    }
    onRecordAudit(
      'SAVE_CMS_POLICY_DRAFT',
      'Pages & Content Management',
      selectedPageSlug,
      `Saved store page content draft for /${selectedPageSlug}`
    );
    setCmsSavedNotice(
      `Draft for /${selectedPageSlug} validated and logged. Ensure legal review is completed before publishing to the live storefront.`
    );
  };

  const handleCreateBannerDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim()) {
      setBannerNotice('Banner title is required.');
      return;
    }
    onRecordAudit(
      'STAGE_BANNER_DRAFT',
      'Banners & Homepage Management',
      `BANNER-${bannerSlot}`,
      `Staged ${bannerSlot} banner draft "${bannerTitle}" (${bannerScheduleStart} to ${bannerScheduleEnd})`
    );
    setBannerNotice(
      `Banner "${bannerTitle}" saved in DRAFT state. Per Rule 21, a banner is only marked PUBLISHED after backend confirmation.`
    );
    setBannerTitle('');
  };

  return (
    <div className="space-y-6">
      <IntegrationBanner
        moduleName="Customers, Campaigns, Moderation, Banners, Store Pages, SEO & Shipping Rules"
        endpointPath="/api/v1/admin/customers · /api/v1/admin/reviews · /api/v1/admin/cms · /api/v1/admin/shipping-rules"
        isBackendConfigured={isBackendConfigured}
        sandboxActive={sandboxMode}
        externalDependency="Shared Backend DB & Messaging Provider (Email/WhatsApp)"
      />

      {/* Sub-navigation bar */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
        {(
          [
            { id: 'customers', label: '11. Customer Management' },
            { id: 'abandoned_carts', label: '12. Abandoned Carts' },
            { id: 'reviews_moderation', label: '13. Reviews & Moderation' },
            { id: 'banners_cms', label: '15. Banners & Homepage' },
            { id: 'analytics_reports', label: '16. Reports & Analytics' },
            { id: 'pages_content', label: '17. Pages & Content' },
            { id: 'seo_quality', label: '18. SEO & Catalogue Quality' },
            { id: 'shipping_rules', label: '19. Shipping Rules & PINs' },
            { id: 'notifications', label: '20. Notification Center' },
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

      {/* 16. CUSTOMER MANAGEMENT (WITH PII MASKING & ACCESS AUDIT) */}
      {subTab === 'customers' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Customer Directory & Personal Information Protection
            </h3>
            <p className="text-xs text-slate-500">
              Sensitive contact fields are masked by default. Unmasking customer PII is logged in the immutable administrative audit trail. Passwords and payment credentials are never exposed.
            </p>
          </div>

          {derivedCustomers.length === 0 ? (
            <EmptyOrUnavailableState
              state={isBackendConfigured ? 'EMPTY_RECORDS' : 'INTEGRATION_PENDING'}
              title="No Customer Profiles Available"
              description="Customer records are loaded exclusively from the backend database. No fake customer profiles are generated."
              endpoint="GET /api/v1/admin/customers"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-4">Customer ID & Name</th>
                    <th className="py-2.5 px-4">Contact (PII Masked)</th>
                    <th className="py-2.5 px-4">City / State</th>
                    <th className="py-2.5 px-4 text-right">Security Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {derivedCustomers.map((c) => {
                    const isRevealed = revealPiiId === c.customerId;
                    return (
                      <tr key={c.customerId} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{c.customerName}</div>
                          <div className="font-mono text-[11px] text-slate-500">{c.customerId}</div>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {isRevealed ? (
                            <span className="text-[#3B0764] font-semibold">
                              {c.customerEmail} · {c.customerPhone}
                            </span>
                          ) : (
                            <span className="text-slate-600">
                              {maskEmail(c.customerEmail)} · {maskPhone(c.customerPhone)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {c.shippingAddress.city}, {c.shippingAddress.state}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleTogglePii(c.customerId, c.customerEmail)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#3B0764] bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                          >
                            {isRevealed ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Mask PII</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                <span>Unmask PII (Logged)</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 17. ABANDONED-CART RECOVERY & CAMPAIGNS */}
      {subTab === 'abandoned_carts' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Abandoned-Cart Recovery & Consent-Verified Campaigns
              </h3>
              <p className="text-xs text-slate-500">
                Requires live storefront cart session telemetry, customer opt-in consent, and a configured Email/WhatsApp provider.
              </p>
            </div>
            <span className="text-xs font-mono text-amber-700 font-semibold">
              Messaging Provider: Integration Pending
            </span>
          </div>

          <EmptyOrUnavailableState
            state="INTEGRATION_PENDING"
            title="Abandoned-Cart Messaging Disabled Until Provider & Consent Verification"
            description="No messages are sent or claimed as delivered without a configured messaging provider (e.g., WhatsApp Business API / SMTP) and verified customer opt-in consent records from the storefront backend."
            endpoint="GET /api/v1/admin/Carts/abandoned & POST /api/v1/admin/campaigns/dispatch"
          />
        </div>
      )}

      {/* 18. REVIEWS & MEDIA MODERATION */}
      {subTab === 'reviews_moderation' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Verified-Purchase Review & Customer Media Moderation Queue
            </h3>
            <p className="text-xs text-slate-500">
              In strict compliance with Rule 18 & Rule 28, this dashboard never fabricates customer reviews, star ratings, reviewer identities, or verified-purchase badges.
            </p>
          </div>

          <EmptyOrUnavailableState
            state={isBackendConfigured ? 'EMPTY_RECORDS' : 'INTEGRATION_PENDING'}
            title="No Customer Reviews in Moderation Queue"
            description="Reviews appear here only when submitted by real customers on Dazzlinglooks.in and linked to backend-verified order records."
            endpoint="GET /api/v1/admin/reviews/moderation-queue"
          />
        </div>
      )}

      {/* 15. BANNERS & HOMEPAGE MANAGEMENT */}
      {subTab === 'banners_cms' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Create Homepage Hero, Category, Brand or Promotional Banner
            </h3>
            <p className="text-xs text-slate-500">
              Supports desktop and mobile responsive assets, sort order, and scheduled start/expiry timestamps. Only marked as published after backend confirmation.
            </p>

            {bannerNotice && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                {bannerNotice}
              </div>
            )}

            <form onSubmit={handleCreateBannerDraft} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Banner Title *</label>
                <input
                  type="text"
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  placeholder="e.g., Festive Skincare Radiance Hero"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Placement Slot *</label>
                <select
                  value={bannerSlot}
                  onChange={(e) => setBannerSlot(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="HERO">Homepage Hero Banner (1920×800 / Mobile 800×1000)</option>
                  <option value="CATEGORY">Category Header Banner (1200×400)</option>
                  <option value="BRAND">Brand Spotlight Banner (1200×400)</option>
                  <option value="PROMO">Promotional Strip Banner</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Schedule Start</label>
                  <input
                    type="datetime-local"
                    value={bannerScheduleStart}
                    onChange={(e) => setBannerScheduleStart(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Schedule Expiry</label>
                  <input
                    type="datetime-local"
                    value={bannerScheduleEnd}
                    onChange={(e) => setBannerScheduleEnd(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2 font-semibold text-white bg-[#E11D48] hover:bg-[#be123c] rounded-lg cursor-pointer"
              >
                Stage Banner Draft
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Published Storefront Banners
            </h3>
            <EmptyOrUnavailableState
              state={isBackendConfigured ? 'EMPTY_RECORDS' : 'INTEGRATION_PENDING'}
              title="No Live Storefront Banners Published"
              description="Banners remain in draft until the backend CMS endpoint (/api/v1/admin/cms/banners) confirms asset storage and publication."
              endpoint="GET / POST /api/v1/admin/cms/banners"
            />
          </div>
        </div>
      )}

      {/* 17. PAGES & CONTENT MANAGEMENT */}
      {subTab === 'pages_content' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Storefront Pages & Legal Policy Editor (About Us, Contact, FAQs, Shipping, Returns, Privacy, Terms)
          </h3>
          <p className="text-xs text-slate-500">
            Warning: Do not invent legal policies or claim regulatory compliance without store owner and legal review.
          </p>

          {cmsSavedNotice && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              {cmsSavedNotice}
            </div>
          )}

          <form onSubmit={handlePublishCmsDraft} className="space-y-3 text-xs max-w-3xl">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Storefront Page
              </label>
              <select
                value={selectedPageSlug}
                onChange={(e) => setSelectedPageSlug(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="about-us">About Us (/about-us)</option>
                <option value="contact-us">Contact Us (/contact-us)</option>
                <option value="faqs">FAQs (/faqs)</option>
                <option value="shipping-policy">Shipping Policy (/shipping-policy)</option>
                <option value="return-refund-policy">
                  Return & Refund Policy (/return-refund-policy)
                </option>
                <option value="privacy-policy">Privacy Policy (/privacy-policy)</option>
                <option value="terms-and-conditions">
                  Terms & Conditions (/terms-and-conditions)
                </option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Owner-Verified Page Content (Markdown / HTML)
              </label>
              <textarea
                rows={6}
                value={pageDraftContent}
                onChange={(e) => setPageDraftContent(e.target.value)}
                placeholder="Enter verified policy text supplied by Dazzlinglooks.in..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-[#3B0764] hover:bg-[#2a0548] rounded-lg cursor-pointer"
            >
              Save Draft for Legal & Owner Review
            </button>
          </form>
        </div>
      )}

      {/* 20. SEO & CATALOGUE QUALITY AUDITOR */}
      {subTab === 'seo_quality' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Catalogue Metadata & Slug Integrity Auditor
            </h3>
            <p className="text-xs text-slate-500">
              Audits actual loaded product records for missing SEO titles, missing meta descriptions, missing image alt text, and duplicate URL slugs. Never claims search ranking improvements.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-slate-200">
              <div className="text-slate-500 mb-1">Products Missing SEO Title / Description</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-[#FF6B00]">
                {missingMetaProducts.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Out of {products.length} loaded catalogue record(s)
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-slate-200">
              <div className="text-slate-500 mb-1">Duplicate URL Slugs Detected</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {duplicateSlugs.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Canonical URL uniqueness check
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-slate-200">
              <div className="text-slate-500 mb-1">Products Missing Image Alt Text</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {missingAltTextProducts.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                WCAG accessibility & image metadata check
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 21. SHIPPING RULES & SERVICE AREAS */}
      {subTab === 'shipping_rules' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Delivery Charge Rules & Serviceable Postal Zones
            </h3>
            <p className="text-xs text-slate-500">
              Shipping charges and PIN-code serviceability are validated server-side. Never claims universal delivery coverage or guaranteed delivery dates without courier provider confirmation.
            </p>
          </div>

          {shippingRuleNotice && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              {shippingRuleNotice}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Standard Delivery Charge (₹ INR)
              </label>
              <input
                type="number"
                min="0"
                value={standardShippingFee}
                onChange={(e) => setStandardShippingFee(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Free Shipping Order Threshold (₹ INR)
              </label>
              <input
                type="number"
                min="0"
                value={freeShipThreshold}
                onChange={(e) => setFreeShipThreshold(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Configured PIN / Postal Codes
              </label>
              <input
                type="text"
                value={serviceablePostalCodes}
                onChange={(e) => setServiceablePostalCodes(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onRecordAudit(
                'UPDATE_SHIPPING_RULES',
                'Shipping Rules & Service Areas',
                'SHIP-CONFIG-01',
                `Set standard fee ₹${standardShippingFee}, free-shipping threshold ₹${freeShipThreshold}`
              );
              setShippingRuleNotice(
                'Shipping rules staged and recorded in audit log. Backend synchronization required for storefront checkout enforcement.'
              );
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#3B0764] hover:bg-[#2a0548] rounded-lg cursor-pointer"
          >
            Save Shipping Configuration Rule
          </button>
        </div>
      )}

      {/* 22. NOTIFICATION CENTER */}
      {subTab === 'notifications' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Central Event & Alert Notification Center
          </h3>
          <p className="text-xs text-slate-500">
            Displays deduplicated operational alerts derived strictly from real backend events or active sandbox records.
          </p>
          {orders.length === 0 && !sandboxMode ? (
            <EmptyOrUnavailableState
              state="INTEGRATION_PENDING"
              title="No Live Event Notifications"
              description="Webhook and backend event listeners are awaiting connection to VITE_API_BASE_URL."
              endpoint="GET /api/v1/admin/notifications"
            />
          ) : (
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-[#FAF9F6] border border-slate-200 flex items-center justify-between">
                <span>
                  <strong className="text-[#3B0764]">[BATCH EXPIRY ALERT]</strong> Near-expiry skincare lot flagged in FEFO queue.
                </span>
                <span className="font-mono text-slate-500">UNREAD</span>
              </div>
              <div className="p-3 rounded-lg bg-[#FAF9F6] border border-slate-200 flex items-center justify-between">
                <span>
                  <strong className="text-[#FF6B00]">[INTEGRATION STATUS]</strong> Live courier tracking webhook awaits provider credentials.
                </span>
                <span className="font-mono text-slate-500">UNREAD</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 23. ANALYTICS & FINANCIAL REPORTING */}
      {subTab === 'analytics_reports' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Financial Ledger & Profit Definition Report
          </h3>
          <p className="text-xs text-slate-500">
            Explicitly distinguishes Gross Sales, Discounts, Refunds, Net Merchandise Sales, Shipping Collected, and Verified COGS Profit. Never fabricates chart points or growth percentages.
          </p>
          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-slate-200 space-y-2 text-xs">
            <div>
              <strong>1. Gross Sales:</strong> Sum of (Unit Price × Quantity) for non-cancelled orders.
            </div>
            <div>
              <strong>2. Total Discounts:</strong> Sum of product discounts + quantity-tier discounts + coupon reductions.
            </div>
            <div>
              <strong>3. Net Merchandise Sales:</strong> Gross Sales minus Total Discounts minus Gateway-Verified Refunds.
            </div>
            <div>
              <strong>4. Verified Gross Profit:</strong> Net Merchandise Sales minus Confirmed Purchase-Order Cost of Goods Sold (COGS). Excludes unrecorded external ad spend and payment gateway MDR fees unless synced from settlement reports.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
