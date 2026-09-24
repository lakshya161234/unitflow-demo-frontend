"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "@/lib/requireAuth";
import { requireFactory } from "@/lib/requireFactory";
import { fetchOrders } from "@/lib/orderApi";
import { useFactory } from "@/lib/factoryContext";
import { normalizeListResponse } from "@/lib/listResponse";
import PaginationControls from "@/components/PaginationControls";
import { useAppliedSearch } from "@/lib/useAppliedSearch";

function getSalesCompanyLabel(order) {
  return (
    order?.sales_company?.name ||
    order?.salesCompany?.name ||
    order?.sales_company_name ||
    order?.salesCompanyName ||
    order?.company?.name ||
    order?.company_name ||
    "-"
  );
}

function getSalesCompanyId(order) {
  return (
    order?.sales_company_id ||
    order?.salesCompanyId ||
    order?.company_id ||
    order?.companyId ||
    ""
  );
}

function toNumberSafe(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toCsv(rows) {
  if (!rows?.length) return "";

  const cols = [
    { key: "id", label: "Order ID" },
    { key: "order_no", label: "Order No" },
    { key: "status", label: "Status" },
    { key: "order_date", label: "Order Date" },
    { key: "required_by", label: "Required By" },
    { key: "total", label: "Total" },
    { key: "subtotal", label: "Subtotal" },
    { key: "total_charges", label: "Total Charges" },
    { key: "sales_company", label: "Sales Company" },
    { key: "client_name", label: "Client" },
    { key: "__items", label: "Items Count" },
    { key: "__invoices", label: "Invoices Count" },
  ];

  const esc = (v) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };

  const head = cols.map((c) => esc(c.label)).join(",");
  const body = rows
    .map((r) => {
      const rr = {
        ...r,
        client_name: r?.client?.company_name || r?.client?.name || "",
        sales_company: getSalesCompanyLabel(r),
        __items: r?._count?.items ?? (Array.isArray(r.items) ? r.items.length : 0),
        __invoices: r?._count?.invoices ?? (Array.isArray(r.invoices) ? r.invoices.length : 0),
      };
      return cols.map((c) => esc(rr[c.key])).join(",");
    })
    .join("\n");

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

function OrdersPage() {
  const { activeFactory } = useFactory();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCompanyId, setFilterCompanyId] = useState("all");
  const { searchInput, setSearchInput, appliedSearch, applySearch, clearSearch, onSearchKeyDown } = useAppliedSearch("");
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 1 });

  const salesCompanies = useMemo(() => {
    const map = new Map();
    (orders || []).forEach((o) => {
      const id = getSalesCompanyId(o);
      const label = getSalesCompanyLabel(o);
      const key = id || label;
      if (!key || key === "-") return;
      if (!map.has(key)) map.set(key, label);
    });
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [orders]);

  async function loadOrders(nextPage = pagination.page, nextPageSize = pagination.page_size) {
    if (!activeFactory?.id) return;

    setLoading(true);
    setError("");

    try {
      const filters = { page: nextPage, page_size: nextPageSize };
      if (filterStatus !== "all") filters.status = filterStatus;
      if (filterCompanyId !== "all") filters.sales_company_id = filterCompanyId;
      if (appliedSearch.trim()) filters.q = appliedSearch.trim();

      let data;
      try {
        data = await fetchOrders(filters, activeFactory.id);
      } catch {
        data = await fetchOrders(activeFactory.id);
      }

      const normalized = normalizeListResponse(data);
      setOrders(normalized.items || []);
      setPagination(normalized.pagination);
    } catch (e) {
      setError(e?.message || "Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!activeFactory?.id) return;
    loadOrders(1, pagination.page_size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFactory?.id, filterStatus, filterCompanyId, appliedSearch]);

  const filteredOrders = useMemo(() => {
    return (orders || []).filter((order) => {
      if (filterStatus !== "all" && order.status !== filterStatus) return false;

      if (filterCompanyId !== "all") {
        const id = String(getSalesCompanyId(order) || "");
        const labelKey = String(getSalesCompanyLabel(order) || "");
        const selected = String(filterCompanyId);
        if (id !== selected && labelKey !== selected) return false;
      }

      if (appliedSearch) {
        const searchLower = appliedSearch.toLowerCase();
        const clientName = String(order.client?.company_name || order.client?.name || "").toLowerCase();
        const orderNo = String(order.order_no || "").toLowerCase();
        const orderId = String(order.id || "");
        const company = String(getSalesCompanyLabel(order) || "").toLowerCase();
        return (
          clientName.includes(searchLower) ||
          orderNo.includes(searchLower) ||
          orderId.includes(appliedSearch) ||
          company.includes(searchLower)
        );
      }

      return true;
    });
  }, [orders, filterStatus, filterCompanyId, appliedSearch]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(toNumberSafe(amount));

  const getStatusColor = (status) =>
    ({
      DRAFT: "bg-gray-100 text-gray-800",
      CONFIRMED: "bg-yellow-100 text-yellow-800",
      PROCESSING: "bg-blue-100 text-blue-800",
      SHIPPED: "bg-indigo-100 text-indigo-800",
      DELIVERED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
      CLOSED: "bg-slate-100 text-slate-800",
    }[status] || "bg-gray-100 text-gray-800");

  if (!activeFactory) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 max-w-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Select a Factory</h3>
          <p className="text-gray-600">Please select a factory from the top bar to view orders.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="font-medium text-red-800">Error Loading Orders</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button onClick={() => loadOrders(pagination.page, pagination.page_size)} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Management</h1>
          <p className="text-gray-600">
            Track and manage all orders for <span className="font-semibold text-blue-700">{activeFactory.name}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => downloadTextFile(`orders-${activeFactory.id}.csv`, toCsv(filteredOrders), "text/csv;charset=utf-8")} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Export CSV
          </button>
          <Link href="/orders/create" className="px-4 py-2 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-medium rounded-lg shadow-sm">
            Create New Order
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
    
    {/* Search */}
    <div className="flex gap-2 w-full md:col-span-2">
      <input
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        onKeyDown={onSearchKeyDown}
        placeholder="Search client, order no, company"
        className="flex-1 min-w-0 px-4 py-3 border border-gray-300 rounded-lg"
      />
      <button
        onClick={applySearch}
        className="px-4 py-3 whitespace-nowrap bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Search
      </button>
    </div>

    {/* Status Filter */}
    <select
      value={filterStatus}
      onChange={(e) => setFilterStatus(e.target.value)}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
    >
      <option value="all">All statuses</option>
      {["DRAFT", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "CLOSED"].map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>

    {/* Company Filter */}
    <select
      value={filterCompanyId}
      onChange={(e) => setFilterCompanyId(e.target.value)}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
    >
      <option value="all">All companies</option>
      {salesCompanies.map((c) => (
        <option key={c.id} value={c.id}>{c.label}</option>
      ))}
    </select>

    {/* Clear Button */}
    <button
      onClick={() => {
        clearSearch();
        setFilterStatus("all");
        setFilterCompanyId("all");
      }}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
    >
      Clear Filters
    </button>
  </div>
</div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Order Details</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Client</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Company</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">No orders found.</td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{order.order_no || order.id}</p>
                      <p className="text-xs text-gray-500">ID: {order.id}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{order.client?.company_name || order.client?.name || "-"}</td>
                    <td className="px-6 py-4 text-gray-900">{getSalesCompanyLabel(order)}</td>
                    <td className="px-6 py-4 text-gray-900">{formatCurrency(order.total ?? order.total_amount ?? 0)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status || "Unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{(order.order_date || order.created_at) ? new Date(order.order_date || order.created_at).toLocaleDateString("en-IN") : "-"}</p>
                      <p className="text-xs text-gray-500">{(order.order_date || order.created_at) ? new Date(order.order_date || order.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/orders/${order.id}`} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls pagination={pagination} currentCount={orders.length} itemLabel="orders" pageSizeOptions={[10, 20, 25, 50]} onPageChange={(page) => loadOrders(page, pagination.page_size)} onPageSizeChange={(size) => loadOrders(1, size)} />
      </div>
    </div>
  );
}

export default requireAuth(requireFactory(OrdersPage));
