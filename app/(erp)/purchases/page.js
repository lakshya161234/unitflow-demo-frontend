"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { requireAuth } from "@/lib/requireAuth";
import { requireFactory } from "@/lib/requireFactory";
import { useFactory } from "@/lib/factoryContext";
import { useAuth } from "@/lib/authContext";
import { fetchPurchases, deletePurchase } from "@/lib/purchaseApi";
import { normalizeListResponse } from "@/lib/listResponse";
import PaginationControls from "@/components/PaginationControls";
import { useAppliedSearch } from "@/lib/useAppliedSearch";

function PurchasesPage() {
  const { activeFactory } = useFactory();
  const auth = useAuth();
  const can = typeof auth?.can === "function" ? auth.can : () => true;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const { searchInput, setSearchInput, appliedSearch, applySearch, clearSearch, onSearchKeyDown } = useAppliedSearch("");
  const [status, setStatus] = useState("");
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 1 });

  async function load(page = pagination.page, pageSize = pagination.page_size) {
    if (!activeFactory?.id) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchPurchases({ q: appliedSearch || undefined, status: status || undefined, page, page_size: pageSize }, activeFactory.id);
      const normalized = normalizeListResponse(data);
      setRows(normalized.items || []);
      setPagination(normalized.pagination);
    } catch (e) {
      setError(e?.message || "Failed to load purchases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!activeFactory?.id) return;
    load(1, pagination.page_size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFactory?.id, appliedSearch, status]);

  const visible = useMemo(() => {
    const s = appliedSearch.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((p) => String(p.purchase_no || p.id || "").toLowerCase().includes(s) || String(p.vendor_name || "").toLowerCase().includes(s));
  }, [rows, appliedSearch]);

  async function onDelete(id) {
    if (!activeFactory?.id || !can("purchases.delete")) return;
    if (!confirm("Delete this purchase? This performs a soft delete.")) return;
    setDeletingId(id);
    setError("");
    try {
      await deletePurchase(id, activeFactory.id);
      await load(pagination.page, pagination.page_size);
    } catch (e) {
      setError(e?.message || "Failed to delete purchase");
    } finally {
      setDeletingId("");
    }
  }

  if (!activeFactory) return <div className="p-6"><div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6"><p className="text-yellow-800">Please select a factory to view purchases.</p></div></div>;
  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-center"><div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div><p className="text-gray-600">Loading purchases...</p></div></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-gray-800">Purchases</h1><p className="text-gray-600">Factory: {activeFactory.name}</p></div><Link href="/purchases/new" className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800">Create Purchase</Link></div>
      {error ? <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div> : null}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200"><div className="grid grid-cols-1 md:grid-cols-4 gap-4"><div className="md:col-span-2 flex gap-3"><input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={onSearchKeyDown} placeholder="Search purchase no or vendor" className="flex-1 px-4 py-3 border border-gray-300 rounded-lg" /><button onClick={applySearch} className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Search</button></div><select value={status} onChange={(e) => setStatus(e.target.value)} className="px-4 py-3 border border-gray-300 rounded-lg bg-white"><option value="">All statuses</option>{["DRAFT", "CONFIRMED", "RECEIVED", "CANCELLED", "CLOSED"].map((s) => <option key={s} value={s}>{s}</option>)}</select><button onClick={() => { clearSearch(); setStatus(""); }} className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">Clear Filters</button></div></div>
        <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase No</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{visible.length === 0 ? <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No purchases</td></tr> : visible.map((p) => <tr key={p.id} className="hover:bg-gray-50"><td className="px-6 py-4 text-sm font-medium text-gray-900"><Link href={`/purchases/${p.id}`} className="text-blue-700 hover:underline">{p.purchase_no || `PO-${p.id}`}</Link></td><td className="px-6 py-4 text-sm text-gray-700">{p.vendor_name || "-"}</td><td className="px-6 py-4 text-sm text-gray-700">{p.purchase_date ? new Date(p.purchase_date).toLocaleDateString("en-IN") : "-"}</td><td className="px-6 py-4 text-sm text-gray-700"><span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{p.status || "-"}</span></td><td className="px-6 py-4 text-sm text-gray-900 text-right">{p.total ?? 0}</td><td className="px-6 py-4 text-sm"><div className="flex flex-wrap gap-2"><Link href={`/purchases/${p.id}`} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">View</Link>{can("purchases.delete") ? <button onClick={() => onDelete(p.id)} disabled={deletingId === p.id} className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-60">{deletingId === p.id ? "Deleting..." : "Delete"}</button> : null}</div></td></tr>)}</tbody></table></div>
        <PaginationControls pagination={pagination} currentCount={rows.length} itemLabel="purchases" pageSizeOptions={[10, 20, 25, 50]} onPageChange={(page) => load(page, pagination.page_size)} onPageSizeChange={(size) => load(1, size)} />
      </div>
    </div>
  );
}

export default requireAuth(requireFactory(PurchasesPage));
