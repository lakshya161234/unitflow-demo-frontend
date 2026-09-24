"use client";

import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "@/lib/requireAuth";
import { useAuth } from "@/lib/authContext";
import { fetchAnnouncements, createAnnouncement, markAnnouncementSeen, deleteAnnouncement } from "@/lib/announcementApi";
import { fetchRoles, fetchUsers } from "@/lib/adminApi";
import { normalizeListResponse } from "@/lib/listResponse";
import PaginationControls from "@/components/PaginationControls";

function fmtTs(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function normalizeAnnouncementRow(r) {
  if (r?.broadcast) {
    return {
      id: r.broadcast_id || r.broadcast?.id,
      body: r.broadcast?.body || "",
      target_type: r.broadcast?.target_type || r.broadcast?.targetType || "",
      created_at: r.broadcast?.created_at || r.created_at || r.createdAt || "",
      sender_name: r.broadcast?.sender?.name || r.broadcast?.sender_name || r.created_by_name || r.created_by || "",
      seen: Boolean(r.seen_at),
      seen_at: r.seen_at || null,
      _raw: r,
    };
  }

  return {
    id: r?.id,
    body: r?.body || r?.content || "",
    target_type: r?.target_type || r?.targetType || "",
    created_at: r?.created_at || r?.createdAt || "",
    sender_name: r?.sender?.name || r?.created_by_name || r?.created_by || "",
    seen: Boolean(r?.seen || r?.seen_at),
    seen_at: r?.seen_at || null,
    _raw: r,
  };
}

function AnnouncementsPage() {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.is_admin);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 1 });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetAll, setTargetAll] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  async function load(page = pagination.page, pageSize = pagination.page_size) {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAnnouncements({ page, page_size: pageSize }, { preferAdmin: isAdmin });
      const normalized = normalizeListResponse(data);
      setRows((normalized.items || []).map(normalizeAnnouncementRow));
      setPagination(normalized.pagination);
    } catch (e) {
      setError(e?.message || "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(1, pagination.page_size); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchRoles().then((r) => setRoles(Array.isArray(r) ? r : r?.rows || r?.items || [])).catch(() => setRoles([]));
    fetchUsers({ page: 1, page_size: 200 }).then((u) => {
      const normalized = normalizeListResponse(u);
      setUsers(normalized.items || []);
    }).catch(() => setUsers([]));
  }, [isAdmin]);

  async function onSend() {
    if (!isAdmin) return;
    if (!title.trim() || !content.trim()) {
      setError("Title and message are required.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const targets = targetAll ? { all: true } : { roles: selectedRoles, user_ids: selectedUsers };
      await createAnnouncement({ title: title.trim(), content: content.trim(), targets });
      setTitle("");
      setContent("");
      setSelectedRoles([]);
      setSelectedUsers([]);
      setTargetAll(true);
      await load(1, pagination.page_size);
    } catch (e) {
      setError(e?.message || "Failed to send announcement");
    } finally {
      setSending(false);
    }
  }

  async function onSeen(id) {
    try {
      await markAnnouncementSeen(id);
      setRows((prev) => prev.map((r) => String(r.id) === String(id) ? { ...r, seen: true, seen_at: new Date().toISOString() } : r));
    } catch (e) {
      setError(e?.message || "Failed to mark announcement as seen");
    }
  }


  async function onDelete(id) {
    if (!isAdmin) return;
    if (!confirm("Delete this broadcast?")) return;
    try {
      await deleteAnnouncement(id);
      setRows((prev) => prev.filter((r) => String(r.id) !== String(id)));
    } catch (e) {
      setError(e?.message || "Failed to delete announcement");
    }
  }

  const visibleRows = useMemo(() => rows, [rows]);

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-800">Announcements</h1><p className="text-gray-600">Broadcasts and recent notices</p></div>
      {error ? <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div> : null}

      {isAdmin ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Create Announcement</h2>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Message" rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={targetAll} onChange={(e) => setTargetAll(e.target.checked)} /> Send to all</label>
          {!targetAll ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-600 mb-2">Roles</label><select multiple value={selectedRoles} onChange={(e) => setSelectedRoles(Array.from(e.target.selectedOptions).map((o) => o.value))} className="w-full min-h-[140px] px-3 py-2 border border-gray-300 rounded-lg bg-white">{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div>
              <div><label className="block text-sm text-gray-600 mb-2">Users</label><select multiple value={selectedUsers} onChange={(e) => setSelectedUsers(Array.from(e.target.selectedOptions).map((o) => o.value))} className="w-full min-h-[140px] px-3 py-2 border border-gray-300 rounded-lg bg-white">{users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}</select></div>
            </div>
          ) : null}
          <button onClick={onSend} disabled={sending || !title.trim() || !content.trim()} className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-60">{sending ? "Sending..." : "Send Announcement"}</button>
        </div>
      ) : null}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? <div className="p-6"><p className="text-gray-500">Loading announcements...</p></div> : (
          <>
            <div className="divide-y divide-gray-200">
              {visibleRows.length === 0 ? <div className="p-6 text-gray-500">No announcements found.</div> : visibleRows.map((r) => (
                <div key={r.id} className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <div className="text-sm text-gray-500">{fmtTs(r.created_at)}{r.sender_name ? ` · ${r.sender_name}` : ""}</div>
                      <div className="mt-2 text-gray-900 whitespace-pre-wrap">{r.body || "-"}</div>
                      <div className="mt-2 text-xs text-gray-500">Target: {r.target_type || "ALL"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.seen ? <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Seen</span> : <button onClick={() => onSeen(r.id)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Mark seen</button>}
                      {isAdmin ? <button onClick={() => onDelete(r.id)} className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50">Delete</button> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <PaginationControls pagination={pagination} currentCount={rows.length} itemLabel="announcements" pageSizeOptions={[10, 20, 25, 50]} onPageChange={(page) => load(page, pagination.page_size)} onPageSizeChange={(size) => load(1, size)} />
          </>
        )}
      </div>
    </div>
  );
}

export default requireAuth(AnnouncementsPage);
