


"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAuth } from "@/lib/requireAuth";
import { requireFactory } from "@/lib/requireFactory";
import { useFactory } from "@/lib/factoryContext";
import { fetchProducts } from "@/lib/productApi";
import { createProductionLog } from "@/lib/productionApi";

function ProductionCreatePage() {
  const router = useRouter();
  const { activeFactory } = useFactory();

  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);

  // ✅ match backend keys
  const [form, setForm] = useState({
    product_id: "",
    quantity: 0,
    notes: "",
  });

  useEffect(() => {
    if (!activeFactory?.id) return;

    fetchProducts(activeFactory.id)
      .then((data) => setProducts(Array.isArray(data) ? data : data?.rows || []))
      .catch(() => setProducts([]));
  }, [activeFactory?.id]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!activeFactory?.id) return;

    setSaving(true);
    try {
      await createProductionLog(
        {
          product_id: form.product_id,
          quantity: Number(form.quantity),
          notes: form.notes || undefined,
        },
        activeFactory.id
      );

      router.push("/production");
    } catch (err) {
      alert(err?.message || "Failed to create production log");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Add Production Log</h1>
        <p className="text-gray-500">Creates an Inventory IN movement automatically</p>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4 max-w-2xl">
        <div>
          <label className="text-sm text-gray-600">Product</label>
          <select
            value={form.product_id}
            onChange={(e) => setForm((p) => ({ ...p, product_id: e.target.value }))}
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

        <div>
          <label className="text-sm text-gray-600">Quantity</label>
          <input
            type="number"
            value={form.quantity}
            onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
            required
            min={0}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push("/production")}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? "Saving..." : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default requireAuth(requireFactory(ProductionCreatePage));