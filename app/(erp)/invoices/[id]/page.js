

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/requireAuth";
import { requireFactory } from "@/lib/requireFactory";
import { useAuth } from "@/lib/authContext";
import { useFactory } from "@/lib/factoryContext";
import { fetchInvoiceById, fetchInvoicePdf, sendInvoiceReminder, deleteInvoice } from "@/lib/invoiceApi";

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function toNumberSafe(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fillTpl(text, vars) {
  let out = String(text || "");
  Object.entries(vars || {}).forEach(([k, v]) => {
    out = out.replaceAll(`{{${k}}}`, String(v ?? ""));
  });
  return out;
}

function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { activeFactory } = useFactory();
  const auth = useAuth();
  const can = typeof auth?.can === "function" ? auth.can : () => true;

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reminder UI
  const [showRemind, setShowRemind] = useState(false);
  const [remindChannel, setRemindChannel] = useState("EMAIL");
  const [includePdf, setIncludePdf] = useState(true);
  const [remindPreset, setRemindPreset] = useState("PAYMENT_REMINDER");
  const [remindMessage, setRemindMessage] = useState("");
  const [sendingRemind, setSendingRemind] = useState(false);

  // recipient selection
  const [selectedEmail, setSelectedEmail] = useState("");
  const [manualEmail, setManualEmail] = useState("");

  const presetTemplates = useMemo(
    () => ({
      PAYMENT_REMINDER:
        "Reminder: please clear the pending invoice {{invoice_no}} of {{amount_due}}.\n\nThanks,\nUnitFlow ERP",
      OVERDUE:
        "Your invoice {{invoice_no}} is overdue by {{days_overdue}} day(s). Please arrange payment of {{amount_due}} at the earliest.\n\nThanks,\nUnitFlow ERP",
      FOLLOW_UP:
        "Following up on invoice {{invoice_no}} for {{amount_due}}. Kindly confirm expected payment date.\n\nThanks,\nUnitFlow ERP",
      SOFT_NUDGE:
        "Hi {{client_name}}, just a quick nudge for invoice {{invoice_no}} ({{amount_due}}). Let us know if you need any help.\n\nThanks,\nUnitFlow ERP",
    }),
    []
  );

  useEffect(() => {
    if (!activeFactory?.id || !id) return;
    setLoading(true);
    setError("");
    fetchInvoiceById(id, activeFactory.id)
      .then((data) => setInvoice(data))
      .catch((e) => setError(e?.message || "Failed to load invoice"))
      .finally(() => setLoading(false));
  }, [id, activeFactory]);

  const vars = useMemo(() => {
    const invNo = invoice?.invoice_no || invoice?.id || "";
    const total = toNumberSafe(invoice?.total);
    const amount_due = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(total);

    const dueDate = invoice?.due_date ? new Date(invoice.due_date) : null;
    const today = new Date();
    const days_overdue =
      dueDate && dueDate < today && invoice?.status !== "PAID"
        ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))
        : 0;

    return {
      invoice_no: invNo,
      amount_due,
      client_name: invoice?.client?.company_name || "",
      days_overdue,
      today: today.toISOString().slice(0, 10),
    };
  }, [invoice]);

  // build recipient list from invoice payload
  const recipientOptions = useMemo(() => {
    const opts = [];

    // primary client email
    if (invoice?.client?.email) {
      opts.push({
        key: `client:${invoice.client.email}`,
        label: `${invoice.client.company_name || "Client"} — ${invoice.client.email}`,
        email: invoice.client.email,
      });
    }

    // if backend includes contacts (some builds do)
    const contacts = invoice?.client?.contacts || invoice?.contacts || [];
    if (Array.isArray(contacts)) {
      contacts.forEach((c) => {
        if (!c?.email) return;
        opts.push({
          key: `contact:${c.id}:${c.email}`,
          label: `${c.name || "Contact"} — ${c.email}`,
          email: c.email,
        });
      });
    }

    // de-dupe by email
    const seen = new Set();
    return opts.filter((o) => {
      if (seen.has(o.email)) return false;
      seen.add(o.email);
      return true;
    });
  }, [invoice]);

  useEffect(() => {
    // initialize message based on preset
    const tpl = presetTemplates[remindPreset] || presetTemplates.PAYMENT_REMINDER;
    setRemindMessage(fillTpl(tpl, vars));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remindPreset, invoice]);

  useEffect(() => {
    // default recipient selection
    if (!recipientOptions.length) {
      setSelectedEmail("");
      return;
    }
    if (!selectedEmail) setSelectedEmail(recipientOptions[0].email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientOptions]);

  async function handleDownloadPdf(refresh = false) {
    if (!activeFactory?.id) return;
    if (!can("invoices.pdf.view")) return;

    setDownloadingPdf(true);
    setError("");
    try {
      const blob = await fetchInvoicePdf(id, activeFactory.id, refresh);
      const name = invoice?.invoice_no ? `invoice-${invoice.invoice_no}.pdf` : `invoice-${id}.pdf`;
      downloadBlob(blob, name);
    } catch (e) {
      setError(e?.message || "Failed to download PDF");
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleSendReminder() {
    if (!activeFactory?.id) return;
    if (!can("invoices.remind")) return;

    const to = (selectedEmail || "").trim() || (manualEmail || "").trim();
    if (!to) {
      setError("Please select or enter a recipient email.");
      return;
    }

    setSendingRemind(true);
    setError("");
    try {
      // backend doc expects: { channel, message, include_pdf }
      // we also send `to` (safe if backend ignores)
      await sendInvoiceReminder(
        id,
        {
          channel: remindChannel,
          message: remindMessage,
          include_pdf: includePdf,
          to,
        },
        activeFactory.id
      );
      setShowRemind(false);
      alert("Reminder request sent (provider keys required for actual email).");
    } catch (e) {
      setError(e?.message || "Failed to send reminder");
    } finally {
      setSendingRemind(false);
    }
  }


  async function handleDeleteInvoice() {
    if (!activeFactory?.id) return;
    if (!can("invoices.delete")) return;
    if (!confirm("Delete this invoice? It will be marked VOID and inactive if allowed.")) return;

    setDeleting(true);
    setError("");
    try {
      await deleteInvoice(id, activeFactory.id);
      router.push("/invoices");
    } catch (e) {
      setError(e?.message || "Failed to delete invoice");
    } finally {
      setDeleting(false);
    }
  }

  const formatDate = (d) => {
    if (!d) return "-";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatMoney = (amt) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
      toNumberSafe(amt)
    );

  const statusBadge = (status) => {
    const s = (status || "").toString();
    const cls =
      s === "PAID"
        ? "bg-green-100 text-green-800"
        : s === "PARTIALLY_PAID"
        ? "bg-yellow-100 text-yellow-800"
        : s === "OVERDUE"
        ? "bg-red-100 text-red-800"
        : s === "SENT"
        ? "bg-blue-100 text-blue-800"
        : s === "VOID"
        ? "bg-red-100 text-red-800"
        : "bg-gray-100 text-gray-800";
    const label = s.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) || "Unknown";
    return <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${cls}`}>{label}</span>;
  };

  if (!activeFactory) return <div className="p-6 text-gray-600">Select a factory to view invoices.</div>;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Invoice Not Found</h2>
        <p className="text-gray-500 mb-6">{error || "The requested invoice could not be found."}</p>
        <button onClick={() => router.push("/invoices")} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Back to Invoices
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              ₹
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Invoice <span className="text-blue-700">{invoice.invoice_no || invoice.id}</span>
              </h1>
              <p className="text-gray-500 mt-1">
                Client:{" "}
                <Link href={`/clients/${invoice.client?.id || ""}`} className="font-medium text-blue-700 hover:underline">
                  {invoice.client?.company_name || "-"}
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleDownloadPdf(false)}
            disabled={downloadingPdf || !can("invoices.pdf.view")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {downloadingPdf ? "Downloading..." : "Download PDF"}
          </button>
          <button
            onClick={() => handleDownloadPdf(true)}
            disabled={downloadingPdf || !can("invoices.pdf.view")}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            title="Refresh cached PDF"
          >
            Refresh PDF
          </button>
          <button
            onClick={() => setShowRemind((v) => !v)}
            disabled={!can("invoices.remind")}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Reminder
          </button>
          <button
            onClick={handleDeleteInvoice}
            disabled={deleting || !can("invoices.delete")}
            className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Invoice Details</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                {statusBadge(invoice.status)}
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Issue Date</p>
                <p className="font-medium text-gray-800">{formatDate(invoice.issue_date || invoice.created_at)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Due Date</p>
                <p className="font-medium text-gray-800">{formatDate(invoice.due_date)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Total</p>
                <p className="font-medium text-gray-800">{formatMoney(invoice.total)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Subtotal</p>
                <p className="font-medium text-gray-800">{formatMoney(invoice.subtotal)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Charges</p>
                <p className="font-medium text-gray-800">{formatMoney(invoice.total_charges)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Kind</p>
                <p className="font-medium text-gray-800">{invoice.kind || "-"}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="font-medium text-gray-800">{invoice.notes || "-"}</p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Items</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Qty</th>
                    <th className="py-3 px-4">Unit Price</th>
                    <th className="py-3 px-4">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(invoice.items || []).map((it) => (
                    <tr key={it.id}>
                      <td className="py-3 px-4 font-medium text-gray-900">{it.product?.name || it.product_id}</td>
                      <td className="py-3 px-4 text-gray-600">{toNumberSafe(it.quantity)}</td>
                      <td className="py-3 px-4 text-gray-600">{formatMoney(it.unit_price)}</td>
                      <td className="py-3 px-4 text-gray-600">{formatMoney(it.line_total)}</td>
                    </tr>
                  ))}
                  {(invoice.items || []).length === 0 && (
                    <tr>
                      <td className="py-6 px-4 text-gray-500" colSpan={4}>
                        No items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charges */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Charges</h2>
            {(invoice.charges || []).length ? (
              <div className="space-y-2">
                {invoice.charges.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{c.title}</div>
                      <div className="text-xs text-gray-500">{c.type}</div>
                    </div>
                    <div className="font-medium text-gray-900">{formatMoney(c.amount)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-600">No charges.</div>
            )}
          </div>

          {/* Status history */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Status History</h2>
            {(invoice.status_history || []).length ? (
              <div className="space-y-3">
                {invoice.status_history
                  .slice()
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .map((h) => (
                    <div key={h.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{h.status}</div>
                        <div className="text-sm text-gray-600">{h.note || "—"}</div>
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(h.created_at)}</div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-gray-600">No history.</div>
            )}
          </div>
        </div>

        {/* Reminder panel */}
        <div className="space-y-6">
          {showRemind && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Send Reminder</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Situation</label>
                  <select
                    value={remindPreset}
                    onChange={(e) => setRemindPreset(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="PAYMENT_REMINDER">Payment reminder</option>
                    <option value="OVERDUE">Overdue</option>
                    <option value="FOLLOW_UP">Follow up</option>
                    <option value="SOFT_NUDGE">Soft nudge</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
                  {recipientOptions.length ? (
                    <select
                      value={selectedEmail}
                      onChange={(e) => setSelectedEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      {recipientOptions.map((o) => (
                        <option key={o.key} value={o.email}>
                          {o.label}
                        </option>
                      ))}
                      <option value="">Other (enter manually)</option>
                    </select>
                  ) : (
                    <div className="text-sm text-gray-500">No recipient emails found on client. Enter manually below.</div>
                  )}

                  {/* manual email */}
                  {(selectedEmail === "" || !recipientOptions.length) && (
                    <input
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="email@example.com"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
                    <select
                      value={remindChannel}
                      onChange={(e) => setRemindChannel(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="EMAIL">Email</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-7">
                    <input type="checkbox" checked={includePdf} onChange={(e) => setIncludePdf(e.target.checked)} />
                    <span className="text-sm text-gray-700">Include PDF</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={remindMessage}
                    onChange={(e) => setRemindMessage(e.target.value)}
                    rows={7}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Placeholders: {"{{client_name}}"}, {"{{invoice_no}}"}, {"{{amount_due}}"}, {"{{days_overdue}}"}, {"{{today}}"}
                  </p>
                </div>

                <button
                  onClick={handleSendReminder}
                  disabled={sendingRemind || !can("invoices.remind")}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {sendingRemind ? "Sending..." : "Send Reminder"}
                </button>
                <p className="text-xs text-gray-500">Sending requires email provider configuration on backend.</p>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl shadow-lg p-6 text-white">
            <h3 className="font-semibold mb-4">Quick Summary</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-blue-200 mb-1">Status</p>
                <p className="text-xl font-bold">{(invoice.status || "-").replaceAll("_", " ")}</p>
              </div>
              <div>
                <p className="text-sm text-blue-200 mb-1">Total</p>
                <p className="text-xl font-bold">{formatMoney(invoice.total)}</p>
              </div>
              <div>
                <p className="text-sm text-blue-200 mb-1">Issue Date</p>
                <p className="text-xl font-bold">{formatDate(invoice.issue_date)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
            <h3 className="font-semibold text-red-700 mb-4">Danger Zone</h3>
            <button
              onClick={handleDeleteInvoice}
              disabled={deleting || !can("invoices.delete")}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {deleting ? "Deleting..." : "Delete Invoice"}
            </button>
          </div>

          {/* Link back */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <button
              onClick={() => router.push("/invoices")}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Invoices
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default requireAuth(requireFactory(InvoiceDetailPage));
