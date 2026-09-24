"use client";

import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "@/lib/requireAuth";
import { useAuth } from "@/lib/authContext";
import { fetchProducts, createProduct, updateProduct, deleteProduct } from "@/lib/productApi";
import { fetchCategories } from "@/lib/categoryApi";
import { normalizeListResponse } from "@/lib/listResponse";
import PaginationControls from "@/components/PaginationControls";
import { useAppliedSearch } from "@/lib/useAppliedSearch";

function ProductsPage() {
  const auth = useAuth();
  const can = typeof auth?.can === "function" ? auth.can : () => true;

  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({ page: 1, page_size: 25, total: 0, total_pages: 1 });

  const { searchInput, setSearchInput, appliedSearch, applySearch, clearSearch, onSearchKeyDown } = useAppliedSearch("");
  const [saving, setSaving] = useState(false);

  const emptyForm = { name: "", sku: "", category_id: "", price: "", unit: "pcs" };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  async function reload(nextPage = pagination.page, nextPageSize = pagination.page_size) {
    setLoading(true);
    setError("");
    try {
      const [p, c] = await Promise.all([
        fetchProducts({ q: appliedSearch || undefined, page: nextPage, page_size: nextPageSize }),
        fetchCategories(),
      ]);
      const normalized = normalizeListResponse(p);
      setRows(normalized.items || []);
      setPagination(normalized.pagination);
      setCategories(Array.isArray(c) ? c : c?.rows || c?.items || []);
    } catch (e) {
      setError(e?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(1, pagination.page_size); /* eslint-disable-next-line */ }, [appliedSearch]);
  useEffect(() => { fetchCategories().then((c) => setCategories(Array.isArray(c) ? c : c?.rows || c?.items || [])).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    const s = appliedSearch.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const name = String(r?.name || r?.product_name || "").toLowerCase();
      const sku = String(r?.sku || "").toLowerCase();
      return name.includes(s) || sku.includes(s);
    });
  }, [rows, appliedSearch]);

  async function onSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku?.trim() || null,
        category_id: form.category_id || null,
        price: form.price === "" ? null : Number(form.price),
        unit: form.unit?.trim() || "pcs",
      };
      if (editingId) await updateProduct(editingId, payload);
      else await createProduct(payload);
      setForm(emptyForm);
      setEditingId(null);
      await reload(pagination.page, pagination.page_size);
    } catch (e) {
      setError(e?.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete this product?")) return;
    setSaving(true);
    setError("");
    try {
      await deleteProduct(id);
      await reload(pagination.page, pagination.page_size);
    } catch (e) {
      setError(e?.message || "Failed to delete product");
    } finally {
      setSaving(false);
    }
  }

  const catName = (category_id) => categories.find((c) => c.id === category_id)?.name || "-";

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-center"><div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div><p className="text-gray-600">Loading products...</p></div></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Products</h1>
          <p className="text-gray-600">Company-level product master</p>
        </div>
      </div>

      {error ? <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div> : null}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex w-full md:max-w-xl gap-3">
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={onSearchKeyDown} placeholder="Search by product name or SKU" className="flex-1 px-4 py-3 border border-gray-300 rounded-lg" />
            <button onClick={applySearch} className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Search</button>
            <button onClick={clearSearch} className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">Clear</button>
          </div>
        </div>

        {(can("products.create") || editingId) && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-3">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" className="px-4 py-3 border border-gray-300 rounded-lg" />
            <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU" className="px-4 py-3 border border-gray-300 rounded-lg" />
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-lg bg-white">
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price" type="number" className="px-4 py-3 border border-gray-300 rounded-lg" />
            <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Unit" className="px-4 py-3 border border-gray-300 rounded-lg" />
            <div className="md:col-span-5 flex gap-3">
              <button onClick={onSubmit} disabled={saving || !form.name.trim() || (editingId ? !can("products.update") : !can("products.create"))} className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">{saving ? "Saving..." : editingId ? "Save Changes" : "Create Product"}</button>
              {editingId ? <button onClick={() => { setEditingId(null); setForm(emptyForm); }} className="px-5 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button> : null}
            </div>
          </div>
        )}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{r.name || r.product_name}</td>
                  <td className="px-6 py-4 text-gray-600">{r.sku || "-"}</td>
                  <td className="px-6 py-4 text-gray-600">{r.category?.name || catName(r.category_id)}</td>
                  <td className="px-6 py-4 text-gray-600">{r.price ?? "-"}</td>
                  <td className="px-6 py-4 text-gray-600">{r.unit || "-"}</td>
                  <td className="px-6 py-4"><div className="flex gap-2">{can("products.update") && <button onClick={() => { setEditingId(r.id); setForm({ name: r.name || r.product_name || "", sku: r.sku || "", category_id: r.category_id || r.category?.id || "", price: r.price ?? "", unit: r.unit || "pcs" }); }} className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg">Edit</button>}{can("products.delete") && <button onClick={() => onDelete(r.id)} disabled={saving} className="px-3 py-1 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-60">Delete</button>}</div></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">No products found.</td></tr>}
            </tbody>
          </table>
        </div>

        <PaginationControls pagination={pagination} currentCount={rows.length} itemLabel="products" pageSizeOptions={[10,20,25,50]} onPageChange={(page) => reload(page, pagination.page_size)} onPageSizeChange={(size) => reload(1, size)} />
      </div>
    </div>
  );
}

export default requireAuth(ProductsPage);
