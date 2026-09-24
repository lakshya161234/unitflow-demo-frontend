"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requireAuth } from "@/lib/requireAuth";
import { requireFactory } from "@/lib/requireFactory";
import { useFactory } from "@/lib/factoryContext";
import { createPurchase } from "@/lib/purchaseApi";

function NewPurchasePage() {
  const router = useRouter();
  const { activeFactory } = useFactory();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    purchase_no: "",
    purchase_date: "",
    vendor_name: "",
    vendor_phone: "",
    vendor_gstin: "",
    notes: "",
  });

  const [items, setItems] = useState([{ description: "", quantity: 1, unit_price: 0 }]);
  const [charges, setCharges] = useState([{ label: "", amount: 0 }]);

  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function onSubmit(e) {
    e.preventDefault();
    if (!activeFactory?.id) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        purchase_date: form.purchase_date ? new Date(form.purchase_date).toISOString() : undefined,
        items: items.filter((i) => i.description && Number(i.quantity) > 0),
        charges: charges.filter((c) => c.label && Number(c.amount) !== 0),
      };
      const created = await createPurchase(payload, activeFactory.id);
      router.push(`/purchases/${created.id}`);
    } catch (err) {
      alert(err?.message || "Failed to create purchase");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">New Purchase</h1>
        <p className="text-gray-500">Create purchase slip (factory scoped)</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Purchase No</label>
              <input
                value={form.purchase_no}
                onChange={(e) => onChange("purchase_no", e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Purchase Date</label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) => onChange("purchase_date", e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Vendor Name</label>
              <input
                value={form.vendor_name}
                onChange={(e) => onChange("vendor_name", e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Vendor Phone</label>
              <input
                value={form.vendor_phone}
                onChange={(e) => onChange("vendor_phone", e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Vendor GSTIN</label>
              <input
                value={form.vendor_gstin}
                onChange={(e) => onChange("vendor_gstin", e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => onChange("notes", e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Items</h3>
            <button
              type="button"
              onClick={() => setItems((p) => [...p, { description: "", quantity: 1, unit_price: 0 }])}
              className="text-sm text-blue-700 hover:underline"
            >
              + Add Item
            </button>
          </div>
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <input
                  value={it.description}
                  onChange={(e) =>
                    setItems((p) => p.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))
                  }
                  placeholder="Description"
                  className="md:col-span-4 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  value={it.quantity}
                  onChange={(e) =>
                    setItems((p) => p.map((x, i) => (i === idx ? { ...x, quantity: Number(e.target.value) } : x)))
                  }
                  placeholder="Qty"
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  value={it.unit_price}
                  onChange={(e) =>
                    setItems((p) => p.map((x, i) => (i === idx ? { ...x, unit_price: Number(e.target.value) } : x)))
                  }
                  placeholder="Unit Price"
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Charges</h3>
            <button
              type="button"
              onClick={() => setCharges((p) => [...p, { label: "", amount: 0 }])}
              className="text-sm text-blue-700 hover:underline"
            >
              + Add Charge
            </button>
          </div>
          <div className="space-y-3">
            {charges.map((ch, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <input
                  value={ch.label}
                  onChange={(e) =>
                    setCharges((p) => p.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))
                  }
                  placeholder="Label"
                  className="md:col-span-4 px-3 py-2 border border-gray-300 rounded-lg"
                />
                <div className="md:col-span-2">
                  <input
                    type="number"
                    value={ch.amount}
                    onChange={(e) =>
                      setCharges((p) => p.map((x, i) => (i === idx ? { ...x, amount: Number(e.target.value) } : x)))
                    }
                    placeholder="Amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Create Purchase"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default requireAuth(requireFactory(NewPurchasePage));
