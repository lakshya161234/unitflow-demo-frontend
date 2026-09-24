"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { requireAuth } from "@/lib/requireAuth";
import { requireFactory } from "@/lib/requireFactory";
import { useFactory } from "@/lib/factoryContext";
import { useAuth } from "@/lib/authContext";
import { fetchPurchaseById, fetchPurchasePdf, setPurchaseStatus, deletePurchase } from "@/lib/purchaseApi";

function PurchaseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { activeFactory } = useFactory();
  const auth = useAuth();
  const can = typeof auth?.can === "function" ? auth.can : () => true;

  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id || !activeFactory?.id) return;
    setLoading(true);
    fetchPurchaseById(id, activeFactory.id)
      .then(setPurchase)
      .finally(() => setLoading(false));
  }, [id, activeFactory?.id]);

  async function downloadPdf(refresh = false) {
    if (!activeFactory?.id) return;
    setDownloading(true);
    try {
      const blob = await fetchPurchasePdf(id, activeFactory.id, refresh);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${purchase?.purchase_no || "purchase"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e?.message || "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  }


  async function handleDelete() {
    if (!activeFactory?.id || !can("purchases.delete")) return;
    if (!confirm("Delete this purchase? This performs a soft delete.")) return;
    setDeleting(true);
    try {
      await deletePurchase(id, activeFactory.id);
      router.push("/purchases");
    } catch (e) {
      alert(e?.message || "Failed to delete purchase");
    } finally {
      setDeleting(false);
    }
  }

  async function changeStatus(nextStatus) {
    if (!activeFactory?.id) return;
    const note = window.prompt("Status note (optional):") || "";
    setUpdating(true);
    try {
      const updated = await setPurchaseStatus(id, { status: nextStatus, note }, activeFactory.id);
      setPurchase(updated);
    } catch (e) {
      alert(e?.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-gray-700">Purchase not found.</p>
          <button onClick={() => router.push("/purchases")} className="mt-4 text-blue-700 hover:underline">
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{purchase.purchase_no || `Purchase #${purchase.id}`}</h1>
          <p className="text-gray-500">Vendor: {purchase.vendor_name || "-"}</p>
          <p className="text-sm text-gray-500">Status: {purchase.status || "-"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => downloadPdf(false)}
            disabled={downloading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {downloading ? "Downloading..." : "Download PDF"}
          </button>
          <button
            onClick={() => downloadPdf(true)}
            disabled={downloading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Refresh PDF
          </button>
          <button
            onClick={() => changeStatus("APPROVED")}
            disabled={updating}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => changeStatus("CANCELLED")}
            disabled={updating}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || !can("purchases.delete")}
            className="px-4 py-2 border border-red-300 text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Line Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(purchase.items || []).map((it) => (
                    <tr key={it.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{it.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{it.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{it.unit_price}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{it.line_total ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{purchase.subtotal ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Charges</span>
                <span className="font-medium">{purchase.total_charges ?? 0}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="text-gray-800 font-semibold">Total</span>
                <span className="text-gray-900 font-semibold">{purchase.total ?? 0}</span>
              </div>
            </div>
          </div>

          {purchase.notes && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-2">Notes</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{purchase.notes}</p>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
            <h3 className="font-semibold text-red-700 mb-3">Danger Zone</h3>
            <button
              onClick={handleDelete}
              disabled={deleting || !can("purchases.delete")}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete Purchase"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default requireAuth(requireFactory(PurchaseDetailPage));
