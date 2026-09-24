"use client";

import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "@/lib/requireAuth";
import { useAuth } from "@/lib/authContext";
import {
  createCampaign,
  createCampaignFromFilter,
  createPromotionalCampaign,
  dispatchCampaign,
  fetchCampaignStatus,
  fetchOutbox,
  deleteCampaign,
} from "@/lib/messageApi";
import { fetchClients } from "@/lib/clientApi";
import { fetchProducts } from "@/lib/productApi";
import { normalizeListResponse } from "@/lib/listResponse";
import PaginationControls from "@/components/PaginationControls";

function MessagesPage() {
  const auth = useAuth();
  const can = typeof auth?.can === "function" ? auth.can : () => true;
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [outbox, setOutbox] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 1 });
  const [statusLookupId, setStatusLookupId] = useState("");
  const [dispatchId, setDispatchId] = useState("");
  const [campaignStatus, setCampaignStatus] = useState(null);

  const [form, setForm] = useState({
    endpointType: "standard",
    purpose: "STANDARD",
    name: "",
    channel: "EMAIL",
    targetMode: "single",
    clientId: "",
    clientIdsText: "",
    productId: "",
    subject: "",
    body: "<p>Hello {{client_name}},</p><p>This is a campaign update.</p>",
    dispatch_now: true,
    async: false,
    inactive_days: 45,
    invoice_statuses: "",
    order_statuses: "",
  });

  const clientOptions = useMemo(() => (Array.isArray(clients) ? clients : []), [clients]);
  const productOptions = useMemo(() => (Array.isArray(products) ? products : []), [products]);

  function loadOutbox(page = pagination.page, pageSize = pagination.page_size) {
    setLoading(true);
    setError(null);
    fetchOutbox({
      status: statusFilter || undefined,
      channel: channelFilter || undefined,
      campaign_id: campaignFilter || undefined,
      page,
      page_size: pageSize,
    })
      .then((data) => {
        const normalized = normalizeListResponse(data);
        setOutbox(normalized.items || []);
        setPagination(normalized.pagination);
      })
      .catch((e) => setError(e?.message || "Failed to load outbox"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOutbox(1, pagination.page_size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, channelFilter, campaignFilter]);

  useEffect(() => {
    Promise.all([
      fetchClients({ page: 1, page_size: 200 }).catch(() => []),
      fetchProducts({ page: 1, page_size: 200 }).catch(() => []),
    ]).then(([clientData, productData]) => {
      setClients(normalizeListResponse(clientData).items || []);
      setProducts(normalizeListResponse(productData).items || []);
    });
  }, []);

  function parseCsvIds(text) {
    return String(text || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  function buildStandardPayload() {
    const base = {
      name: form.name.trim(),
      channel: form.channel,
      subject: form.subject.trim(),
      body: form.body,
      dispatch_now: !!form.dispatch_now,
      async: !!form.async,
    };

    if (form.purpose === "PROMOTIONAL") {
      const selection = {};
      if (form.targetMode === "all") selection.all = true;
      if (form.targetMode === "single" && form.clientId) selection.client_id = form.clientId;
      if (form.targetMode === "multiple") selection.client_ids = parseCsvIds(form.clientIdsText);
      if (form.targetMode === "product" && form.productId) selection.product_id = form.productId;
      return {
        name: base.name,
        channel: base.channel,
        subject: base.subject,
        body: base.body,
        dispatch_now: base.dispatch_now,
        async: base.async,
        selection,
      };
    }

    if (form.targetMode === "all") return { ...base, all: true };
    if (form.targetMode === "single") return { ...base, client_id: form.clientId || undefined };
    if (form.targetMode === "multiple") return { ...base, client_ids: parseCsvIds(form.clientIdsText) };
    if (form.targetMode === "product") return { ...base, product_id: form.productId || undefined };
    return base;
  }

  function buildFilterPayload() {
    const filter = {};
    if (form.inactive_days) filter.inactive_days = Number(form.inactive_days);
    const invoiceStatuses = parseCsvIds(form.invoice_statuses.toUpperCase());
    const orderStatuses = parseCsvIds(form.order_statuses.toUpperCase());
    if (invoiceStatuses.length) filter.invoice_statuses = invoiceStatuses;
    if (orderStatuses.length) filter.order_statuses = orderStatuses;

    return {
      name: form.name.trim(),
      channel: form.channel,
      subject: form.subject.trim(),
      body: form.body,
      dispatch_now: !!form.dispatch_now,
      async: !!form.async,
      filter,
    };
  }

  async function onCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setSuccess("");
    setCampaignStatus(null);
    try {
      let response;
      if (form.endpointType === "filter") {
        response = await createCampaignFromFilter(buildFilterPayload());
      } else if (form.purpose === "PROMOTIONAL") {
        response = await createPromotionalCampaign(buildStandardPayload());
      } else {
        response = await createCampaign(buildStandardPayload());
      }

      setSuccess(response?.campaign?.id ? `Campaign saved: ${response.campaign.id}` : "Campaign created successfully.");
      if (response?.campaign?.id) {
        setStatusLookupId(response.campaign.id);
        setDispatchId(response.campaign.id);
      }
      loadOutbox(1, pagination.page_size);
    } catch (e) {
      setError(e?.message || "Failed to create campaign");
    } finally {
      setCreating(false);
    }
  }

  async function onDispatch() {
    if (!dispatchId.trim()) return;
    setError(null);
    setSuccess("");
    try {
      const result = await dispatchCampaign(dispatchId.trim());
      setSuccess(`Dispatch completed. Sent: ${result?.sent_count ?? 0}, Failed: ${result?.failed_count ?? 0}`);
      await onFetchStatus(dispatchId.trim());
      loadOutbox(1, pagination.page_size);
    } catch (e) {
      setError(e?.message || "Failed to dispatch campaign");
    }
  }

  async function onFetchStatus(idFromArg) {
    const campaignId = (idFromArg || statusLookupId).trim();
    if (!campaignId) return;
    setError(null);
    setCampaignStatus(null);
    try {
      const data = await fetchCampaignStatus(campaignId);
      setCampaignStatus(data);
      setCampaignFilter(campaignId);
    } catch (e) {
      setError(e?.message || "Failed to fetch campaign status");
    }
  }


  async function onDeleteCampaign(idFromArg) {
    const campaignId = String(idFromArg || statusLookupId || dispatchId || "").trim();
    if (!campaignId) return;
    if (!confirm("Delete this campaign? This permanently removes the campaign, logs, recipients, and jobs if allowed.")) return;
    setError(null);
    setSuccess("");
    try {
      await deleteCampaign(campaignId);
      setCampaignStatus(null);
      if (statusLookupId === campaignId) setStatusLookupId("");
      if (dispatchId === campaignId) setDispatchId("");
      if (campaignFilter === campaignId) setCampaignFilter("");
      setSuccess("Campaign deleted successfully.");
      loadOutbox(1, pagination.page_size);
    } catch (e) {
      setError(e?.message || "Failed to delete campaign");
    }
  }

  const selectedClientCount = useMemo(() => {
    if (form.targetMode === "multiple") return parseCsvIds(form.clientIdsText).length;
    if (form.targetMode === "single" && form.clientId) return 1;
    return 0;
  }, [form.targetMode, form.clientIdsText, form.clientId]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
        <p className="text-gray-600">Campaigns now support single client, multiple clients, product audience, all clients, filtered audiences, immediate send, manual dispatch, and async queue dispatch.</p>
      </div>

      {error ? <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div> : null}
      {success ? <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700">{success}</div> : null}

      <form onSubmit={onCreate} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign endpoint</label>
            <select value={form.endpointType} onChange={(e) => setForm((p) => ({ ...p, endpointType: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white">
              <option value="standard">Standard campaign</option>
              <option value="filter">Filter campaign</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
            <select value={form.purpose} onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))} disabled={form.endpointType === "filter"} className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100">
              <option value="STANDARD">Standard</option>
              <option value="PROMOTIONAL">Promotional</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
            <select value={form.channel} onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white">
              <option value="EMAIL">EMAIL</option>
              <option value="WHATSAPP">WHATSAPP</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch mode</label>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.dispatch_now} onChange={(e) => setForm((p) => ({ ...p, dispatch_now: e.target.checked }))} /> Send now</label>
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.async} onChange={(e) => setForm((p) => ({ ...p, async: e.target.checked }))} /> Async</label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign name</label>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Campaign name" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Hello {{client_name}}" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
          </div>
        </div>

        {form.endpointType === "filter" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inactive days</label>
              <input type="number" min="1" value={form.inactive_days} onChange={(e) => setForm((p) => ({ ...p, inactive_days: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice statuses (comma separated)</label>
              <input value={form.invoice_statuses} onChange={(e) => setForm((p) => ({ ...p, invoice_statuses: e.target.value }))} placeholder="PENDING,PAID" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order statuses (comma separated)</label>
              <input value={form.order_statuses} onChange={(e) => setForm((p) => ({ ...p, order_statuses: e.target.value }))} placeholder="CONFIRMED,DISPATCHED" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                <select value={form.targetMode} onChange={(e) => setForm((p) => ({ ...p, targetMode: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white">
                  <option value="single">Single client</option>
                  <option value="multiple">Multiple clients</option>
                  <option value="product">Product audience</option>
                  <option value="all">All clients</option>
                </select>
              </div>
              {form.targetMode === "single" ? (
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <select value={form.clientId} onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white">
                    <option value="">Select client</option>
                    {clientOptions.map((client) => <option key={client.id} value={client.id}>{client.company_name || client.name}</option>)}
                  </select>
                </div>
              ) : null}
              {form.targetMode === "multiple" ? (
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client IDs (comma separated)</label>
                  <input value={form.clientIdsText} onChange={(e) => setForm((p) => ({ ...p, clientIdsText: e.target.value }))} placeholder="client_id_1, client_id_2" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                  <p className="mt-1 text-xs text-gray-500">Selected IDs: {selectedClientCount}</p>
                </div>
              ) : null}
              {form.targetMode === "product" ? (
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                  <select value={form.productId} onChange={(e) => setForm((p) => ({ ...p, productId: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white">
                    <option value="">Select product</option>
                    {productOptions.map((product) => <option key={product.id} value={product.id}>{product.name || product.product_name}</option>)}
                  </select>
                </div>
              ) : null}
              {form.targetMode === "all" ? (
                <div className="md:col-span-3 flex items-end text-sm text-gray-600">All active clients with deliverable details will be targeted.</div>
              ) : null}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
          <textarea value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} rows={8} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
          <p className="mt-2 text-xs text-gray-500">Supported placeholder: <code>{"{{client_name}}"}</code></p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={creating || !form.name.trim()} className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {creating ? "Saving..." : form.dispatch_now ? "Create Campaign" : "Create Without Sending"}
          </button>
          <button type="button" onClick={() => setForm((p) => ({ ...p, name: "", subject: "", body: "<p>Hello {{client_name}},</p><p>This is a campaign update.</p>" }))} className="px-5 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
            Clear Content
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Campaign actions</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign ID for status</label>
            <div className="flex gap-3">
              <input value={statusLookupId} onChange={(e) => setStatusLookupId(e.target.value)} placeholder="Campaign ID" className="flex-1 px-4 py-3 border border-gray-300 rounded-lg" />
              <button onClick={() => onFetchStatus()} className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Check Status</button>
              {can("messages.campaigns.delete") ? <button onClick={() => onDeleteCampaign(statusLookupId)} className="px-4 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50">Delete</button> : null}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign ID for manual dispatch</label>
            <div className="flex gap-3">
              <input value={dispatchId} onChange={(e) => setDispatchId(e.target.value)} placeholder="Campaign ID" className="flex-1 px-4 py-3 border border-gray-300 rounded-lg" />
              <button onClick={onDispatch} className="px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Dispatch</button>
            </div>
          </div>

          {campaignStatus ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 space-y-2">
              <div><span className="font-medium text-gray-900">Campaign:</span> {campaignStatus.campaign?.name || campaignStatus.campaign?.id}</div>
              <div><span className="font-medium text-gray-900">Recipients:</span> {campaignStatus.recipients_count ?? 0}</div>
              <div><span className="font-medium text-gray-900">Latest job:</span> {campaignStatus.latest_job?.status || "—"}</div>
              {can("messages.campaigns.delete") ? (
                <div>
                  <button onClick={() => onDeleteCampaign(campaignStatus.campaign?.id)} className="mt-1 px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50">
                    Delete Campaign
                  </button>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                {(campaignStatus.counts || []).map((entry) => (
                  <span key={entry.status} className="inline-flex px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-700">
                    {entry.status}: {entry?._count?.status ?? 0}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Outbox filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} className="px-4 py-3 border border-gray-300 rounded-lg bg-white">
              <option value="">All channels</option>
              <option value="EMAIL">EMAIL</option>
              <option value="WHATSAPP">WHATSAPP</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 border border-gray-300 rounded-lg bg-white">
              <option value="">All statuses</option>
              {['QUEUED', 'SENT', 'DELIVERED', 'FAILED'].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <button onClick={() => { setChannelFilter(""); setStatusFilter(""); setCampaignFilter(""); }} className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">Clear</button>
          </div>
          <input value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} placeholder="Filter outbox by campaign id" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">Outbox</h3>
            <p className="text-sm text-gray-500">Recent sent, queued, or failed campaign delivery logs</p>
          </div>
          <button onClick={() => loadOutbox(pagination.page, pagination.page_size)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Refresh</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">To</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Channel</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Campaign</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">Loading outbox...</td></tr>
              ) : outbox.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">No outbox logs found.</td></tr>
              ) : outbox.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-700">{row.created_at ? new Date(row.created_at).toLocaleString("en-IN") : "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{row.to || row.payload?.client_email || row.payload?.client_phone || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{row.channel || "-"}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${row.status === "SENT" || row.status === "DELIVERED" ? "bg-green-100 text-green-800" : row.status === "FAILED" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {row.status || "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{row.campaign_id || row.messageCampaignId || "-"}</td>
                  <td className="px-6 py-4 text-sm text-red-600">{row.error || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls pagination={pagination} currentCount={outbox.length} itemLabel="outbox logs" pageSizeOptions={[10, 20, 50, 100]} onPageChange={(page) => loadOutbox(page, pagination.page_size)} onPageSizeChange={(size) => loadOutbox(1, size)} />
      </div>
    </div>
  );
}

export default requireAuth(MessagesPage);
