"use client";

import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "@/lib/requireAuth";
import { requireAdmin } from "@/lib/requireAdmin";
import { useAuth } from "@/lib/authContext";
import { fetchPermissions } from "@/lib/permissionApi";
import { fetchRoles, createRole, attachPermissionsToRole, deleteRole } from "@/lib/adminApi";

function RolesPage() {
  const { can } = useAuth();

  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [newRoleName, setNewRoleName] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [permQuery, setPermQuery] = useState("");
  const [selectedKeys, setSelectedKeys] = useState([]);

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const [r, p] = await Promise.all([fetchRoles(), fetchPermissions()]);
      setRoles(Array.isArray(r) ? r : r?.rows || []);
      setPerms(Array.isArray(p) ? p : p?.rows || []);
    } catch (e) {
      setError(e?.message || "Failed to load roles/permissions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const selectedRole = useMemo(() => roles.find((r) => r.id === selectedRoleId) || null, [roles, selectedRoleId]);

  const filteredPerms = useMemo(() => {
    const q = permQuery.trim().toLowerCase();
    if (!q) return perms;
    return perms.filter((p) => {
      const key = (p.key || "").toLowerCase();
      const name = (p.name || p.label || "").toLowerCase();
      return key.includes(q) || name.includes(q);
    });
  }, [perms, permQuery]);

  async function onCreateRole() {
    if (!newRoleName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const created = await createRole({ name: newRoleName.trim() });
      setNewRoleName("");
      await reload();
      if (created?.id) setSelectedRoleId(created.id);
    } catch (e) {
      setError(e?.message || "Failed to create role");
    } finally {
      setSaving(false);
    }
  }

  async function onAttach() {
    if (!selectedRoleId || selectedKeys.length === 0) return;
    setSaving(true);
    setError("");
    try {
      await attachPermissionsToRole(selectedRoleId, selectedKeys);
      setSelectedKeys([]);
      await reload();
    } catch (e) {
      setError(e?.message || "Failed to attach permissions");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteRole(roleId) {
    if (!can("admin.access")) return;
    if (!confirm("Delete this role? This performs a soft delete.")) return;
    setSaving(true);
    setError("");
    try {
      await deleteRole(roleId);
      if (selectedRoleId === roleId) {
        setSelectedRoleId("");
        setSelectedKeys([]);
      }
      await reload();
    } catch (e) {
      setError(e?.message || "Failed to delete role");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Admin · Roles</h1>
        <p className="text-gray-600">Create roles, delete roles, and attach permissions</p>
      </div>

      {error ? <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div> : null}

      {can("admin.access") && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Roles</h2>

            <div className="flex gap-2 mb-4">
              <input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="New role name"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg"
              />
              <button
                onClick={onCreateRole}
                disabled={saving || !newRoleName.trim()}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Create"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Permissions</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {roles.map((r) => (
                    <tr
                      key={r.id}
                      className={`cursor-pointer hover:bg-gray-50 ${selectedRoleId === r.id ? "bg-blue-50" : ""}`}
                      onClick={() => setSelectedRoleId(r.id)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                      <td className="px-4 py-3 text-gray-600">{Array.isArray(r.permissions) ? r.permissions.length : 0}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRole(r.id);
                          }}
                          disabled={saving}
                          className="px-3 py-1 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {roles.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                        No roles.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Permissions</h2>
            <p className="text-sm text-gray-500 mb-4">Select a role on the left, then attach permissions.</p>

            <div className="flex gap-2 mb-4">
              <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)} className="px-4 py-3 border border-gray-300 rounded-lg">
                <option value="">Select role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <input
                value={permQuery}
                onChange={(e) => setPermQuery(e.target.value)}
                placeholder="Search permissions..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg"
              />
              <button
                onClick={onAttach}
                disabled={saving || !selectedRoleId || selectedKeys.length === 0}
                className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
              >
                Attach
              </button>
            </div>

            {selectedRole ? (
              <div className="mb-4">
                <div className="text-sm text-gray-700">
                  Selected role: <span className="font-semibold">{selectedRole.name}</span>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {(Array.isArray(selectedRole.permissions) ? selectedRole.permissions : []).map((p) => (
                    <span key={p.id || p.key} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      {p.key || p}
                      <button disabled title="Remove mapping not available" className="text-blue-800 opacity-40 cursor-not-allowed">
                        ×
                      </button>
                    </span>
                  ))}
                  {(!Array.isArray(selectedRole.permissions) || selectedRole.permissions.length === 0) && (
                    <span className="text-sm text-gray-500">No permissions attached (role list may not include permissions).</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-4 text-sm text-gray-500">Select a role to view attached permissions.</div>
            )}

            <div className="max-h-[420px] overflow-auto border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Select</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Key</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPerms.map((p) => {
                    const key = p.key;
                    const checked = selectedKeys.includes(key);

                    const already = Array.isArray(selectedRole?.permissions)
                      ? selectedRole.permissions.some((rp) => (rp.key || rp) === key)
                      : false;

                    return (
                      <tr key={p.id || p.key} className={already ? "bg-gray-50" : ""}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            disabled={!selectedRoleId || already}
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedKeys((prev) => [...prev, key]);
                              else setSelectedKeys((prev) => prev.filter((k) => k !== key));
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-gray-800">{p.key}</td>
                        <td className="px-4 py-3 text-gray-600">{p.name || p.label || "-"}</td>
                      </tr>
                    );
                  })}

                  {filteredPerms.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                        No permissions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default requireAuth(requireAdmin(RolesPage));
