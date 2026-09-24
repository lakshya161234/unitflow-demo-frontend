"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchInvoices, deleteInvoice } from "@/lib/invoiceApi";
import { useFactory } from "@/lib/factoryContext";
import { useAuth } from "@/lib/authContext";
import Link from "next/link";
import { requireAuth } from "@/lib/requireAuth";
import { requireFactory } from "@/lib/requireFactory";
import { normalizeListResponse } from "@/lib/listResponse";
import PaginationControls from "@/components/PaginationControls";
import { useAppliedSearch } from "@/lib/useAppliedSearch";

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function toCsv(rows) {
  if (!rows?.length) return "";
  const cols = [
    { key: "id", label: "Invoice ID" },
    { key: "invoice_no", label: "Invoice No" },
    { key: "kind", label: "Kind" },
    { key: "status", label: "Status" },
    { key: "issue_date", label: "Issue Date" },
    { key: "due_date", label: "Due Date" },
    { key: "subtotal", label: "Subtotal" },
    { key: "total_charges", label: "Total Charges" },
    { key: "total", label: "Total" },
    { key: "client_name", label: "Client" },
    { key: "order_no", label: "Order No" },
  ];
  const esc = (v) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };
  const head = cols.map((c) => esc(c.label)).join(",");
  const body = rows.map((r) => {
    const rr = {
      ...r,
      client_name: r?.client?.company_name || r?.client?.name || "",
      order_no: r?.order?.order_no || r?.order?.id || r?.order_id || "",
    };
    return cols.map((c) => esc(rr[c.key])).join(",");
  }).join("\n");
  return `${head}\n${body}\n`;
}

function downloadTextFile(filename, content, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function InvoicesPage() {
  const { activeFactory } = useFactory();
  const auth = useAuth();
  const can = typeof auth?.can === "function" ? auth.can : () => true;

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const { searchInput, setSearchInput, appliedSearch, applySearch, clearSearch, onSearchKeyDown } = useAppliedSearch("");
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 1 });

  async function loadInvoices(page = pagination.page, pageSize = pagination.page_size) {
    if (!activeFactory?.id) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchInvoices({ status: filterStatus !== "ALL" ? filterStatus : undefined, q: appliedSearch || undefined, page, page_size: pageSize }, activeFactory.id);
      const normalized = normalizeListResponse(data);
      setInvoices(normalized.items || []);
      setPagination(normalized.pagination);
    } catch (e) {
      setError(e?.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!activeFactory?.id) return;
    loadInvoices(1, pagination.page_size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFactory?.id, filterStatus, appliedSearch]);

  const filteredInvoices = useMemo(() => {
    const s = appliedSearch.trim().toLowerCase();
    if (!s) return invoices;
    return invoices.filter((inv) => String(inv.invoice_no || "").toLowerCase().includes(s) || String(inv.client?.company_name || inv.client?.name || "").toLowerCase().includes(s) || String(inv.id || "").includes(appliedSearch));
  }, [invoices, appliedSearch]);

  async function onDelete(id) {
    if (!activeFactory?.id || !can("invoices.delete")) return;
    if (!confirm("Delete this invoice? It will be marked VOID and inactive if allowed.")) return;
    setDeletingId(id);
    setError("");
    try {
      await deleteInvoice(id, activeFactory.id);
      await loadInvoices(pagination.page, pagination.page_size);
    } catch (e) {
      setError(e?.message || "Failed to delete invoice");
    } finally {
      setDeletingId("");
    }
  }

  if (!activeFactory) return <div className="p-6"><div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6"><p className="text-yellow-800">Please select a factory to view invoices.</p></div></div>;
  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-center"><div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div><p className="text-gray-600">Loading invoices...</p></div></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-800">Invoices</h1><p className="text-gray-600">Factory: {activeFactory.name}</p></div>
        <div className="flex gap-3"><button onClick={() => downloadTextFile(`invoices-${activeFactory.id}.csv`, toCsv(filteredInvoices), "text/csv;charset=utf-8")} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Export CSV</button></div>
      </div>
      {error ? <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div> : null}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex gap-3"><input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={onSearchKeyDown} placeholder="Search invoice no, client, id" className="flex-1 px-4 py-3 border border-gray-300 rounded-lg" /><button onClick={applySearch} className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Search</button></div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-3 border border-gray-300 rounded-lg bg-white">
              <option value="ALL">All statuses</option>
              {["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOID"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => { clearSearch(); setFilterStatus("ALL"); }} className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">Clear Filters</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Invoice</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Client</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Kind</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Issue Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.length === 0 ? <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No invoices found.</td></tr> : filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4"><div className="font-medium text-gray-900">{inv.invoice_no || inv.id}</div><div className="text-xs text-gray-500">ID: {inv.id}</div></td>
                  <td className="px-6 py-4 text-gray-700">{inv.client?.company_name || inv.client?.name || "-"}</td>
                  <td className="px-6 py-4 text-gray-700">{inv.kind || "-"}</td>
                  <td className="px-6 py-4"><span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{inv.status || "-"}</span></td>
                  <td className="px-6 py-4 text-gray-700">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(toNumber(inv.total))}</td>
                  <td className="px-6 py-4 text-gray-700">{inv.issue_date ? new Date(inv.issue_date).toLocaleDateString("en-IN") : "-"}</td>
                  <td className="px-6 py-4"><div className="flex flex-wrap gap-2"><Link href={`/invoices/${inv.id}`} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">View</Link>{can("invoices.delete") ? <button onClick={() => onDelete(inv.id)} disabled={deletingId === inv.id} className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-60">{deletingId === inv.id ? "Deleting..." : "Delete"}</button> : null}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls pagination={pagination} currentCount={invoices.length} itemLabel="invoices" pageSizeOptions={[10, 20, 25, 50]} onPageChange={(page) => loadInvoices(page, pagination.page_size)} onPageSizeChange={(size) => loadInvoices(1, size)} />
      </div>
    </div>
  );
}

export default requireAuth(requireFactory(InvoicesPage));
