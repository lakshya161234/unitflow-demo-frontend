"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { requireAuth } from "@/lib/requireAuth";
import { requireFactory } from "@/lib/requireFactory";
import { useFactory } from "@/lib/factoryContext";
import { useAuth } from "@/lib/authContext";
import { fetchProductionLogs, deleteProductionLog } from "@/lib/productionApi";
import { normalizeListResponse } from "@/lib/listResponse";
import PaginationControls from "@/components/PaginationControls";
import { useAppliedSearch } from "@/lib/useAppliedSearch";

function ProductionPage() {
  const { activeFactory } = useFactory();
  const auth = useAuth();
  const can = typeof auth?.can === "function" ? auth.can : () => true;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const { searchInput, setSearchInput, appliedSearch, applySearch, clearSearch, onSearchKeyDown } = useAppliedSearch("");
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 1 });

  async function load(page = pagination.page, pageSize = pagination.page_size) {
    if (!activeFactory?.id) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchProductionLogs({ q: appliedSearch || undefined, page, page_size: pageSize }, activeFactory.id);
      const normalized = normalizeListResponse(data);
      setRows(normalized.items || []);
      setPagination(normalized.pagination);
    } catch (e) {
      setError(e?.message || "Failed to load production logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!activeFactory?.id) return;
    load(1, pagination.page_size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFactory?.id, appliedSearch]);

  const visible = useMemo(() => {
    const s = appliedSearch.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => String(r.product?.name || r.product_name || "").toLowerCase().includes(s) || String(r.id || "").includes(appliedSearch));
  }, [rows, appliedSearch]);

  async function onDelete(id) {
    if (!activeFactory?.id || !can("production.delete")) return;
    if (!confirm("Delete this production log? This reverses the production stock movement if allowed.")) return;
    setDeletingId(id);
    setError("");
    try {
      await deleteProductionLog(id, activeFactory.id);
      await load(pagination.page, pagination.page_size);
    } catch (e) {
      setError(e?.message || "Failed to delete production log");
    } finally {
      setDeletingId("");
    }
  }

  if (!activeFactory) return <div className="p-6"><div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6"><p className="text-yellow-800">Please select a factory to view production.</p></div></div>;
  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-center"><div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div><p className="text-gray-600">Loading production logs...</p></div></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-gray-800">Production</h1><p className="text-gray-600">Factory: {activeFactory.name}</p></div><Link href="/production/create" className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800">Create Log</Link></div>
      {error ? <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div> : null}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200"><div className="flex w-full md:max-w-xl gap-3"><input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={onSearchKeyDown} placeholder="Search by product or log id" className="flex-1 px-4 py-3 border border-gray-300 rounded-lg" /><button onClick={applySearch} className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Search</button><button onClick={clearSearch} className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">Clear</button></div></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50"><tr><th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Log</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Product</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Quantity</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-200">
              {visible.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No production logs found.</td></tr> : visible.map((r) => <tr key={r.id}><td className="px-6 py-4">{r.id}</td><td className="px-6 py-4">{r.product?.name || r.product_name || "-"}</td><td className="px-6 py-4">{r.quantity ?? "-"}</td><td className="px-6 py-4">{r.date ? new Date(r.date).toLocaleDateString("en-IN") : r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : "-"}</td><td className="px-6 py-4">{can("production.delete") ? <button onClick={() => onDelete(r.id)} disabled={deletingId === r.id} className="px-3 py-1 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-60">{deletingId === r.id ? "Deleting..." : "Delete"}</button> : <span className="text-gray-400">-</span>}</td></tr>)}
            </tbody>
          </table>
        </div>
        <PaginationControls pagination={pagination} currentCount={rows.length} itemLabel="production logs" pageSizeOptions={[10, 20, 25, 50]} onPageChange={(page) => load(page, pagination.page_size)} onPageSizeChange={(size) => load(1, size)} />
      </div>
    </div>
  );
}

export default requireAuth(requireFactory(ProductionPage));
