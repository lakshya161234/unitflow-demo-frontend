"use client";

import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "@/lib/requireAuth";
import { requireFactory } from "@/lib/requireFactory";
import { useFactory } from "@/lib/factoryContext";
import { fetchProducts } from "@/lib/productApi";
import { fetchStock, fetchStockSummary, fetchMovements } from "@/lib/inventoryApi";
import { normalizeListResponse } from "@/lib/listResponse";
import PaginationControls from "@/components/PaginationControls";

function toNumberSafe(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatQty(v) {
  return toNumberSafe(v).toLocaleString("en-IN");
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{formatQty(value)}</p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

function InventoryPage() {
  const { activeFactory } = useFactory();
  const [tab, setTab] = useState("stock");
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stock, setStock] = useState([]);
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stockPagination, setStockPagination] = useState({ page: 1, page_size: 25, total: 0, total_pages: 1 });
  const [movementPagination, setMovementPagination] = useState({ page: 1, page_size: 50, total: 0, total_pages: 1 });

  useEffect(() => {
    if (!activeFactory?.id) return;
    fetchProducts({ page: 1, page_size: 200 }, activeFactory.id)
      .then((data) => {
        const normalized = normalizeListResponse(data);
        setProducts(normalized.items || []);
      })
      .catch(() => setProducts([]));
  }, [activeFactory?.id]);

  const queryParams = useMemo(() => {
    const p = {};
    if (dateFrom) p.date_from = new Date(dateFrom).toISOString();
    if (dateTo) p.date_to = new Date(dateTo).toISOString();
    if (productId) p.product_id = productId;
    return p;
  }, [dateFrom, dateTo, productId]);

  async function loadStock(page = stockPagination.page, pageSize = stockPagination.page_size) {
    if (!activeFactory?.id) return;
    setLoading(true);
    setError(null);
    try {
      if (productId) {
        const [summaryData, listData] = await Promise.all([
          fetchStockSummary(queryParams, activeFactory.id),
          fetchStock({ ...queryParams, page, page_size: pageSize }, activeFactory.id),
        ]);
        setSummary(summaryData || null);
        const normalized = normalizeListResponse(listData);
        setStock(normalized.items || []);
        setStockPagination(normalized.pagination);
      } else {
        setSummary(null);
        const data = await fetchStock({ ...queryParams, page, page_size: pageSize }, activeFactory.id);
        const normalized = normalizeListResponse(data);
        setStock(normalized.items || []);
        setStockPagination(normalized.pagination);
      }
    } catch (e) {
      setError(e?.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }

  async function loadMovements(page = movementPagination.page, pageSize = movementPagination.page_size) {
    if (!activeFactory?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMovements({ ...queryParams, page, page_size: pageSize }, activeFactory.id);
      const normalized = normalizeListResponse(data);
      setMovements(normalized.items || []);
      setMovementPagination(normalized.pagination);
    } catch (e) {
      setError(e?.message || "Failed to load inventory movements");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!activeFactory?.id) return;
    if (tab === "stock") loadStock(1, stockPagination.page_size);
    else loadMovements(1, movementPagination.page_size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeFactory?.id, productId, dateFrom, dateTo]);

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(productId)) || summary?.product || null,
    [products, productId, summary]
  );

  const summaryTotals = summary?.totals || {};
  const stockRows = Array.isArray(stock) ? stock : [];

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
          <p className="text-gray-500">Use stock list for balances and product summary for detailed stock movement totals.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTab("stock")} className={`px-4 py-2 rounded-lg border transition-colors ${tab === "stock" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}>Stock</button>
          <button onClick={() => setTab("movements")} className={`px-4 py-2 rounded-lg border transition-colors ${tab === "movements" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}>Movements</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500">Product</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg bg-white">
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name || p.product_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Date From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Date To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setProductId("");
                setDateFrom("");
                setDateTo("");
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {!activeFactory ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6"><p className="text-yellow-800">Please select a factory to view inventory.</p></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6"><p className="text-red-700">{error}</p></div>
      ) : loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"><p className="text-gray-500">Loading...</p></div>
      ) : tab === "stock" ? (
        <div className="space-y-6">
          {productId && summary ? (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{selectedProduct?.name || "Selected Product"}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedProduct?.category?.name || "Uncategorized"}
                      {selectedProduct?.unit ? ` • Unit: ${selectedProduct.unit}` : ""}
                      {selectedProduct?.pack_size ? ` • Pack size: ${selectedProduct.pack_size}` : ""}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">Factory: {activeFactory?.name}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard label="Current Stock" value={summaryTotals.stock_qty} hint="Latest balance" />
                <MetricCard label="IN" value={summaryTotals.in_qty} hint="Received / produced" />
                <MetricCard label="OUT" value={summaryTotals.out_qty} hint="Dispatched / consumed" />
                <MetricCard label="Adjustment" value={summaryTotals.adjustment_qty} hint="Manual corrections" />
              </div>
            </>
          ) : null}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-800">Stock Balances</h3>
              <p className="text-sm text-gray-500">Select a product to view the new detailed stock summary totals.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stockRows.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No stock data</td></tr>
                  ) : stockRows.map((row, idx) => {
                    const product = row.product || {};
                    const totalStock = row.stock_qty ?? row.totals?.stock_qty ?? 0;
                    return (
                      <tr key={product.id || row.product_id || idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{product.name || row.name || row.product_name || "-"}</div>
                          {product.pack_size ? <div className="text-xs text-gray-500">Pack size: {product.pack_size}</div> : null}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{product.category?.name || row.category?.name || "-"}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{product.unit || row.unit || "-"}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">{formatQty(totalStock)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationControls pagination={stockPagination} currentCount={stockRows.length} itemLabel="stock rows" pageSizeOptions={[10, 20, 25, 50]} onPageChange={(page) => loadStock(page, stockPagination.page_size)} onPageSizeChange={(size) => loadStock(1, size)} />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b"><h3 className="font-semibold text-gray-800">Inventory Movements</h3><p className="text-sm text-gray-500">Audit trail of stock events</p></div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th></tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movements.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No movements</td></tr> : movements.map((m) => <tr key={m.id}><td className="px-6 py-4 text-sm text-gray-700">{(m.date || m.created_at) ? new Date(m.date || m.created_at).toLocaleString("en-IN") : "-"}</td><td className="px-6 py-4"><div className="text-sm font-medium text-gray-900">{m.product?.name || m.product_id || "-"}</div></td><td className="px-6 py-4 text-sm"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${m.type === "IN" ? "bg-green-100 text-green-800" : m.type === "OUT" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{m.type}</span></td><td className="px-6 py-4 text-sm text-gray-900">{formatQty(m.quantity)}</td><td className="px-6 py-4 text-sm text-gray-700">{m.source_type || "-"}</td></tr>)}
              </tbody>
            </table>
          </div>
          <PaginationControls pagination={movementPagination} currentCount={movements.length} itemLabel="movements" pageSizeOptions={[20, 50, 100]} onPageChange={(page) => loadMovements(page, movementPagination.page_size)} onPageSizeChange={(size) => loadMovements(1, size)} />
        </div>
      )}
    </div>
  );
}

export default requireAuth(requireFactory(InventoryPage));
