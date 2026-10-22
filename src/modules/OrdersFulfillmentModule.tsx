import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Truck,
} from 'lucide-react';
import { Order, OrderStatus, ReturnRequest, ShipmentRecord } from '../types/admin';
import { IntegrationBanner, EmptyOrUnavailableState } from '../components/IntegrationStatusBanner';
import {
  ALLOWED_ORDER_TRANSITIONS,
  deduplicateShipmentEvents,
  isValidOrderTransition,
} from '../utils/businessRules';

interface OrdersFulfillmentModuleProps {
  activeSubTab: 'orders' | 'payments_refunds' | 'shipments_tracking' | 'returns_exchanges';
  isBackendConfigured: boolean;
  sandboxMode: boolean;
  orders: Order[];
  shipments: ShipmentRecord[];
  returns: ReturnRequest[];
  onTransitionOrderStatus: (orderId: string, nextStatus: OrderStatus, notes: string) => void;
  onInitiateRefund: (orderId: string, amount: number, reason: string) => void;
  onSaveManualShipment: (shipment: ShipmentRecord) => void;
  onInspectReturnDecision: (
    returnId: string,
    approval: 'APPROVED' | 'REJECTED',
    restock: 'APPROVED_RESELLABLE' | 'QUARANTINE_DISPOSE'
  ) => void;
}

