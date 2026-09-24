"use client";

import { useEffect, useState } from "react";
import { requireAuth } from "@/lib/requireAuth";
import { useAuth } from "@/lib/authContext";
import { fetchFactories, createFactory, updateFactory, deleteFactory } from "@/lib/factoryApi";

function FactoriesPage() {
  const { can } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const empty = { name: "", address: "", phone: "" };
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchFactories();
      const list = Array.isArray(data) ? data : data?.rows || [];
      setRows(list);
    } catch (e) {
      setError(e?.message || "Failed to load factories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function onSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address?.trim() || null,
        phone: null,
      };

      if (editingId) {
        await updateFactory(editingId, payload);
      } else {
        await createFactory(payload);
      }

      setEditingId(null);
      setForm(empty);
      await reload();
    } catch (e) {
      setError(e?.message || "Failed to save factory");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    if (!can("factories.delete")) return;
    if (!confirm("Delete this factory? This performs a soft delete.")) return;
    setSaving(true);
    setError("");
    try {
      await deleteFactory(id);
      if (editingId === id) {
        setEditingId(null);
        setForm(empty);
      }
      await reload();
    } catch (e) {
      setError(e?.message || "Failed to delete factory");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading factories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Factories</h1>
        <p className="text-gray-600">Manage factories (admin-only create/update/delete)</p>
      </div>

      {error ? <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div> : null}

      {(can("factories.create") || can("factories.update")) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">{editingId ? "Edit Factory" : "Create Factory"}</h2>
            {editingId && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setForm(empty);
                }}
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Factory name *" className="px-4 py-3 border border-gray-300 rounded-lg" />
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className="px-4 py-3 border border-gray-300 rounded-lg" />
          </div>

          <button
            onClick={onSubmit}
            disabled={saving || !form.name.trim() || (editingId ? !can("factories.update") : !can("factories.create"))}
            className="mt-4 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Save Changes" : "Create"}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Address</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{f.name}</td>
                  <td className="px-6 py-4 text-gray-600">{f.address || "-"}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {can("factories.update") && (
                        <button
                          onClick={() => {
                            setEditingId(f.id);
                            setForm({ name: f.name || "", address: f.address || "", phone: f.phone || "" });
                          }}
                          className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
                        >
                          Edit
                        </button>
                      )}
                      {can("factories.delete") && (
                        <button
                          onClick={() => onDelete(f.id)}
                          disabled={saving}
                          className="px-3 py-1 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-60"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-gray-500">
                    No factories found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default requireAuth(FactoriesPage);
