
// app/(erp)/orders/[id]/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/requireAuth";
import { requireFactory } from "@/lib/requireFactory";
import { useAuth } from "@/lib/authContext";
import { useFactory } from "@/lib/factoryContext";
import {
  cancelOrder,
  fetchOrderById,
  fetchOrderLabelPdf,
  updateOrder,
  updateOrderStatus,
} from "@/lib/orderApi";
import { fetchInvoicePdf } from "@/lib/invoiceApi";
import { factoryApiRequest } from "@/lib/api";
import { fetchFactories } from "@/lib/factoryApi";

function toNumberSafe(v) {
  if (v === null || v === undefined) return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { activeFactory } = useFactory();
  const auth = useAuth();
  const can = typeof auth?.can === "function" ? auth.can : () => true;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [cancelling, setCancelling] = useState(false);
  const [downloadingLabel, setDownloadingLabel] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const [error, setError] = useState("");

  // Basic edit panel (ONLY basic fields)
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    notes: "",
    internal_notes: "",
    required_by: "",
    logistics: "",
    charges: [],
  });

  // Timeline edit (separate)
  const [timelineEditOpen, setTimelineEditOpen] = useState(false);
  const [timelineStatus, setTimelineStatus] = useState("PROCESSING");
  const [timelineNote, setTimelineNote] = useState("");

  // Dispatch allocations (only needed when setting status to DISPATCHED)
  const [factories, setFactories] = useState([]);
  const [dispatchAlloc, setDispatchAlloc] = useState({});

  // Payment edit (separate)
  const [paymentEditOpen, setPaymentEditOpen] = useState(false);
  const [paySaving, setPaySaving] = useState(false);
  const [payForm, setPayForm] = useState({
    invoice_id: "",
    amount: "",
    method: "UPI",
    reference: "",
    paid_at: new Date().toISOString(),
  });

  async function reload() {
    if (!id || !activeFactory?.id) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchOrderById(id, activeFactory.id);
      setOrder(data);
    } catch (e) {
      setError(e?.message || "Failed to load order");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id || !activeFactory?.id) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeFactory?.id]);

  // Factories list is used only for DISPATCHED allocation selection
  useEffect(() => {
    fetchFactories()
      .then((data) => setFactories(Array.isArray(data) ? data : data?.rows || []))
      .catch(() => setFactories([]));
  }, []);

  // Initialize dispatch allocation defaults when opening timeline editor on DISPATCHED
  useEffect(() => {
    if (!timelineEditOpen) return;
    if (timelineStatus !== "DISPATCHED") return;
    if (!order?.items?.length) return;

    setDispatchAlloc((prev) => {
      const next = { ...(prev || {}) };
      order.items.forEach((it) => {
        const pid = it.product_id || it.product?.id;
        if (!pid) return;
        if (next[pid]) return;
        const q = toNumberSafe(it.quantity);
        next[pid] = { [activeFactory?.id || order.factory_id || ""]: q };
      });
      return next;
    });
  }, [timelineEditOpen, timelineStatus, order, activeFactory?.id]);

  // Prime edit form + payment invoice selection when order changes
  useEffect(() => {
    if (!order) return;

    setEditForm({
      notes: order.notes || "",
      internal_notes: order.internal_notes || "",
      required_by: order.required_by || "",
      logistics:
        order.logistics ||
        order?.meta?.logistics ||
        order?.meta?.logistics?.logistics ||
        "",
      charges: Array.isArray(order.charges)
        ? order.charges.map((c) => ({
          id: c.id,
          title: c.title || "",
          amount: String(c.amount ?? ""),
          type: c.type || "OTHER",
        }))
        : [],
    });

    const invId =
      order?.invoice?.id ||
      (Array.isArray(order?.invoices) && order.invoices.length ? order.invoices[0].id : "") ||
      "";
    setPayForm((p) => ({ ...p, invoice_id: invId }));
  }, [order]);

  const totalItems = useMemo(() => {
    if (!order?.items) return 0;
    return order.items.reduce((sum, item) => sum + toNumberSafe(item.quantity), 0);
  }, [order]);

  const formatCurrency = (amount) => {
    const n = toNumberSafe(amount);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-800";
      case "CONFIRMED":
        return "bg-yellow-100 text-yellow-800";
      case "DISPATCHED":
        return "bg-indigo-100 text-indigo-800";
      case "PROCESSING":
        return "bg-blue-100 text-blue-800";
      case "SHIPPED":
        return "bg-indigo-100 text-indigo-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "CLOSED":
        return "bg-slate-100 text-slate-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  async function handleDownloadInvoicePdf() {
    // supports order.invoice OR latest from order.invoices
    const inv =
      order?.invoice ||
      (Array.isArray(order?.invoices) && order.invoices.length ? order.invoices[0] : null);

    if (!inv?.id || !activeFactory?.id) return;
    if (!can("invoices.pdf.view") && !can("invoices.pdf")) return;

    setDownloadingInvoice(true);
    setError("");
    try {
      const blob = await fetchInvoicePdf(inv.id, activeFactory.id, true);
      const name = inv.invoice_no ? `invoice-${inv.invoice_no}.pdf` : `invoice-${inv.id}.pdf`;
      downloadBlob(blob, name);
    } catch (e) {
      setError(e?.message || "Failed to download invoice PDF");
    } finally {
      setDownloadingInvoice(false);
    }
  }

  async function handleDownloadLabel() {
    if (!activeFactory?.id) return;
    if (!can("orders.label.view")) return;

    setDownloadingLabel(true);
    setError("");
    try {
      const blob = await fetchOrderLabelPdf(id, activeFactory.id);
      const name = order?.order_no ? `order-label-${order.order_no}.pdf` : `order-label-${id}.pdf`;
      downloadBlob(blob, name);
    } catch (e) {
      setError(e?.message || "Failed to download order label");
    } finally {
      setDownloadingLabel(false);
    }
  }

  async function handleCancelOrder() {
    if (!order || !activeFactory?.id) return;
    if (!can("orders.cancel")) return;

    const reason = window.prompt("Cancel reason (optional):") || "";
    setCancelling(true);
    setError("");
    try {
      const updated = await cancelOrder(order.id, { reason }, activeFactory.id);
      setOrder(updated || (await fetchOrderById(order.id, activeFactory.id)));
    } catch (e) {
      setError(e?.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  }

  async function handleMarkDispatched() {
    if (!order || !activeFactory?.id) return;
    if (!can("orders.status")) return;

    setUpdatingStatus(true);
    setError("");
    try {
      // Quick action: dispatch without split (all qty from current factory)
      const updated = await updateOrderStatus(order.id, { status: "DISPATCHED", note: "Marked as dispatched" }, activeFactory.id);
      setOrder(updated || (await fetchOrderById(order.id, activeFactory.id)));
    } catch (e) {
      setError(e?.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  }

  function setChargeField(index, key, value) {
    setEditForm((prev) => {
      const next = { ...prev, charges: [...(prev.charges || [])] };
      next.charges[index] = { ...next.charges[index], [key]: value };
      return next;
    });
  }

  function addChargeRow() {
    setEditForm((prev) => ({
      ...prev,
      charges: [...(prev.charges || []), { title: "", amount: "", type: "OTHER" }],
    }));
  }

  function removeChargeRow(index) {
    setEditForm((prev) => {
      const next = { ...prev, charges: [...(prev.charges || [])] };
      next.charges.splice(index, 1);
      return next;
    });
  }

  function setDispatchQty(productId, factoryId, qty) {
    const n = Number(qty || 0) || 0;
    setDispatchAlloc((prev) => {
      const next = { ...(prev || {}) };
      next[productId] = { ...(next[productId] || {}) };
      next[productId][factoryId] = n;
      return next;
    });
  }

  function dispatchSumFor(productId) {
    const m = dispatchAlloc?.[productId] || {};
    return Object.values(m).reduce((s, v) => s + (Number(v || 0) || 0), 0);
  }

  async function handleSaveEdit() {
    if (!order || !activeFactory?.id) return;
    if (!can("orders.update")) return;

    setSavingEdit(true);
    setError("");
    try {
      const cleanedCharges = (editForm.charges || [])
        .map((c) => ({
          title: String(c.title || "").trim(),
          amount: toNumberSafe(c.amount),
          type: c.type || "OTHER",
        }))
        .filter((c) => c.title && Number.isFinite(c.amount));

      const payload = {
        notes: editForm.notes || "",
        internal_notes: editForm.internal_notes || "",
        required_by: editForm.required_by ? editForm.required_by : null,
        charges: cleanedCharges,

        // ✅ only name
        logistics: editForm.logistics || null,

        // ✅ safe fallback (backend may store meta)
        meta: {
          ...(order?.meta || {}),
          logistics: editForm.logistics || "",
        },
      };

      const updated = await updateOrder(order.id, payload, activeFactory.id);
      setOrder(updated || (await fetchOrderById(order.id, activeFactory.id)));
      setEditOpen(false);
    } catch (e) {
      setError(e?.message || "Failed to update order");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleAddTimelineEntry() {
    if (!order || !activeFactory?.id) return;
    if (!can("orders.status")) return;

    setUpdatingStatus(true);
    setError("");
    try {
      const payload = { status: timelineStatus, note: timelineNote || "" };

      // ✅ New requirement: inventory deduction happens on DISPATCHED.
      // If DISPATCHED, user must distribute quantities across factories.
      if (timelineStatus === "DISPATCHED") {
        const allocations = [];

        for (const it of order.items || []) {
          const productId = it.product_id || it.product?.id;
          if (!productId) continue;
          const orderedQty = toNumberSafe(it.quantity);
          const map = dispatchAlloc?.[productId] || {};
          const sum = Object.values(map).reduce((s, v) => s + (Number(v || 0) || 0), 0);

          if (sum !== orderedQty) {
            setError(`Invalid dispatch factory split for ${it.product?.name || productId}. Allocated ${sum} but ordered ${orderedQty}.`);
            setUpdatingStatus(false);
            return;
          }

          Object.entries(map).forEach(([factoryId, q]) => {
            const n = Number(q || 0) || 0;
            if (!factoryId || n <= 0) return;
            allocations.push({ product_id: productId, factory_id: factoryId, quantity: n });
          });
        }

        payload.allocations = allocations;
      }

      const updated = await updateOrderStatus(order.id, payload, activeFactory.id);
      setTimelineNote("");
      setOrder(updated || (await fetchOrderById(order.id, activeFactory.id)));
      setTimelineEditOpen(false);
    } catch (e) {
      setError(e?.message || "Failed to update timeline");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleRecordPayment() {
    if (!activeFactory?.id) return;
    if (!can("payments.create")) return;

    const invoiceId = String(payForm.invoice_id || "").trim();
    const amt = Number(payForm.amount);

    if (!invoiceId) return setError("Select an invoice to allocate payment.");
    if (!amt || amt <= 0) return setError("Payment amount must be > 0.");

    setPaySaving(true);
    setError("");
    try {
      const payload = {
        client_id: order?.client?.id || order?.client_id,
        amount: amt,
        mode: payForm.method,
        reference: payForm.reference || "",
        paid_at: payForm.paid_at || new Date().toISOString(),
        allocations: [{ invoice_id: invoiceId, amount: amt }],
      };

      await factoryApiRequest(`/payments`, {
        method: "POST",
        body: payload,
        factoryId: activeFactory.id,
      });

      await reload();
      setPayForm((p) => ({ ...p, amount: "", reference: "" }));
      setPaymentEditOpen(false);
    } catch (e) {
      setError(e?.message || "Failed to record payment");
    } finally {
      setPaySaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Order Not Found</h2>
        <p className="text-gray-500 mb-6">{error || "The requested order could not be found."}</p>
        <button onClick={() => router.push("/orders")} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Back to Orders
        </button>
      </div>
    );
  }

  const invoicesForSelect = (() => {
    const list = [];
    if (Array.isArray(order?.invoices)) {
      order.invoices.forEach((inv) => list.push({ id: inv.id, label: inv.invoice_no || inv.id }));
    }
    if (order?.invoice?.id) list.push({ id: order.invoice.id, label: order.invoice.invoice_no || order.invoice.id });
    // dedupe
    return list.filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i);
  })();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{order.order_no || `Order #${order.id}`}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {(order.status || "").toString().replace(/_/g, " ")}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-sm text-gray-600">Order ID: {order.id}</span>
              </div>
            </div>
          </div>
          <p className="text-gray-500 mt-1">
            Factory: <span className="font-medium text-blue-700">{activeFactory?.name}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(invoicesForSelect[0]?.id) ? (
            <>
              <Link
                href={`/invoices/${invoicesForSelect[0].id}`}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View Invoice
              </Link>

              <button
                onClick={handleDownloadInvoicePdf}
                disabled={downloadingInvoice || (!can("invoices.pdf.view") && !can("invoices.pdf"))}
                className="px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {downloadingInvoice ? "Preparing..." : "Invoice PDF"}
              </button>
            </>
          ) : (
            <span className="text-sm text-gray-600 px-3 py-2">No invoice linked.</span>
          )}

          <button
            onClick={handleDownloadLabel}
            disabled={downloadingLabel || !can("orders.label.view")}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {downloadingLabel ? "Downloading..." : "Order Label PDF"}
          </button>

          {order.status !== "CANCELLED" && order.status !== "CLOSED" && (
            <button
              onClick={handleCancelOrder}
              disabled={cancelling || !can("orders.cancel")}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? "Cancelling..." : "Cancel Order"}
            </button>
          )}

          <Link
            href={`/clients/${order.client?.id || order.client_id}`}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            View Client
          </Link>
        </div>
      </div>

      {error && <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>}

      {/* ✅ Basic Edit Panel ONLY */}
      {editOpen && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Edit Order</h2>
            <button onClick={() => setEditOpen(false)} className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
              <textarea
                value={editForm.internal_notes}
                onChange={(e) => setEditForm((p) => ({ ...p, internal_notes: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Required By (ISO datetime)</label>
              <input
                value={editForm.required_by}
                onChange={(e) => setEditForm((p) => ({ ...p, required_by: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="2026-02-27T00:00:00.000Z"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty to clear.</p>
            </div>

            {/* ✅ logistics provider name only */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Logistics Provider</label>
              <input
                value={editForm.logistics}
                onChange={(e) => setEditForm((p) => ({ ...p, logistics: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="e.g. Delhivery / Self / Local Transport"
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Charges</h3>
              <button onClick={addChargeRow} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Add Charge
              </button>
            </div>

            {(editForm.charges || []).length > 0 ? (
              <div className="space-y-3">
                {editForm.charges.map((c, idx) => (
                  <div key={c.id || idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="md:col-span-5">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                      <input
                        value={c.title}
                        onChange={(e) => setChargeField(idx, "title", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Extra Packaging"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
                      <input
                        value={c.amount}
                        onChange={(e) => setChargeField(idx, "amount", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="40"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                      <select
                        value={c.type}
                        onChange={(e) => setChargeField(idx, "type", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      >
                        <option value="OTHER">OTHER</option>
                        <option value="SHIPPING">SHIPPING</option>
                        <option value="PACKING">PACKING</option>
                        <option value="DISCOUNT">DISCOUNT</option>
                        <option value="TAX">TAX</option>
                      </select>
                    </div>

                    <div className="md:col-span-1 flex md:items-end">
                      <button
                        onClick={() => removeChargeRow(idx)}
                        className="w-full px-3 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                      >
                        X
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600">No charges.</div>
            )}
          </div>

          <div className="mt-6 flex gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={savingEdit || !can("orders.update")}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingEdit ? "Saving..." : "Save Changes"}
            </button>

            <button
              onClick={() => {
                setEditForm({
                  notes: order.notes || "",
                  internal_notes: order.internal_notes || "",
                  required_by: order.required_by || "",
                  logistics:
                    order.logistics ||
                    order?.meta?.logistics ||
                    order?.meta?.logistics?.logistics ||
                    "",
                  charges: Array.isArray(order.charges)
                    ? order.charges.map((cc) => ({
                      id: cc.id,
                      title: cc.title || "",
                      amount: String(cc.amount ?? ""),
                      type: cc.type || "OTHER",
                    }))
                    : [],
                });
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">Order Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Order Date</label>
                  <p className="text-gray-800 font-medium">{formatDate(order.order_date || order.created_at)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Required By</label>
                  <p className="text-gray-800 font-medium">{order.required_by ? formatDate(order.required_by) : "Not specified"}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Delivered At</label>
                  <p className="text-gray-800 font-medium">{order.delivered_at ? formatDate(order.delivered_at) : "Not delivered"}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Notes</label>
                  <p className="text-gray-800">{order.notes || "No additional notes"}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Internal Notes</label>
                  <p className="text-gray-800">{order.internal_notes || "—"}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Logistics Provider</label>
                  <p className="text-gray-800">{order.logistics || order?.meta?.logistics || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Order Items</h2>
              <span className="text-sm text-gray-500">{totalItems} total items</span>
            </div>

            {order.items?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {order.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{item.product?.name || item.product_name || "Product"}</p>
                              <p className="text-sm text-gray-500">SKU: {item.product?.sku || item.sku || "N/A"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                            {toNumberSafe(item.quantity)} {item.product?.unit || ""}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-gray-900">{formatCurrency(item.unit_price)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-900">{formatCurrency(item.line_total)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No items found in this order</p>
              </div>
            )}
          </div>

          {/* Charges */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Charges</h2>
            {order.charges?.length > 0 ? (
              <div className="space-y-2">
                {order.charges.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="text-gray-800">
                      <div className="font-medium">{c.title}</div>
                      <div className="text-xs text-gray-500">{c.type}</div>
                    </div>
                    <div className="font-medium text-gray-900">{formatCurrency(c.amount)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-600">No charges.</div>
            )}
          </div>



          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Payment Timeline</h3>
              <button
                onClick={() => setPaymentEditOpen((v) => !v)}
                disabled={!can("payments.create")}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-60"
              >
                {paymentEditOpen ? "Close" : "Record Payment"}
              </button>
            </div>

            {paymentEditOpen && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice</label>
                    <select
                      value={payForm.invoice_id}
                      onChange={(e) => setPayForm((p) => ({ ...p, invoice_id: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select invoice…</option>
                      {invoicesForSelect.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      value={payForm.amount}
                      onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="e.g. 500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                    <select
                      value={payForm.method}
                      onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="UPI">UPI</option>
                      <option value="CASH">CASH</option>
                      <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                      <option value="CHEQUE">CHEQUE</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                    <input
                      value={payForm.reference}
                      onChange={(e) => setPayForm((p) => ({ ...p, reference: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="e.g. UPI txn / cash received"
                    />
                  </div>
                </div>

                <button
                  onClick={handleRecordPayment}
                  disabled={paySaving || !can("payments.create")}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {paySaving ? "Saving..." : "Save Payment"}
                </button>
              </div>
            )}

            {Array.isArray(order.payments_timeline) && order.payments_timeline.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2">Payment</th>
                      <th className="py-2">Method</th>
                      <th className="py-2">Paid At</th>
                      <th className="py-2 text-right">Allocated</th>
                      <th className="py-2 text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.payments_timeline.map((p) => (
                      <tr key={p.payment_id} className="border-b last:border-b-0">
                        <td className="py-2 text-gray-900">{p.payment_no || p.payment_id}</td>
                        <td className="py-2 text-gray-700">{p.method || "-"}</td>
                        <td className="py-2 text-gray-700">{formatDate(p.paid_at)}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(p.allocated_amount)}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(p.remaining_after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-600">No payments recorded yet.</div>
            )}
          </div>




          {/* ✅ Order Timeline (always visible, edit separate) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Order Timeline</h3>
              <button
                onClick={() => setTimelineEditOpen((v) => !v)}
                disabled={!can("orders.status")}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-60"
              >
                {timelineEditOpen ? "Close" : "Edit"}
              </button>
            </div>

            {timelineEditOpen && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={timelineStatus}
                      onChange={(e) => setTimelineStatus(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="PROCESSING">PROCESSING</option>
                      <option value="DISPATCHED">DISPATCHED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                    <input
                      value={timelineNote}
                      onChange={(e) => setTimelineNote(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="e.g. Packed and ready to dispatch"
                    />
                  </div>
                </div>

                {timelineStatus === "DISPATCHED" ? (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                    <div className="text-sm font-semibold text-gray-800">Dispatch factory split</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Allocate each product quantity across factories. Inventory will be deducted on dispatch.
                    </div>

                    <div className="mt-3 space-y-4">
                      {(order?.items || []).map((it) => {
                        const pid = it.product_id || it.product?.id;
                        if (!pid) return null;
                        const orderedQty = toNumberSafe(it.quantity);
                        const sum = dispatchSumFor(pid);

                        return (
                          <div key={pid} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-medium text-gray-900">
                                {it.product?.name || pid}
                              </div>
                              <div className={`text-xs font-medium ${sum === orderedQty ? "text-green-700" : "text-amber-700"}`}>
                                Allocated: {sum} / {orderedQty}
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                              {(factories?.length ? factories : order?.factory ? [order.factory] : []).map((f) => (
                                <div key={f.id} className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg border border-gray-200">
                                  <div className="text-sm text-gray-800">{f.name || f.id}</div>
                                  <input
                                    type="number"
                                    min={0}
                                    value={dispatchAlloc?.[pid]?.[f.id] ?? 0}
                                    onChange={(e) => setDispatchQty(pid, f.id, e.target.value)}
                                    className="w-28 px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <button
                  onClick={handleAddTimelineEntry}
                  disabled={updatingStatus || !can("orders.status")}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {updatingStatus ? "Saving..." : "Add Entry"}
                </button>
              </div>
            )}

            {order.status_history?.length ? (
              <div className="space-y-3">
                {order.status_history
                  .slice()
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .map((h) => (
                    <div key={h.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{h.status}</div>
                        <div className="text-sm text-gray-600">{h.note || "—"}</div>
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(h.created_at)}</div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-gray-600">No status history available.</div>
            )}
          </div>



        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Client card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Client Information</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="font-bold text-blue-800 text-lg">
                  {(order.client?.company_name || "C").charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{order.client?.company_name || "Client"}</h4>
                <p className="text-sm text-gray-500">Client</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              {order.client?.gstin ? <div>GSTIN: {order.client.gstin}</div> : null}
              <div>{order.client?.address || "Address not available"}</div>
            </div>
            <div className="mt-6">
              <Link
                href={`/clients/${order.client?.id || order.client_id}`}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                View Full Profile
              </Link>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl shadow-lg p-6 text-white">
            <h3 className="font-semibold mb-6">Order Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-blue-700/50">
                <span className="text-blue-200">Subtotal</span>
                <span className="font-medium">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-blue-700/50">
                <span className="text-blue-200">Charges</span>
                <span className="font-medium">{formatCurrency(order.total_charges)}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-blue-700/50">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setEditOpen((v) => !v)}
              disabled={!can("orders.update")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Edit Order
            </button>

            <button
              onClick={handleMarkDispatched}
              disabled={updatingStatus || !can("orders.status")}
              className="px-4 py-2 border border-green-700 text-green-800 rounded-lg hover:bg-green-500 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {updatingStatus ? "Updating..." : "Mark as Dispatched"}
            </button>
          </div>

        </div>
      </div>


    </div>
  );
}

export default requireAuth(requireFactory(OrderDetailPage));