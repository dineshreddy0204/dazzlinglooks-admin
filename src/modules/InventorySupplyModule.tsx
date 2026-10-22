import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Clock,
  ShieldAlert,
  Truck,
} from 'lucide-react';
import {
  InventoryItem,
  ProductBatch,
  PurchaseOrder,
  StockAdjustmentRecord,
  Supplier,
} from '../types/admin';
import { IntegrationBanner, EmptyOrUnavailableState } from '../components/IntegrationStatusBanner';
import { evaluateBatchFEFO, validateStockAdjustment } from '../utils/businessRules';

interface InventorySupplyModuleProps {
  activeSubTab: 'inventory' | 'batches_expiry' | 'suppliers_po';
  isBackendConfigured: boolean;
  sandboxMode: boolean;
  inventory: InventoryItem[];
  adjustments: StockAdjustmentRecord[];
  batches: ProductBatch[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  onApplyStockAdjustment: (adj: StockAdjustmentRecord, newStockOnHand: number) => void;
  onQuarantineBatch: (batchId: string) => void;
  onCreatePurchaseOrder: (po: PurchaseOrder) => void;
  onConfirmPoReceipt: (poId: string) => void;
}

export const InventorySupplyModule: React.FC<InventorySupplyModuleProps> = ({
  activeSubTab,
  isBackendConfigured,
  sandboxMode,
  inventory,
  adjustments,
  batches,
  suppliers,
  purchaseOrders,
  onApplyStockAdjustment,
  onQuarantineBatch,
  onCreatePurchaseOrder,
  onConfirmPoReceipt,
}) => {
  const [subTab, setSubTab] = useState<'inventory' | 'batches_expiry' | 'suppliers_po'>(
    activeSubTab
  );

  // Stock Adjustment State
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    inventory[0]?.variantId || ''
  );
  const [deltaQty, setDeltaQty] = useState<number>(0);
  const [reasonCode, setReasonCode] = useState<StockAdjustmentRecord['reasonCode']>('CYCLE_COUNT_RECONCILIATION');
  const [adjNotes, setAdjNotes] = useState<string>('');
  const [adjError, setAdjError] = useState<string | null>(null);
  const [adjSuccess, setAdjSuccess] = useState<string | null>(null);

  // PO Creation State
  const [poSupplierId, setPoSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [poVariantId, setPoVariantId] = useState<string>(inventory[0]?.variantId || '');
  const [poQty, setPoQty] = useState<number>(50);
  const [poUnitCost, setPoUnitCost] = useState<number>(250);
  const [poInvoiceRef, setPoInvoiceRef] = useState<string>('');

  React.useEffect(() => {
    setSubTab(activeSubTab);
  }, [activeSubTab]);

  React.useEffect(() => {
    if (!selectedVariantId && inventory.length > 0) {
      setSelectedVariantId(inventory[0].variantId);
    }
    if (!poVariantId && inventory.length > 0) {
      setPoVariantId(inventory[0].variantId);
    }
    if (!poSupplierId && suppliers.length > 0) {
      setPoSupplierId(suppliers[0].id);
    }
  }, [inventory, suppliers, selectedVariantId, poVariantId, poSupplierId]);

  const handleStockAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdjError(null);
    setAdjSuccess(null);

    const targetItem = inventory.find((i) => i.variantId === selectedVariantId);
    if (!targetItem) {
      setAdjError('Select a valid SKU / variant to adjust.');
      return;
    }

    const validation = validateStockAdjustment({
      currentStockOnHand: targetItem.stockOnHand,
      reservedQuantity: targetItem.reservedQuantity,
      deltaQuantity: deltaQty,
      allowBackorders: targetItem.allowBackorders,
      reasonCode,
      notes: adjNotes,
    });

    if (!validation.valid) {
      setAdjError(validation.error || 'Invalid stock adjustment.');
      return;
    }

    const record: StockAdjustmentRecord = {
      id: `adj-${Date.now()}`,
      variantId: targetItem.variantId,
      sku: targetItem.sku,
      productName: `${targetItem.productName} (${targetItem.variantName})`,
      deltaQuantity: deltaQty,
      previousStock: targetItem.stockOnHand,
      newStock: validation.newStockOnHand,
      reasonCode,
      notes: adjNotes.trim() || 'Authorized stock reconciliation',
      actorEmail: 'owner@dazzlinglooks.in',
      timestamp: new Date().toISOString(),
    };

    onApplyStockAdjustment(record, validation.newStockOnHand);
    setDeltaQty(0);
    setAdjNotes('');
    setAdjSuccess(
      `Stock adjustment recorded for ${targetItem.sku}: ${targetItem.stockOnHand} → ${validation.newStockOnHand} units.`
    );
  };

