"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { requireAuth } from "@/lib/requireAuth";
import { requireFactory } from "@/lib/requireFactory";
import { useFactory } from "@/lib/factoryContext";
import { useAuth } from "@/lib/authContext";
import { fetchPayments, deletePayment } from "@/lib/paymentApi";
import { normalizeListResponse } from "@/lib/listResponse";
import PaginationControls from "@/components/PaginationControls";
import { useAppliedSearch } from "@/lib/useAppliedSearch";

function PaymentsPage() {
  const { activeFactory } = useFactory();
  const auth = useAuth();
  const can = typeof auth?.can === "function" ? auth.can : () => true;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const {
    searchInput,
    setSearchInput,
    appliedSearch,
    applySearch,
    clearSearch,
    onSearchKeyDown,
  } = useAppliedSearch("");
  const [method, setMethod] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 1,
  });

  async function load(page = pagination.page, pageSize = pagination.page_size) {
    if (!activeFactory?.id) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchPayments(
        {
          q: appliedSearch || undefined,
          method: method || undefined,
          page,
          page_size: pageSize,
        },
        activeFactory.id
      );
      const normalized = normalizeListResponse(data);
      setRows(normalized.items || []);
      setPagination(normalized.pagination);
    } catch (e) {
      setError(e?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!activeFactory?.id) return;
    load(1, pagination.page_size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFactory?.id, appliedSearch, method]);

  const visible = useMemo(() => {
    const s = appliedSearch.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        String(r.id || "").includes(appliedSearch) ||
        String(r.payment_no || "").toLowerCase().includes(s) ||
        String(r.client?.company_name || r.client?.name || "")
          .toLowerCase()
          .includes(s)
    );
  }, [rows, appliedSearch]);

  async function onDelete(id) {
    if (!activeFactory?.id || !can("payments.delete")) return;
    if (!confirm("Delete this payment? This will reverse the payment and recompute linked invoice status.")) return;
    setDeletingId(id);
    setError("");
    try {
      await deletePayment(id, activeFactory.id);
      await load(pagination.page, pagination.page_size);
    } catch (e) {
      setError(e?.message || "Failed to delete payment");
    } finally {
      setDeletingId("");
    }
  }

  if (!activeFactory) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <p className="text-yellow-800">
            Please select a factory to view payments.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
        <p className="text-gray-600">Factory: {activeFactory.name}</p>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      ) : null}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex gap-3">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search by payment id or client"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg"
              />
              <button
                onClick={applySearch}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Search
              </button>
            </div>

            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">All methods</option>
              {["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "CARD", "OTHER"].map(
                (m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                )
              )}
            </select>

            <button
              onClick={() => {
                clearSearch();
                setMethod("");
              }}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No payments found.
                  </td>
                </tr>
              ) : (
                visible.map((row) => {
                  const invoiceId = row?.allocations?.[0]?.invoice_id || row?.allocations?.[0]?.invoice?.id;

                  return (
                    <tr key={row.id}>
                      <td className="px-6 py-4">
                        {invoiceId ? (
                          <Link
                            href={`/invoices/${invoiceId}`}
                            className="text-blue-700 hover:underline"
                          >
                            {row.payment_no || row.id}
                          </Link>
                        ) : (
                          <span className="text-gray-900">{row.payment_no || row.id}</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {row.client?.company_name || row.client?.name || "-"}
                      </td>

                      <td className="px-6 py-4">
                        {row.method || row.payment_method || "-"}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {row.status || "-"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(Number(row.amount || 0))}
                      </td>

                      <td className="px-6 py-4">
                        {row.paid_at
                          ? new Date(row.paid_at).toLocaleDateString("en-IN")
                          : row.payment_date
                          ? new Date(row.payment_date).toLocaleDateString("en-IN")
                          : row.created_at
                          ? new Date(row.created_at).toLocaleDateString("en-IN")
                          : "-"}
                      </td>

                      <td className="px-6 py-4">
                        {can("payments.delete") ? (
                          <button
                            onClick={() => onDelete(row.id)}
                            disabled={deletingId === row.id}
                            className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-60"
                          >
                            {deletingId === row.id ? "Deleting..." : "Delete"}
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          pagination={pagination}
          currentCount={rows.length}
          itemLabel="payments"
          pageSizeOptions={[10, 20, 25, 50]}
          onPageChange={(page) => load(page, pagination.page_size)}
          onPageSizeChange={(size) => load(1, size)}
        />
      </div>
    </div>
  );
}

export default requireAuth(requireFactory(PaymentsPage));