export const OrdersFulfillmentModule: React.FC<OrdersFulfillmentModuleProps> = ({
  activeSubTab,
  isBackendConfigured,
  sandboxMode,
  orders,
  shipments,
  returns,
  onTransitionOrderStatus,
  onInitiateRefund,
  onSaveManualShipment,
  onInspectReturnDecision,
}) => {
  const [subTab, setSubTab] = useState<
    'orders' | 'payments_refunds' | 'shipments_tracking' | 'returns_exchanges'
  >(activeSubTab);

  // Order search & transition state
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [targetNextStatus, setTargetNextStatus] = useState<OrderStatus>('CONFIRMED');
  const [transitionNote, setTransitionNote] = useState('');
  const [transitionFeedback, setTransitionFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  // Refund state
  const [refundOrderId, setRefundOrderId] = useState<string>(orders[0]?.id || '');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState<string>('');
  const [refundNotice, setRefundNotice] = useState<string | null>(null);

  // Manual Courier & AWB Booking state
  const [shipOrderId, setShipOrderId] = useState<string>(orders[0]?.id || '');
  const [courierName, setCourierName] = useState<string>('Delhivery Surface');
  const [awbNumber, setAwbNumber] = useState<string>('');
  const [trackingUrl, setTrackingUrl] = useState<string>('');
  const [shipFeedback, setShipFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    setSubTab(activeSubTab);
  }, [activeSubTab]);

  React.useEffect(() => {
    if (!selectedOrderId && orders.length > 0) setSelectedOrderId(orders[0].id);
    if (!refundOrderId && orders.length > 0) setRefundOrderId(orders[0].id);
    if (!shipOrderId && orders.length > 0) setShipOrderId(orders[0].id);
  }, [orders, selectedOrderId, refundOrderId, shipOrderId]);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  const handleOrderTransition = (e: React.FormEvent) => {
    e.preventDefault();
    setTransitionFeedback(null);
    if (!selectedOrder) return;

    const check = isValidOrderTransition(selectedOrder.status, targetNextStatus);
    if (!check.valid) {
      setTransitionFeedback({
        type: 'error',
        text: check.reason || 'Invalid order state transition.',
      });
      return;
    }

    onTransitionOrderStatus(
      selectedOrder.id,
      targetNextStatus,
      transitionNote.trim() || `Transitioned to ${targetNextStatus}`
    );
    setTransitionNote('');
    setTransitionFeedback({
      type: 'success',
      text: `Order ${selectedOrder.orderNumber} state updated to ${targetNextStatus}.`,
    });
  };

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRefundNotice(null);
    const ord = orders.find((o) => o.id === refundOrderId);
    if (!ord) return;

    if (refundAmount <= 0 || refundAmount > ord.finalPayableAmount) {
      setRefundNotice(
        `Invalid refund amount. Must be between ₹1.00 and paid amount ₹${ord.finalPayableAmount.toFixed(2)}.`
      );
      return;
    }
    if (!refundReason.trim()) {
      setRefundNotice('A refund reason is mandatory for audit logging.');
      return;
    }

    onInitiateRefund(ord.id, refundAmount, refundReason.trim());
    setRefundReason('');
    setRefundNotice(
      isBackendConfigured
        ? `Refund request for ₹${refundAmount.toFixed(2)} dispatched with Idempotency-Key header. Awaiting payment provider webhook confirmation.`
        : `Refund request recorded in Pending Gateway state (₹${refundAmount.toFixed(2)}). In accordance with security rules, a refund is never marked complete until the payment provider confirms it.`
    );
  };

  const handleManualShipmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShipFeedback(null);
    const ord = orders.find((o) => o.id === shipOrderId);
    if (!ord) return;

    if (!awbNumber.trim() || awbNumber.trim().length < 5) {
      setShipFeedback('Enter a valid courier AWB / tracking number (minimum 5 characters).');
      return;
    }

    const newShip: ShipmentRecord = {
      id: `ship-${Date.now()}`,
      orderId: ord.id,
      orderNumber: ord.orderNumber,
      courierName: courierName.trim(),
      awbNumber: awbNumber.trim().toUpperCase(),
      trackingUrl:
        trackingUrl.trim() ||
        `https://www.delhivery.com/track/package/${awbNumber.trim().toUpperCase()}`,
      dispatchedAt: new Date().toISOString(),
      shipmentStatus: 'BOOKED_MANUAL',
      estimatedDeliveryDate: null, // Never fabricated; null unless supplied by courier API
      lastProviderSyncAt: null,
      liveTrackingConfigured: false,
      customerNotified: false,
      events: [],
    };

    onSaveManualShipment(newShip);
    setAwbNumber('');
    setTrackingUrl('');
    setShipFeedback(
      `Manual AWB ${newShip.awbNumber} (${newShip.courierName}) saved. Note: Manual AWB entry and external tracking link alone do not constitute live tracking—live courier webhook integration is labeled Pending Integration.`
    );
  };

  const filteredOrders = orders.filter((o) => {
    const q = orderSearch.trim().toLowerCase();
    return (
      !q ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <IntegrationBanner
        moduleName="Orders, Payment Refunds, Real Courier AWB Tracking & Returns Inspection"
        endpointPath="PATCH /api/v1/admin/orders/:id/status · POST /api/v1/admin/shipments/:orderId/awb"
        isBackendConfigured={isBackendConfigured}
        sandboxActive={sandboxMode}
        externalDependency="Payment Gateway API & Courier Aggregator Webhook Service"
      />

      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setSubTab('orders')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            subTab === 'orders'
              ? 'bg-white text-[#3B0764] shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Orders & State Machine ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('payments_refunds')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            subTab === 'payments_refunds'
              ? 'bg-white text-[#3B0764] shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Payments, Cancellations & Refunds
        </button>
        <button
          type="button"
          onClick={() => setSubTab('shipments_tracking')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            subTab === 'shipments_tracking'
              ? 'bg-white text-[#3B0764] shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Courier Booking & AWB Tracking ({shipments.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('returns_exchanges')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            subTab === 'returns_exchanges'
              ? 'bg-white text-[#3B0764] shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Returns & Restock Inspection ({returns.length})
        </button>
      </div>

      {/* 1. ORDERS & LIFECYCLE MANAGEMENT */}
      {subTab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search by order number, customer name or email..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="p-6">
                <EmptyOrUnavailableState
                  state={isBackendConfigured ? 'EMPTY_RECORDS' : 'INTEGRATION_PENDING'}
                  title="No Orders Loaded"
                  description="Orders are fetched from the shared Dazzlinglooks.in backend. Load isolated test fixtures from the Overview toolbar to test order lifecycle transitions."
                  endpoint="GET /api/v1/admin/orders"
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                      <th className="py-2.5 px-4">Order #</th>
                      <th className="py-2.5 px-4">Customer & Destination</th>
                      <th className="py-2.5 px-4">Order Status</th>
                      <th className="py-2.5 px-4">Payment</th>
                      <th className="py-2.5 px-4 text-right">Payable (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredOrders.map((ord) => (
                      <tr
                        key={ord.id}
                        onClick={() => setSelectedOrderId(ord.id)}
                        className={`cursor-pointer transition-colors ${
                          selectedOrderId === ord.id ? 'bg-[#3B0764]/5' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-[#3B0764]">
                          {ord.orderNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{ord.customerName}</div>
                          <div className="text-[11px] text-slate-500">
                            {ord.shippingAddress.city}, {ord.shippingAddress.state} ({ord.shippingAddress.postalCode})
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{ord.status}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {ord.paymentStatus} · <span className="font-mono">{ord.paymentMethod}</span>
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

          {/* Order Detail & Strict State Transition Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Order Lifecycle State Machine
            </h3>

            {!selectedOrder ? (
              <p className="text-xs text-slate-500">Select an order to inspect items and state transitions.</p>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-[#FAF9F6] border border-slate-200 space-y-1">
                  <div className="font-mono font-bold text-[#3B0764] text-sm">
                    {selectedOrder.orderNumber}
                  </div>
                  <div className="text-slate-700 font-medium">
                    Current Status: <span className="font-bold">{selectedOrder.status}</span>
                  </div>
                  <div className="text-slate-500">
                    Allowed Next States:{' '}
                    {ALLOWED_ORDER_TRANSITIONS[selectedOrder.status].length > 0
                      ? ALLOWED_ORDER_TRANSITIONS[selectedOrder.status].join(', ')
                      : 'None (Terminal State)'}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="font-semibold text-slate-700">Line Items & Price Breakdown:</div>
                  {selectedOrder.items.map((item) => (
                    <div key={item.variantId} className="flex justify-between text-slate-600">
                      <span>
                        {item.quantity}x {item.productName} ({item.variantName})
                      </span>
                      <span className="font-mono tabular-nums">₹{item.lineTotal.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                    <span>Verified Payable Total:</span>
                    <span className="font-mono tabular-nums">
                      ₹{selectedOrder.finalPayableAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {transitionFeedback && (
                  <div
                    className={`p-3 rounded-lg border ${
                      transitionFeedback.type === 'error'
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    {transitionFeedback.text}
                  </div>
                )}

                <form onSubmit={handleOrderTransition} className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Target Lifecycle State
                    </label>
                    <select
                      value={targetNextStatus}
                      onChange={(e) => setTargetNextStatus(e.target.value as OrderStatus)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      {(
                        [
                          'PENDING',
                          'CONFIRMED',
                          'PROCESSING',
                          'SHIPPED',
                          'DELIVERED',
                          'CANCELLED',
                          'RETURNED',
                        ] as OrderStatus[]
                      ).map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Audit Note
                    </label>
                    <input
                      type="text"
                      value={transitionNote}
                      onChange={(e) => setTransitionNote(e.target.value)}
                      placeholder="Reason or dispatch verification reference..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 font-semibold text-white bg-[#3B0764] hover:bg-[#2a0548] rounded-lg cursor-pointer"
                  >
                    Validate & Transition Order State
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. PAYMENTS, CANCELLATIONS & REFUNDS */}
      {subTab === 'payments_refunds' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Authorized Refund Initiation (Idempotent Gateway Contract)
            </h3>
            <p className="text-xs text-slate-500">
              Never marks a payment or refund as complete based on a frontend click alone. Refunds remain in PENDING_GATEWAY status until the payment provider confirms execution.
            </p>

            {refundNotice && (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                {refundNotice}
              </div>
            )}

            <form onSubmit={handleRefundSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Order *</label>
                <select
                  value={refundOrderId}
                  onChange={(e) => setRefundOrderId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {orders.length === 0 && <option value="">No orders loaded</option>}
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} — {o.customerName} (Paid: ₹{o.finalPayableAmount.toFixed(2)} · {o.paymentStatus})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Refund Amount (₹ INR — Full or Partial) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={refundAmount || ''}
                  onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mandatory Refund Reason & Audit Reference *
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g., Approved return inspection #RET-102"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={orders.length === 0}
                className="w-full py-2.5 px-4 font-semibold text-white bg-[#3B0764] hover:bg-[#2a0548] disabled:opacity-50 rounded-lg cursor-pointer"
              >
                Submit Idempotent Refund Request to Backend
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Payment Gateway & COD Configuration Status
            </h3>
            <p className="text-xs text-slate-500">
              Only backend-configured payment methods are enabled. No payment secrets or private gateway keys are stored in frontend code.
            </p>
            <div className="space-y-2.5 text-xs pt-2">
              <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">Online Prepaid Gateway (UPI / Cards / NetBanking)</div>
                  <div className="text-slate-500">Webhook signature verification required on backend</div>
                </div>
                <span className="font-mono text-amber-700 font-semibold">
                  {isBackendConfigured ? 'CONFIGURED' : 'INTEGRATION PENDING'}
                </span>
              </div>
              <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">Cash on Delivery (COD) Verification</div>
                  <div className="text-slate-500">Requires serviceable postal code & courier COD remittance</div>
                </div>
                <span className="font-mono text-amber-700 font-semibold">
                  {isBackendConfigured ? 'CONFIGURED' : 'INTEGRATION PENDING'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. REAL COURIER & SHIPMENT TRACKING */}
      {subTab === 'shipments_tracking' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Shipment & AWB Tracking Ledger
                </h3>
                <p className="text-xs text-slate-500">
                  Manual AWB entry and external tracking links are separated from live courier webhook tracking. Zero scan events or delivery dates are fabricated.
                </p>
              </div>
              <span className="text-xs font-mono text-amber-700 font-semibold">
                Live Courier API: Pending Integration
              </span>
            </div>

            {shipments.length === 0 ? (
              <EmptyOrUnavailableState
                state={isBackendConfigured ? 'EMPTY_RECORDS' : 'INTEGRATION_PENDING'}
                title="No Active Courier Shipments Recorded"
                description="Book a manual courier AWB on the right or load isolated test fixtures to inspect shipment event deduplication and exception alerts."
                endpoint="GET /api/v1/admin/shipments"
              />
            ) : (
              <div className="space-y-4">
                {shipments.map((sh) => {
                  const deduped = deduplicateShipmentEvents(sh.events);
                  return (
                    <div
                      key={sh.id}
                      className="p-4 rounded-xl bg-[#FAF9F6] border border-slate-200 space-y-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#3B0764]">
                            AWB: {sh.awbNumber}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-slate-900">{sh.courierName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-600">Order {sh.orderNumber}</span>
                        </div>
                        <span className="font-semibold text-[#FF6B00]">{sh.shipmentStatus}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                        <div>
                          Dispatched: <span className="font-mono">{new Date(sh.dispatchedAt).toLocaleDateString()}</span>
                        </div>
                        <div>
                          Provider EDD:{' '}
                          <span className="font-mono">
                            {sh.estimatedDeliveryDate || 'Not supplied by provider'}
                          </span>
                        </div>
                        <div>
                          Live Sync:{' '}
                          <span className="font-semibold">
                            {sh.liveTrackingConfigured
                              ? `Synced ${sh.lastProviderSyncAt}`
                              : 'Manual AWB Only (Live Webhook Pending)'}
                          </span>
                        </div>
                      </div>

                      {deduped.uniqueEvents.length > 0 ? (
                        <div className="pt-2 border-t border-slate-200 space-y-1.5">
                          <div className="font-semibold text-slate-700">
                            Verified Provider Scan History ({deduped.uniqueEvents.length} events ·{' '}
                            {deduped.duplicatesRemoved} duplicates filtered):
                          </div>
                          {deduped.uniqueEvents.map((ev) => (
                            <div key={ev.id} className="text-[11px] text-slate-600 font-mono">
                              [{ev.timestamp}] {ev.statusCode} @ {ev.location} — {ev.description} (
                              {ev.providerSource})
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 italic">
                          No live courier scan events received yet. Connect courier aggregator webhook to populate scan history.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Manual Courier & AWB Entry Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Record Manual Courier Booking & AWB
            </h3>
            <p className="text-xs text-slate-500">
              Saves courier provider and AWB identifier for orders booked manually by the store owner.
            </p>

            {shipFeedback && (
              <div className="p-3 rounded-lg bg-slate-100 border border-slate-300 text-xs text-slate-800">
                {shipFeedback}
              </div>
            )}

            <form onSubmit={handleManualShipmentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Order *</label>
                <select
                  value={shipOrderId}
                  onChange={(e) => setShipOrderId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {orders.length === 0 && <option value="">No orders available</option>}
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} — {o.customerName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Courier / Logistics Provider *
                </label>
                <input
                  type="text"
                  required
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="e.g., Delhivery / BlueDart / DTDC"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  AWB / Tracking Number *
                </label>
                <input
                  type="text"
                  required
                  value={awbNumber}
                  onChange={(e) => setAwbNumber(e.target.value.toUpperCase())}
                  placeholder="e.g., DL992837465IN"
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  External Tracking URL (Optional)
                </label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={orders.length === 0}
                className="w-full py-2.5 px-4 font-semibold text-white bg-[#3B0764] hover:bg-[#2a0548] disabled:opacity-50 rounded-lg cursor-pointer"
              >
                Save AWB & Dispatch Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. RETURNS, EXCHANGES & RESTOCK INSPECTION */}
      {subTab === 'returns_exchanges' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Returns, Exchanges & Mandatory Hygiene Inspection Workflow
            </h3>
            <p className="text-xs text-slate-500">
              Beauty and skincare returns NEVER automatically re-enter sellable stock. An authorized inspection must confirm whether an item is unopened/resellable or must be quarantined/disposed.
            </p>
          </div>

          {returns.length === 0 ? (
            <EmptyOrUnavailableState
              state={isBackendConfigured ? 'EMPTY_RECORDS' : 'INTEGRATION_PENDING'}
              title="No Return Requests Pending"
              description="Customer return requests and inspection workflows appear here when synced from the backend or test fixture sandbox."
              endpoint="GET /api/v1/admin/returns"
            />
          ) : (
            <div className="space-y-3">
              {returns.map((ret) => (
                <div
                  key={ret.id}
                  className="p-4 rounded-xl bg-[#FAF9F6] border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#3B0764]">{ret.returnNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-slate-900">
                        Order {ret.orderNumber} ({ret.customerName})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-slate-600">SKU: {ret.itemSku}</span>
                    </div>
                    <div className="text-slate-700">
                      Product: <span className="font-medium">{ret.productName}</span> (Qty:{' '}
                      {ret.quantity}) · Condition Reported:{' '}
                      <span className="font-semibold">{ret.condition}</span>
                    </div>
                    <div className="text-slate-500">
                      Customer Reason: "{ret.reason}" · Approval:{' '}
                      <span className="font-semibold text-slate-800">{ret.approvalStatus}</span> ·
                      Restock Decision:{' '}
                      <span className="font-semibold text-[#FF6B00]">{ret.restockDecision}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onInspectReturnDecision(ret.id, 'APPROVED', 'QUARANTINE_DISPOSE')
                      }
                      className="px-3 py-1.5 font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg cursor-pointer"
                    >
                      Approve Return & Quarantine (Do Not Restock)
                    </button>
                    {ret.condition === 'UNOPENED_SEALED' && (
                      <button
                        type="button"
                        onClick={() =>
                          onInspectReturnDecision(ret.id, 'APPROVED', 'APPROVED_RESELLABLE')
                        }
                        className="px-3 py-1.5 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                      >
                        Verify Sealed & Restock (+{ret.quantity})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        onInspectReturnDecision(ret.id, 'REJECTED', 'QUARANTINE_DISPOSE')
                      }
                      className="px-3 py-1.5 font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer"
                    >
                      Reject Request
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