  const fefoEvaluated = evaluateBatchFEFO(
    batches.map((b) => ({
      batchNumber: b.batchNumber,
      manufacturingDate: b.manufacturingDate,
      expiryDate: b.expiryDate,
      quantityRemaining: b.quantityRemaining,
      quarantined: b.status === 'QUARANTINED',
    }))
  );

  const handleCreatePoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find((s) => s.id === poSupplierId);
    const inv = inventory.find((i) => i.variantId === poVariantId);
    if (!sup || !inv || poQty <= 0) return;

    const newPo: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: `PO-DL-${Math.floor(1000 + Math.random() * 9000)}`,
      supplierId: sup.id,
      supplierName: sup.name,
      status: 'ISSUED',
      invoiceReference: poInvoiceRef.trim() || undefined,
      totalCost: poQty * poUnitCost,
      createdAt: new Date().toISOString(),
      items: [
        {
          variantId: inv.variantId,
          sku: inv.sku,
          productName: `${inv.productName} (${inv.variantName})`,
          requestedQty: poQty,
          receivedQty: 0,
          unitCost: poUnitCost,
        },
      ],
    };

    onCreatePurchaseOrder(newPo);
    setPoInvoiceRef('');
  };

  return (
    <div className="space-y-6">
      <IntegrationBanner
        moduleName="Inventory Ledger, FEFO Batch Expiry & Supplier Procurement"
        endpointPath="POST /api/v1/admin/inventory/adjustments & /api/v1/admin/batches"
        isBackendConfigured={isBackendConfigured}
        sandboxActive={sandboxMode}
        externalDependency="Transactional Inventory Lock & Batch Lot Ledger"
      />

      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setSubTab('inventory')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            subTab === 'inventory'
              ? 'bg-white text-[#3B0764] shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Variant Inventory & Adjustments ({inventory.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('batches_expiry')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            subTab === 'batches_expiry'
              ? 'bg-white text-[#3B0764] shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Batch, Manufacturing & FEFO Expiry ({batches.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('suppliers_po')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            subTab === 'suppliers_po'
              ? 'bg-white text-[#3B0764] shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Suppliers & Purchase Orders ({purchaseOrders.length})
        </button>
      </div>

      {/* 1. INVENTORY & STOCK ADJUSTMENTS */}
      {subTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">
                Variant-Level Stock Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Prevents negative available stock unless backorders are explicitly enabled.
              </p>
            </div>

            {inventory.length === 0 ? (
              <div className="p-6">
                <EmptyOrUnavailableState
                  state={isBackendConfigured ? 'EMPTY_RECORDS' : 'INTEGRATION_PENDING'}
                  title="No Inventory Records Loaded"
                  description="Stock on hand, reserved quantities, and low-stock thresholds require connection to the backend database or active test fixtures."
                  endpoint="GET /api/v1/admin/inventory"
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                      <th className="py-2.5 px-4">SKU & Variant</th>
                      <th className="py-2.5 px-4 text-right">On Hand</th>
                      <th className="py-2.5 px-4 text-right">Reserved</th>
                      <th className="py-2.5 px-4 text-right">Available</th>
                      <th className="py-2.5 px-4">Alert State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {inventory.map((item) => {
                      const isOut = item.availableQuantity <= 0;
                      const isLow = !isOut && item.availableQuantity <= item.lowStockThreshold;
                      return (
                        <tr key={item.variantId} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">
                              {item.productName} — {item.variantName}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500">{item.sku}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">
                            {item.stockOnHand}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                            {item.reservedQuantity}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                            {item.availableQuantity}
                          </td>
                          <td className="py-3 px-4">
                            {isOut ? (
                              <span className="text-red-600 font-semibold">Out of Stock</span>
                            ) : isLow ? (
                              <span className="text-[#FF6B00] font-semibold">
                                Low Stock (≤{item.lowStockThreshold})
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-medium">Optimal</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mandatory Reason Stock Adjustment Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Authorized Stock Adjustment
              </h3>
              <p className="text-xs text-slate-500">
                Requires mandatory reason code. Large adjustments (≥50 units) require detailed audit notes.
              </p>
            </div>

            {adjError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {adjError}
              </div>
            )}
            {adjSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                {adjSuccess}
              </div>
            )}

            <form onSubmit={handleStockAdjustmentSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target SKU / Variant *
                </label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {inventory.length === 0 && <option value="">No SKUs available</option>}
                  {inventory.map((i) => (
                    <option key={i.variantId} value={i.variantId}>
                      {i.sku} — {i.productName} ({i.availableQuantity} avail)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity Delta (+ to add, - to deduct) *
                </label>
                <input
                  type="number"
                  value={deltaQty}
                  onChange={(e) => setDeltaQty(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Reason Code *
                </label>
                <select
                  value={reasonCode}
                  onChange={(e) =>
                    setReasonCode(e.target.value as StockAdjustmentRecord['reasonCode'])
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="CYCLE_COUNT_RECONCILIATION">Cycle Count Reconciliation</option>
                  <option value="RESTOCK_RECEIPT">Confirmed Purchase Order Receipt</option>
                  <option value="DAMAGED">Damaged in Warehouse</option>
                  <option value="EXPIRED_WRITE_OFF">Expired Batch Write-Off</option>
                  <option value="RETURN_INSPECTED">Inspected Customer Return Restock</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Audit Notes (Required if |Δ| ≥ 50)
                </label>
                <textarea
                  rows={2}
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  placeholder="Reference invoice, cycle count sheet, or inspection ID..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={inventory.length === 0}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#3B0764] hover:bg-[#2a0548] disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                Commit Stock Adjustment
              </button>
            </form>

            {adjustments.length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-xs font-semibold text-slate-800 mb-2">
                  Movement History ({adjustments.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {adjustments.map((a) => (
                    <div key={a.id} className="text-[11px] p-2 rounded bg-[#FAF9F6] border border-slate-200">
                      <div className="font-mono font-semibold text-slate-900">
                        {a.sku}: {a.previousStock} → {a.newStock} ({a.deltaQuantity > 0 ? `+${a.deltaQuantity}` : a.deltaQuantity})
                      </div>
                      <div className="text-slate-500">
                        {a.reasonCode} · {a.notes}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. BATCH, MANUFACTURING & EXPIRY MANAGEMENT (FEFO) */}
      {subTab === 'batches_expiry' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Batch Lot Tracking & First-Expired, First-Out (FEFO) Picking Guidance
              </h3>
              <p className="text-xs text-slate-500">
                Beauty and skincare lots are ranked by earliest expiry date. Expired or quarantined batches are automatically excluded from picking.
              </p>
            </div>
            <span className="text-xs font-mono text-[#3B0764] font-semibold">
              Contract: POST /api/v1/admin/batches
            </span>
          </div>

          {batches.length === 0 ? (
            <div className="p-6">
              <EmptyOrUnavailableState
                state={isBackendConfigured ? 'EMPTY_RECORDS' : 'INTEGRATION_PENDING'}
                title="Batch-Level Expiry Ledger Pending Integration"
                description="Do not invent missing manufacturing or expiry dates. Connect the batch-tracking table or load test fixtures to inspect FEFO picking ranks and quarantine controls."
                endpoint="GET /api/v1/admin/batches"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-4">FEFO Pick Rank</th>
                    <th className="py-2.5 px-4">Batch / Lot #</th>
                    <th className="py-2.5 px-4">Product & Variant SKU</th>
                    <th className="py-2.5 px-4">Mfg Date · Expiry Date</th>
                    <th className="py-2.5 px-4 text-right">Qty Remaining</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {batches.map((batch) => {
                    const evalInfo = fefoEvaluated.find(
                      (e) => e.batchNumber === batch.batchNumber
                    );
                    return (
                      <tr key={batch.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-[#3B0764]">
                          {evalInfo?.fefoRank ? `#${evalInfo.fefoRank} (Pick First)` : 'DO NOT PICK'}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                          {batch.batchNumber}
                          <div className="text-[11px] text-slate-500 font-sans">
                            Inv: {batch.invoiceReference}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{batch.productName}</div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {batch.variantSku} · {batch.supplierName}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          Mfg: {batch.manufacturingDate}
                          <br />
                          Exp: <span className="font-semibold">{batch.expiryDate}</span> (
                          {evalInfo?.daysUntilExpiry}d)
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                          {batch.quantityRemaining}
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          {evalInfo?.status === 'EXPIRED' && (
                            <span className="text-red-600">EXPIRED — BLOCKED</span>
                          )}
                          {evalInfo?.status === 'QUARANTINED' && (
                            <span className="text-red-700">QUARANTINED</span>
                          )}
                          {evalInfo?.status === 'NEAR_EXPIRY' && (
                            <span className="text-[#FF6B00]">NEAR EXPIRY (≤60d)</span>
                          )}
                          {evalInfo?.status === 'ACTIVE_SELLABLE' && (
                            <span className="text-emerald-700">ACTIVE SELLABLE</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {batch.status !== 'QUARANTINED' && (
                            <button
                              type="button"
                              onClick={() => onQuarantineBatch(batch.id)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 cursor-pointer"
                            >
                              Quarantine Lot
                            </button>
                          )}
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

      {/* 3. SUPPLIERS & PURCHASE ORDERS */}
      {subTab === 'suppliers_po' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Purchase Orders & Receiving Safeguard
              </h3>
              <p className="text-xs text-slate-500">
                Creating a Purchase Order does NOT automatically increase available inventory. Stock updates only when receipt is explicitly confirmed.
              </p>
            </div>

            {purchaseOrders.length === 0 ? (
              <EmptyOrUnavailableState
                state={isBackendConfigured ? 'EMPTY_RECORDS' : 'INTEGRATION_PENDING'}
                title="No Purchase Orders Found"
                description="Issue a purchase order on the right to test the two-step procurement and receipt confirmation safeguard."
                endpoint="GET /api/v1/admin/purchase-orders"
              />
            ) : (
              <div className="space-y-3">
                {purchaseOrders.map((po) => (
                  <div
                    key={po.id}
                    className="p-4 rounded-xl bg-[#FAF9F6] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#3B0764]">{po.poNumber}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-slate-900">{po.supplierName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-slate-600">Status: {po.status}</span>
                      </div>
                      <div className="text-slate-600">
                        {po.items.map((it) => (
                          <span key={it.variantId}>
                            {it.productName} ({it.sku}) — Requested: {it.requestedQty}, Received:{' '}
                            {it.receivedQty} @ ₹{it.unitCost}/unit
                          </span>
                        ))}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        Total PO Cost: ₹{po.totalCost.toLocaleString('en-IN')} · Invoice Ref:{' '}
                        {po.invoiceReference || 'Pending'}
                      </div>
                    </div>

                    {po.status === 'ISSUED' && (
                      <button
                        type="button"
                        onClick={() => onConfirmPoReceipt(po.id)}
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Confirm Goods Receipt (+Stock)
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Issue New PO Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Issue Purchase Order</h3>
            <form onSubmit={handleCreatePoSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supplier *</label>
                <select
                  value={poSupplierId}
                  onChange={(e) => setPoSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Variant SKU *</label>
                <select
                  value={poVariantId}
                  onChange={(e) => setPoVariantId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {inventory.map((i) => (
                    <option key={i.variantId} value={i.variantId}>
                      {i.sku} — {i.productName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Order Qty *</label>
                  <input
                    type="number"
                    min="1"
                    value={poQty}
                    onChange={(e) => setPoQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Cost (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    value={poUnitCost}
                    onChange={(e) => setPoUnitCost(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Supplier Invoice Reference
                </label>
                <input
                  type="text"
                  value={poInvoiceRef}
                  onChange={(e) => setPoInvoiceRef(e.target.value)}
                  placeholder="e.g., INV-2026-889"
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={suppliers.length === 0 || inventory.length === 0}
                className="w-full py-2.5 px-4 font-semibold text-white bg-[#3B0764] hover:bg-[#2a0548] disabled:opacity-50 rounded-lg cursor-pointer"
              >
                Create Purchase Order (No Stock Change)
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
