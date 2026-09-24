"use client";

import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "@/lib/requireAuth";
import { useAuth } from "@/lib/authContext";
import { fetchCategories, createCategory, updateCategory, deleteCategory } from "@/lib/categoryApi";

function CategoriesPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchCategories();
      const list = Array.isArray(data) ? data : data?.rows || [];
      setRows(list);
    } catch (e) {
      setError(e?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => (r?.name || "").toLowerCase().includes(s));
  }, [rows, q]);

  async function onCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await createCategory({ name: newName.trim() });
      setNewName("");
      await reload();
    } catch (e) {
      setError(e?.message || "Failed to create category");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveEdit(id) {
    if (!editName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await updateCategory(id, { name: editName.trim() });
      setEditingId(null);
      setEditName("");
      await reload();
    } catch (e) {
      setError(e?.message || "Failed to update category");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete this category?")) return;
    setSaving(true);
    setError("");
    try {
      await deleteCategory(id);
      await reload();
    } catch (e) {
      setError(e?.message || "Failed to delete category");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Categories</h1>
          <p className="text-gray-600">Company-level product categories</p>
        </div>
      </div>

      {error ? <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div> : null}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search categories..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            />
          </div>

          {can("categories.create") && (
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New category name"
                className="px-4 py-3 border border-gray-300 rounded-lg w-64"
              />
              <button
                onClick={onCreate}
                disabled={saving || !newName.trim()}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Add"}
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {editingId === r.id ? (
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg w-full" />
                    ) : (
                      <div className="font-medium text-gray-900">{r.name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {r.is_active === false ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Inactive</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {editingId === r.id ? (
                        <>
                          <button
                            onClick={() => onSaveEdit(r.id)}
                            disabled={saving || !editName.trim()}
                            className="px-3 py-1 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditName("");
                            }}
                            className="px-3 py-1 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          {can("categories.update") && (
                            <button
                              onClick={() => {
                                setEditingId(r.id);
                                setEditName(r.name || "");
                              }}
                              className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
                            >
                              Edit
                            </button>
                          )}
                          {can("categories.delete") && (
                            <button
                              onClick={() => onDelete(r.id)}
                              disabled={saving}
                              className="px-3 py-1 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-60"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-gray-500">
                    No categories found.
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

export default requireAuth(CategoriesPage);
