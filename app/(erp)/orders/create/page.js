// app/(erp)/orders/create/page.js

"use client";

import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "@/lib/requireAuth";
import { requireFactory } from "@/lib/requireFactory";
import { useFactory } from "@/lib/factoryContext";
import { createOrder, fetchProformaPdf } from "@/lib/orderCreateApi";
import { fetchClients } from "@/lib/clientApi";
import { fetchProducts } from "@/lib/productApi";
import { fetchSalesCompanies } from "@/lib/salesCompanyApi";
import { useRouter } from "next/navigation";
import Link from "next/link";






function toNumberSafe(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function toISTISOString(dateStr) {
  if (!dateStr) return undefined;

  const [year, month, day] = dateStr.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day, 5, 30, 0, 0));

  return date.toISOString();
}

function CreateOrderPage() {
  const { activeFactory } = useFactory();
  const router = useRouter();

  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesCompanies, setSalesCompanies] = useState([]);

  const [clientId, setClientId] = useState("");
  const [salesCompanyId, setSalesCompanyId] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [requiredBy, setRequiredBy] = useState("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [logistics, setLogistics] = useState("");


  // Items: backend auto-fetches price from product, but we keep 'price' editable for override.
  const [items, setItems] = useState([
    { product_id: "", quantity: 1, price: 0 },
  ]);


  const [charges, setCharges] = useState([{ title: "Packaging", amount: 0 }]);

  const [selectedClient, setSelectedClient] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");


  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    setOrderDate(todayStr);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setRequiredBy(nextWeek.toISOString().split("T")[0]);
  }, []);


  useEffect(() => {
    if (!activeFactory?.id) return;

    setLoading(true);
    setError("");


    fetchClients({}, activeFactory.id)
      .then((data) => {
        const rows = Array.isArray(data) ? data : data?.rows || [];
        setClients(rows);
      })
      .catch((err) => setError(err?.message || "Failed to load clients"))
      .finally(() => setLoading(false));

    setLoadingProducts(true);
    fetchProducts(activeFactory.id)
      .then((data) => {
        const rows = Array.isArray(data) ? data : data?.rows || [];
        setProducts(rows);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));

    // Sales companies (legal selling entity)
    fetchSalesCompanies(activeFactory.id)
      .then((data) => {
        const rows = Array.isArray(data) ? data : data?.rows || [];
        setSalesCompanies(rows);
        setSalesCompanyId((current) =>
          rows.some((company) => String(company.id) === String(current))
            ? current
            : rows[0]?.id || ""
        );
      })
      .catch(() => {
        setSalesCompanies([]);
        setSalesCompanyId("");
      });

  }, [activeFactory?.id]);


  useEffect(() => {
    if (!clientId) {
      setSelectedClient(null);
      return;
    }
    const c = clients.find((x) => String(x.id) === String(clientId));
    setSelectedClient(c || null);
  }, [clientId, clients]);


  function updateItem(i, patch) {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== i) return it;
        const next = { ...it, ...patch };

        // Auto-fill price from product on selection (still editable)
        if (patch?.product_id) {
          const prod = products.find((p) => String(p.id) === String(patch.product_id));
          const auto = Number(prod?.default_price ?? prod?.price ?? prod?.sale_price ?? prod?.mrp ?? 0) || 0;
          next.price = auto;
        }

        return next;
      })
    );
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        product_id: "",
        quantity: 1,
        price: 0,
      },
    ]);
  }
  function removeItem(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateCharge(i, patch) {
    setCharges((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function addCharge() {
    setCharges((prev) => [...prev, { title: "", amount: 0 }]);
  }
  function removeCharge(i) {
    setCharges((prev) => prev.filter((_, idx) => idx !== i));
  }

  const computedTotal = useMemo(() => {
    const sub = items.reduce((sum, it) => sum + toNumberSafe(it.quantity) * toNumberSafe(it.price), 0);
    const ch = charges.reduce((sum, c) => sum + toNumberSafe(c.amount), 0);
    return sub + ch;
  }, [items, charges]);

  const canSubmit = useMemo(() => {
    if (!clientId) return false;
    if (!salesCompanyId) return false;
    if (!orderDate) return false;
    const cleanItems = items.filter((it) => it.product_id && toNumberSafe(it.quantity) > 0);
    if (cleanItems.length === 0) return false;
    return true;
  }, [clientId, salesCompanyId, orderDate, items]);

  async function handleCreate() {
    if (!activeFactory?.id) return;

    setError("");

    if (!clientId) {
      setError("Client is required");
      return;
    }
    if (!salesCompanyId) {
      setError("Sales company is required. Add one in settings or select an available company.");
      return;
    }
    if (!orderDate) {
      setError("Order date is required");
      return;
    }

    const cleanItems = items
      .filter((it) => it.product_id && toNumberSafe(it.quantity) > 0)
      .map((it) => {
        const q = toNumberSafe(it.quantity);
        const p = toNumberSafe(it.price);

        return {
          product_id: it.product_id,
          quantity: q,
          // backend auto-fetches from product; still allow override
          ...(p > 0 ? { unit_price: p } : {}),
        };
      });

    if (cleanItems.length === 0) {
      setError("Please add at least one item.");
      return;
    }
    // Inventory deduction happens on DISPATCHED (not at creation).

    const cleanCharges = charges
      .filter((c) => (c.title || "").trim() && toNumberSafe(c.amount) !== 0)
      .map((c) => ({
        title: (c.title || "").trim(),
        amount: toNumberSafe(c.amount),
      }));

    setSubmitting(true);
    try {
      // ✅ Backend expects: client_id, required_by, notes, items, charges
      const payload = {
        client_id: clientId,
        sales_company_id: salesCompanyId || undefined,
        logistics: logistics ? String(logistics).trim() : undefined,
        // required_by: requiredBy ? new Date(requiredBy).toISOString() : undefined,
        // notes: notes || undefined,
        // internal_notes: internalNotes || undefined,
        // order_date: orderDate ? new Date(orderDate).toISOString() : undefined,

        required_by: requiredBy ? toISTISOString(requiredBy) : undefined,
        notes: notes || undefined,
        internal_notes: internalNotes || undefined,
        items: cleanItems,
        charges: cleanCharges,
      };

      const order = await createOrder(activeFactory.id, payload);

      router.push(`/orders/${order.id}`);
      router.refresh();
    } catch (err) {
      setError(err?.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  }

  // async function handleDownloadProforma() {
  //   if (!activeFactory?.id) return;
  //   setError("");

  //   const cleanItems = items
  //     .filter((it) => it.product_id && toNumberSafe(it.quantity) > 0)
  //     .map((it) => ({
  //       product_id: it.product_id,
  //       quantity: toNumberSafe(it.quantity),
  //       unit_price: toNumberSafe(it.price),
  //       discount: 0,
  //       allocations:
  //         (it.allocations || [])
  //           .map((a) => ({ factory_id: a.factory_id, quantity: toNumberSafe(a.quantity) }))
  //           .filter((a) => a.factory_id && a.quantity > 0),
  //     }));

  //   if (cleanItems.length === 0) {
  //     setError("Please add at least one item.");
  //     return;
  //   }
  //   // allocations validation: sum must match item quantity
  //   const badAlloc = cleanItems.find((ci) => {
  //     const sum = (ci.allocations || []).reduce((s, a) => s + toNumberSafe(a.quantity), 0);
  //     return sum !== toNumberSafe(ci.quantity);
  //   });
  //   if (badAlloc) {
  //     setError("Item allocations must sum exactly to the item quantity.");
  //     return;
  //   }


  //   const cleanCharges = charges
  //     .filter((c) => (c.title || "").trim() && toNumberSafe(c.amount) !== 0)
  //     .map((c) => ({
  //       type: "OTHER",
  //       title: (c.title || "").trim(),
  //       amount: toNumberSafe(c.amount),
  //       meta: null,
  //     }));

  //   try {
  //     const payload = {
  //       client_id: clientId || undefined,
  //       sales_company_id: salesCompanyId || undefined,
  //       logistics: logistics ? String(logistics).trim() : undefined,
  //       // order_date: orderDate ? new Date(orderDate).toISOString() : undefined,
  //       // required_by: requiredBy ? new Date(requiredBy).toISOString() : undefined,
  //       required_by: requiredBy ? toISTISOString(requiredBy) : undefined,
  //       notes: notes || undefined,
  //       internal_notes: internalNotes || undefined,
  //       items: cleanItems,
  //       charges: cleanCharges,
  //     };

  //     const blob = await fetchProformaPdf(activeFactory.id, payload);
  //     const url = window.URL.createObjectURL(blob);
  //     const a = document.createElement("a");
  //     a.href = url;
  //     a.download = `proforma-${Date.now()}.pdf`;
  //     document.body.appendChild(a);
  //     a.click();
  //     a.remove();
  //     window.URL.revokeObjectURL(url);
  //   } catch (err) {
  //     setError(err?.message || "Failed to generate proforma invoice");
  //   }
  // }




  async function handleDownloadProforma() {
    if (!activeFactory?.id) return;
    setError("");

    if (!clientId) {
      setError("Client is required");
      return;
    }

    if (!salesCompanyId) {
      setError("Sales company is required. Add one in settings or select an available company.");
      return;
    }

    if (!orderDate) {
      setError("Order date is required for proforma preview.");
      return;
    }

    const cleanItems = items
      .filter((it) => it.product_id && toNumberSafe(it.quantity) > 0)
      .map((it) => {
        const q = toNumberSafe(it.quantity);
        const p = toNumberSafe(it.price);

        // Proforma preview API (per your spec) needs only product_id + quantity.
        // Keep unit_price optional as override if backend supports it.
        return {
          product_id: it.product_id,
          quantity: q,
          ...(p > 0 ? { unit_price: p } : {}),
        };
      });

    if (cleanItems.length === 0) {
      setError("Please add at least one item.");
      return;
    }

    const cleanCharges = charges
      .filter((c) => (c.title || "").trim() && toNumberSafe(c.amount) !== 0)
      .map((c) => ({
        // Keep type required by proforma spec; default to OTHER if not specified in UI
        type: "OTHER",
        title: (c.title || "").trim(),
        amount: toNumberSafe(c.amount),
      }));

    try {
      const payload = {
        client_id: clientId,
        sales_company_id: salesCompanyId || undefined,

        // ✅ Proforma preview API expects order_date (your snippet)
        order_date: orderDate ? toISTISOString(orderDate) : undefined,

        required_by: requiredBy ? toISTISOString(requiredBy) : undefined,
        notes: notes || undefined,
        internal_notes: internalNotes || undefined,

        items: cleanItems,
        charges: cleanCharges,
      };

      const blob = await fetchProformaPdf(activeFactory.id, payload);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proforma-preview-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.message || "Failed to generate proforma invoice");
    }
  }

  const handleCancel = () => router.push("/orders");

  // ✅ Quick actions (functional)
  const quickSetToday = () => {
    const t = new Date().toISOString().split("T")[0];
    setOrderDate(t);
  };

  const quickSetDeliveryPlus7 = () => {
    if (!orderDate) return;
    const d = new Date(orderDate);
    d.setDate(d.getDate() + 7);
    setRequiredBy(d.toISOString().split("T")[0]);
  };

  // There is no shipping address in backend payload anymore.
  // So "Use Client Address" is repurposed to append address into Notes (still useful + functional).
  const quickUseClientAddress = () => {
    if (!selectedClient?.address) return;
    setNotes((prev) => {
      const base = (prev || "").trim();
      const addr = `Client Address: ${selectedClient.address}`;
      if (!base) return addr;
      if (base.includes(addr)) return base;
      return `${base}\n\n${addr}`;
    });
  };

  if (!activeFactory) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 max-w-md">
          <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Select a Factory</h3>
          <p className="text-gray-600">Please select a factory from the top bar to create an order.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading client data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Create New Order</h1>
          <p className="text-gray-600">
            Create a new order for <span className="font-semibold text-blue-700">{activeFactory.name}</span>
          </p>
        </div>

        <button onClick={handleCancel} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-red-800">Error</h3>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Client */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Client *</label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                >
                  <option value="">Choose a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.company_name || client.name} {client.gstin ? `(${client.gstin})` : ""}
                    </option>
                  ))}
                </select>

                {clientId && selectedClient && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="font-semibold text-blue-800">
                          {(selectedClient.company_name || selectedClient.name || "C").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{selectedClient.company_name || selectedClient.name}</p>
                        {selectedClient.gstin && <p className="text-sm text-gray-600">GST: {selectedClient.gstin}</p>}
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedClient?._count?.contacts ?? selectedClient?.contacts?.length ?? 0} contacts •{" "}
                          {selectedClient?._count?.products ?? selectedClient?.products?.length ?? 0} products
                        </p>
                      </div>
                      <Link href={`/clients/${selectedClient.id}`} className="ml-auto text-sm text-blue-600 hover:text-blue-800">
                        View Profile →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Sales Company + Logistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company (Sales Company) <span className="text-red-600">*</span></label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
                    value={salesCompanyId}
                    onChange={(e) => setSalesCompanyId(e.target.value)}
                  >
                    <option value="">Select company...</option>
                    {salesCompanies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Required for the order and its invoice. Shown on payments too.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logistics (Optional)</label>
                  <input
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
                    value={logistics}
                    onChange={(e) => setLogistics(e.target.value)}
                    placeholder="BlueDart / Delhivery"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Internal Notes (Optional)</label>
                  <input
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Internal note for staff"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order Date *</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Required By (Optional)</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
                    value={requiredBy}
                    onChange={(e) => setRequiredBy(e.target.value)}
                    min={orderDate || undefined}
                  />
                  <p className="text-xs text-gray-500 mt-1">You can quickly set +7 days from the right panel.</p>
                </div>
              </div>

              {/* Items (required) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Order Items *</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                    disabled={loadingProducts}
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <div className="md:col-span-6">
                        <label className="text-xs text-gray-500">Product</label>
                        <select
                          value={it.product_id}
                          onChange={(e) => updateItem(idx, { product_id: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        >
                          <option value="">{loadingProducts ? "Loading products..." : "Select product"}</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name || p.product_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-xs text-gray-500">Qty</label>
                        <input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="text-xs text-gray-500">Price</label>
                        <input
                          type="number"
                          min={0}
                          value={it.price}
                          onChange={(e) => updateItem(idx, { price: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                          required
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

                      <div className="md:col-span-12 text-xs text-gray-600">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            Line total: <span className="font-semibold text-gray-800">{formatCurrency(toNumberSafe(it.quantity) * toNumberSafe(it.price))}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charges (optional) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Charges (Optional)</label>
                  <button type="button" onClick={addCharge} className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                    + Add Charge
                  </button>
                </div>

                <div className="space-y-3">
                  {charges.map((c, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <div className="md:col-span-7">
                        <label className="text-xs text-gray-500">Title</label>
                        <input
                          value={c.title}
                          onChange={(e) => updateCharge(idx, { title: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="e.g. Packaging"
                        />
                      </div>

                      <div className="md:col-span-4">
                        <label className="text-xs text-gray-500">Amount</label>
                        <input
                          type="number"
                          value={c.amount}
                          onChange={(e) => updateCharge(idx, { amount: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>

                      <div className="md:col-span-1 flex items-end justify-end">
                        <button type="button" onClick={() => removeCharge(idx)} className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100" title="Remove charge">
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order Notes (Optional)</label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
                  placeholder="Add any special instructions, requirements, or notes..."
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={handleDownloadProforma}
                disabled={!canSubmit}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Download Proforma / Draft
              </button>

              <button
                onClick={handleCreate}
                disabled={submitting || !canSubmit}
                className="px-6 py-3 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating Order...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Order Summary</h3>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Client:</span>
                <span className="font-medium text-gray-800">{selectedClient?.company_name || selectedClient?.name || "Not selected"}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Order Date:</span>
                <span className="font-medium text-gray-800">
                  {orderDate
                    ? new Date(orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                    : "Not set"}
                </span>
              </div>

              {requiredBy && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Required By:</span>
                  <span className="font-medium text-gray-800">
                    {new Date(requiredBy).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-blue-700">{formatCurrency(computedTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl shadow-lg p-6 text-white">
            <h3 className="font-semibold mb-4">Quick Actions</h3>

            <div className="space-y-3">
              <button onClick={quickSetToday} className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200">
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">Set to Today</span>
                </div>
                <span className="text-xs opacity-75">⌘T</span>
              </button>

              <button
                onClick={quickUseClientAddress}
                disabled={!selectedClient?.address}
                className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium">Use Client Address</span>
                </div>
                <span className="text-xs opacity-75">⌘A</span>
              </button>

              <button onClick={quickSetDeliveryPlus7} className="w-full flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200">
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">Set Required By (+7 days)</span>
                </div>
                <span className="text-xs opacity-75">⌘D</span>
              </button>
            </div>
          </div>

          {/* Factory Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Factory Information</h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Factory:</span> {activeFactory.name}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Total Clients:</span> {clients.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">Fields marked with * are required.</p>
      </div>
    </div>
  );
}

export default requireAuth(requireFactory(CreateOrderPage));
