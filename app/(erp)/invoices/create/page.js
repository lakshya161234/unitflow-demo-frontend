


"use client";

import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "@/lib/requireAuth";
import { requireFactory } from "@/lib/requireFactory";
import { createInvoice } from "@/lib/invoiceApi";
import { useFactory } from "@/lib/factoryContext";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchClients } from "@/lib/clientApi";
import { fetchProducts } from "@/lib/productApi";

function toNumberSafe(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function CreateInvoicePage() {
  const { activeFactory } = useFactory();
  const router = useRouter();
  const search = useSearchParams();

  const orderId = search.get("order_id") || "";
  const preClientId = search.get("client_id") || "";

  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    client_id: preClientId,
    order_id: orderId || "",
    kind: "TAX_INVOICE",
    issue_date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    due_date: "",
    notes: "",
  });

  const [items, setItems] = useState([
    { product_id: "", quantity: 1, unit_price: 0, discount: 0 },
  ]);

  const [charges, setCharges] = useState([
    // { title: "Delivery", amount: 0, type: "OTHER" }
  ]);

  useEffect(() => {
    if (!activeFactory?.id) return;

    // Clients list (company-level but your wrapper uses factoryId pattern)
    fetchClients({}, activeFactory.id)
      .then((data) => setClients(Array.isArray(data) ? data : data?.rows || []))
      .catch(() => setClients([]));

    // Products list
    fetchProducts(activeFactory.id)
      .then((data) => setProducts(Array.isArray(data) ? data : data?.rows || []))
      .catch(() => setProducts([]));
  }, [activeFactory?.id]);

  const totals = useMemo(() => {
    const itemsSubtotal = items.reduce((sum, it) => {
      const line = toNumberSafe(it.quantity) * toNumberSafe(it.unit_price) - toNumberSafe(it.discount);
      return sum + (Number.isFinite(line) ? line : 0);
    }, 0);

    const chargesTotal = charges.reduce((sum, c) => sum + toNumberSafe(c.amount), 0);
    return { itemsSubtotal, chargesTotal, total: itemsSubtotal + chargesTotal };
  }, [items, charges]);

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { product_id: "", quantity: 1, unit_price: 0, discount: 0 }]);
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateCharge(idx, patch) {
    setCharges((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function addCharge() {
    setCharges((prev) => [...prev, { title: "", amount: 0, type: "OTHER" }]);
  }

  function removeCharge(idx) {
    setCharges((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!activeFactory?.id) return;

    setError("");

    if (!form.client_id) {
      setError("Please select a client.");
      return;
    }

    const cleanItems = items
      .filter((it) => it.product_id && toNumberSafe(it.quantity) > 0)
      .map((it) => ({
        product_id: it.product_id,
        quantity: toNumberSafe(it.quantity),
        unit_price: toNumberSafe(it.unit_price),
        discount: toNumberSafe(it.discount) || 0,
      }));

    if (cleanItems.length === 0) {
      setError("Please add at least one valid item.");
      return;
    }

    const cleanCharges = charges
      .filter((c) => (c.title || "").trim() && toNumberSafe(c.amount) !== 0)
      .map((c) => ({
        title: (c.title || "").trim(),
        amount: toNumberSafe(c.amount),
        type: c.type || "OTHER",
      }));

    setSaving(true);
    try {
      const payload = {
        client_id: form.client_id,
        kind: form.kind,
        issue_date: form.issue_date ? new Date(form.issue_date).toISOString() : new Date().toISOString(),
        notes: form.notes || undefined,
        items: cleanItems,
        charges: cleanCharges,
      };

      if (form.order_id) payload.order_id = form.order_id;
      if (form.due_date) payload.due_date = new Date(form.due_date).toISOString();

      const created = await createInvoice(payload, activeFactory.id);

      const newId = created?.id;
      if (newId) router.push(`/invoices/${newId}`);
      else router.push("/invoices");
    } catch (err) {
      setError(err?.message || "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  }

  if (!activeFactory) {
    return <div className="p-6 text-gray-600">Select a factory to create invoices.</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Create Invoice</h1>
        <p className="text-gray-500">Create a new invoice (manual or linked to an order)</p>
      </div>

      {error ? <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div> : null}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6 max-w-4xl">
        {/* Top fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Client</label>
            <select
              value={form.client_id}
              onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
              required
            >
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name || c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">Kind</label>
            <select value={form.kind} onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg">
              <option value="TAX_INVOICE">Tax Invoice</option>
              <option value="PROFORMA">Proforma</option>
              <option value="CREDIT_NOTE">Credit Note</option>
              <option value="DEBIT_NOTE">Debit Note</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">Issue Date</label>
            <input
              type="date"
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
              value={form.issue_date}
              onChange={(e) => setForm((p) => ({ ...p, issue_date: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Due Date (optional)</label>
            <input
              type="date"
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
              value={form.due_date}
              onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">Order ID (optional)</label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
              value={form.order_id}
              onChange={(e) => setForm((p) => ({ ...p, order_id: e.target.value }))}
              placeholder="Paste order_id if invoice is linked to an order"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">Notes (optional)</label>
            <textarea
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
        </div>

        {/* Items */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Items</h2>
            <button type="button" onClick={addItem} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              + Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="md:col-span-5">
                  <label className="text-xs text-gray-500">Product</label>
                  <select
                    value={it.product_id}
                    onChange={(e) => updateItem(idx, { product_id: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name || p.product_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500">quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500">unit_price</label>
                  <input
                    type="number"
                    min={0}
                    value={it.unit_price}
                    onChange={(e) => updateItem(idx, { unit_price: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500">Discount</label>
                  <input
                    type="number"
                    min={0}
                    value={it.discount}
                    onChange={(e) => updateItem(idx, { discount: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="md:col-span-1 flex items-end justify-end">
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length <= 1}
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    title="Remove item"
                  >
                    ×
                  </button>
                </div>

                <div className="md:col-span-12 text-sm text-gray-600">
                  Line total:{" "}
                  <span className="font-semibold text-gray-800">
                    ₹{Math.max(0, toNumberSafe(it.quantity) * toNumberSafe(it.unit_price) - toNumberSafe(it.discount))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Charges */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Charges (optional)</h2>
            <button type="button" onClick={addCharge} className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              + Add Charge
            </button>
          </div>

          {charges.length === 0 ? (
            <div className="text-sm text-gray-500">No charges added.</div>
          ) : (
            <div className="space-y-3">
              {charges.map((c, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="md:col-span-6">
                    <label className="text-xs text-gray-500">Title</label>
                    <input
                      value={c.title}
                      onChange={(e) => updateCharge(idx, { title: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g. Delivery"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="text-xs text-gray-500">Amount</label>
                    <input
                      type="number"
                      value={c.amount}
                      onChange={(e) => updateCharge(idx, { amount: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-500">Type</label>
                    <select value={c.type || "OTHER"} onChange={(e) => updateCharge(idx, { type: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="OTHER">Other</option>
                      <option value="SHIPPING">Shipping</option>
                      <option value="TAX">Tax</option>
                      <option value="DISCOUNT">Discount</option>
                    </select>
                  </div>

                  <div className="md:col-span-1 flex items-end justify-end">
                    <button type="button" onClick={() => removeCharge(idx)} className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100" title="Remove charge">
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + submit */}
        <div className="border-t pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-sm text-gray-700">
            <div>Items subtotal: <span className="font-semibold">₹{totals.itemsSubtotal}</span></div>
            <div>Charges: <span className="font-semibold">₹{totals.chargesTotal}</span></div>
            <div className="text-base mt-1">Total: <span className="font-bold">₹{totals.total}</span></div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => router.push("/invoices")} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {saving ? "Creating..." : "Create Invoice"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default requireAuth(requireFactory(CreateInvoicePage));