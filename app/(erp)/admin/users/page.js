// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { requireAuth } from "@/lib/requireAuth";
// import { requireAdmin } from "@/lib/requireAdmin";
// import { useAuth } from "@/lib/authContext";
// import { fetchFactories } from "@/lib/factoryApi";
// import {
//   fetchRoles,
//   fetchUsers,
//   createUser,
//   disableUser,
//   assignRoleToUser,
//   removeRoleFromUser,
//   assignFactoryToUser,
//   removeFactoryFromUser,
//   resetUserPassword,
// } from "@/lib/adminApi";
// import { normalizeListResponse } from "@/lib/listResponse";
// import PaginationControls from "@/components/PaginationControls";
// import { useAppliedSearch } from "@/lib/useAppliedSearch";

// function AdminUsersPage() {
//   const auth = useAuth();
//   const can = typeof auth?.can === "function" ? auth.can : () => true;

//   const [users, setUsers] = useState([]);
//   const [roles, setRoles] = useState([]);
//   const [factories, setFactories] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState("");
//   const { searchInput, setSearchInput, appliedSearch, applySearch, clearSearch, onSearchKeyDown } = useAppliedSearch("");
//   const [selectedUserId, setSelectedUserId] = useState("");
//   const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 1 });

//   const [newUser, setNewUser] = useState({ name: "", email: "", password: "", is_admin: false });
//   const [assignRoleId, setAssignRoleId] = useState("");
//   const [assignFactoryId, setAssignFactoryId] = useState("");
//   const [resetPassword, setResetPassword] = useState("");
//   const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");

//   async function reload(page = pagination.page, pageSize = pagination.page_size) {
//     setLoading(true);
//     setError("");
//     try {
//       const [u, r, f] = await Promise.all([
//         fetchUsers({ q: appliedSearch || undefined, page, page_size: pageSize }),
//         fetchRoles(),
//         fetchFactories(),
//       ]);
//       const normalized = normalizeListResponse(u);
//       setUsers(normalized.items || []);
//       setPagination(normalized.pagination);
//       setRoles(Array.isArray(r) ? r : r?.rows || r?.items || []);
//       setFactories(Array.isArray(f) ? f : f?.rows || f?.items || []);
//     } catch (e) {
//       setError(e?.message || "Failed to load admin data");
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     reload(1, pagination.page_size);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [appliedSearch]);

//   const selectedUser = useMemo(() => (users || []).find((u) => u.id === selectedUserId) || null, [users, selectedUserId]);

//   async function onCreateUser() {
//     if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) return;
//     setSaving(true);
//     setError("");
//     try {
//       const created = await createUser({
//         name: newUser.name.trim(),
//         email: newUser.email.trim().toLowerCase(),
//         password: newUser.password,
//         is_admin: !!newUser.is_admin,
//       });
//       setNewUser({ name: "", email: "", password: "", is_admin: false });
//       await reload(pagination.page, pagination.page_size);
//       if (created?.id) setSelectedUserId(created.id);
//     } catch (e) {
//       setError(e?.message || "Failed to create user");
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function onToggleUser() {
//     if (!selectedUserId) return;
//     if (!confirm("Toggle user status (enable/disable)?")) return;
//     setSaving(true);
//     setError("");
//     try {
//       await disableUser(selectedUserId);
//       await reload(pagination.page, pagination.page_size);
//     } catch (e) {
//       setError(e?.message || "Failed to toggle status");
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function onAssignRole() {
//     if (!selectedUserId || !assignRoleId) return;
//     setSaving(true);
//     setError("");
//     try {
//       await assignRoleToUser(selectedUserId, assignRoleId);
//       setAssignRoleId("");
//       await reload(pagination.page, pagination.page_size);
//     } catch (e) {
//       setError(e?.message || "Failed to assign role");
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function onRemoveRole(roleId) {
//     if (!selectedUserId) return;
//     if (!confirm("Remove this role from user?")) return;
//     setSaving(true);
//     setError("");
//     try {
//       await removeRoleFromUser(selectedUserId, roleId);
//       await reload(pagination.page, pagination.page_size);
//     } catch (e) {
//       setError(e?.message || "Failed to remove role");
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function onAssignFactory() {
//     if (!selectedUserId || !assignFactoryId) return;
//     setSaving(true);
//     setError("");
//     try {
//       await assignFactoryToUser(selectedUserId, assignFactoryId);
//       setAssignFactoryId("");
//       await reload(pagination.page, pagination.page_size);
//     } catch (e) {
//       setError(e?.message || "Failed to assign factory");
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function onRemoveFactory(factoryId) {
//     if (!selectedUserId) return;
//     if (!confirm("Remove this factory access from user?")) return;
//     setSaving(true);
//     setError("");
//     try {
//       await removeFactoryFromUser(selectedUserId, factoryId);
//       await reload(pagination.page, pagination.page_size);
//     } catch (e) {
//       setError(e?.message || "Failed to remove factory access");
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function onResetPassword() {
//     if (!selectedUserId) return;
//     if (!resetPassword || resetPassword.length < 6) {
//       setError("New password must be at least 6 characters.");
//       return;
//     }
//     if (resetPassword !== resetPasswordConfirm) {
//       setError("Password confirmation does not match.");
//       return;
//     }
//     setSaving(true);
//     setError("");
//     try {
//       await resetUserPassword(selectedUserId, resetPassword);
//       setResetPassword("");
//       setResetPasswordConfirm("");
//       alert("Password reset successfully.");
//     } catch (e) {
//       setError(e?.message || "Failed to reset password");
//     } finally {
//       setSaving(false);
//     }
//   }

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="text-center">
//           <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
//           <p className="text-gray-600">Loading users...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="p-6 space-y-6">
//       <div>
//         <h1 className="text-2xl font-bold text-gray-800">Admin · Users</h1>
//         <p className="text-gray-600">Create users, assign roles, factories, and reset passwords.</p>
//       </div>

//       {error ? <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div> : null}

//       <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
//         <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//           <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
//             <div className="flex w-full md:max-w-xl gap-3"><input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={onSearchKeyDown} placeholder="Search users by name or email" className="flex-1 px-4 py-3 border border-gray-300 rounded-lg" /><button onClick={applySearch} className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Search</button><button onClick={clearSearch} className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">Clear</button></div>
//             <button onClick={() => reload(pagination.page, pagination.page_size)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Refresh</button>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User</th>
//                   <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-200">
//                 {users.length === 0 ? (
//                   <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-500">No users.</td></tr>
//                 ) : (
//                   users.map((u) => (
//                     <tr key={u.id} className={`cursor-pointer hover:bg-gray-50 ${selectedUserId === u.id ? "bg-blue-50" : ""}`} onClick={() => setSelectedUserId(u.id)}>
//                       <td className="px-4 py-3"><div className="font-medium text-gray-900">{u.name || "-"}</div><div className="text-sm text-gray-500">{u.email || "-"}</div></td>
//                       <td className="px-4 py-3"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${u.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>{u.status || (u.is_active === false ? "DISABLED" : "ACTIVE")}</span></td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>

//           <PaginationControls pagination={pagination} currentCount={users.length} itemLabel="users" pageSizeOptions={[10, 20, 25, 50]} onPageChange={(page) => reload(page, pagination.page_size)} onPageSizeChange={(size) => reload(1, size)} />

//           <div className="mt-6 pt-6 border-t">
//             <h3 className="font-semibold text-gray-800 mb-3">Create Staff User</h3>
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
//               <input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Name" className="px-4 py-3 border border-gray-300 rounded-lg" />
//               <input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="Email" className="px-4 py-3 border border-gray-300 rounded-lg" />
//               <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Password" className="px-4 py-3 border border-gray-300 rounded-lg" />
//             </div>
//             <label className="mt-3 flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={!!newUser.is_admin} onChange={(e) => setNewUser((p) => ({ ...p, is_admin: e.target.checked }))} /> Make admin</label>
//             <button onClick={onCreateUser} disabled={saving || !newUser.name.trim() || !newUser.email.trim() || !newUser.password || !can("admin.users.create")} className="mt-3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">{saving ? "Saving..." : "Create User"}</button>
//           </div>
//         </div>

//         <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//           {!selectedUser ? (
//             <p className="text-gray-500">Select a user on the left.</p>
//           ) : (
//             <div className="space-y-6">
//               <div className="p-4 bg-gray-50 rounded-lg">
//                 <div className="font-semibold text-gray-900">{selectedUser.name}</div>
//                 <div className="text-sm text-gray-600">{selectedUser.email}</div>
//                 <div className="text-sm text-gray-600 mt-1">Admin: <span className="font-medium">{selectedUser.is_admin ? "Yes" : "No"}</span></div>
//                 <div className="mt-3 flex flex-wrap gap-3"><button onClick={onToggleUser} disabled={saving} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60">Toggle Status</button></div>

//                 <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
//                   <h4 className="font-medium text-gray-900 mb-1">Reset Password</h4>
//                   <p className="text-sm text-gray-500 mb-3">Admin can directly reset this user's password.</p>
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                     <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="New password" className="px-4 py-3 border border-gray-300 rounded-lg" />
//                     <input type="password" value={resetPasswordConfirm} onChange={(e) => setResetPasswordConfirm(e.target.value)} placeholder="Confirm new password" className="px-4 py-3 border border-gray-300 rounded-lg" />
//                   </div>
//                   <button onClick={onResetPassword} disabled={saving || !resetPassword || !resetPasswordConfirm} className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60">{saving ? "Saving..." : "Reset Password"}</button>
//                 </div>
//               </div>

//               <div>
//                 <h3 className="font-semibold text-gray-800 mb-2">Roles</h3>
//                 <div className="flex flex-wrap gap-2 mb-3">
//                   {(selectedUser.roles || []).map((r) => <span key={r.id} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs bg-blue-100 text-blue-800">{r.name}<button onClick={() => onRemoveRole(r.id)} disabled={saving} className="text-blue-800 hover:text-red-700">×</button></span>)}
//                   {(selectedUser.roles || []).length === 0 && <span className="text-sm text-gray-500">No roles assigned.</span>}
//                 </div>
//                 <div className="flex gap-3">
//                   <select value={assignRoleId} onChange={(e) => setAssignRoleId(e.target.value)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-white">
//                     <option value="">Select role</option>
//                     {roles.filter((role) => !(selectedUser.roles || []).some((r) => r.id === role.id)).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
//                   </select>
//                   <button onClick={onAssignRole} disabled={saving || !assignRoleId} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">Add Role</button>
//                 </div>
//               </div>

//               <div>
//                 <h3 className="font-semibold text-gray-800 mb-2">Factory Access</h3>
//                 <div className="flex flex-wrap gap-2 mb-3">
//                   {(selectedUser.factories || []).map((f) => <span key={f.id} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs bg-purple-100 text-purple-800">{f.name}<button onClick={() => onRemoveFactory(f.id)} disabled={saving} className="text-purple-800 hover:text-red-700">×</button></span>)}
//                   {(selectedUser.factories || []).length === 0 && <span className="text-sm text-gray-500">No factories assigned.</span>}
//                 </div>
//                 <div className="flex gap-3">
//                   <select value={assignFactoryId} onChange={(e) => setAssignFactoryId(e.target.value)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-white">
//                     <option value="">Select factory</option>
//                     {factories.filter((factory) => !(selectedUser.factories || []).some((f) => f.id === factory.id)).map((factory) => <option key={factory.id} value={factory.id}>{factory.name}</option>)}
//                   </select>
//                   <button onClick={onAssignFactory} disabled={saving || !assignFactoryId} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">Add Factory</button>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// export default requireAuth(requireAdmin(AdminUsersPage));















"use client";

import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "@/lib/requireAuth";
import { requireAdmin } from "@/lib/requireAdmin";
import { useAuth } from "@/lib/authContext";
import { fetchFactories } from "@/lib/factoryApi";
import {
  fetchRoles,
  fetchUsers,
  fetchUserRoles,
  fetchUserFactories,
  createUser,
  disableUser,
  assignRoleToUser,
  removeRoleFromUser,
  assignFactoryToUser,
  removeFactoryFromUser,
  resetUserPassword,
} from "@/lib/adminApi";
import { normalizeListResponse } from "@/lib/listResponse";
import PaginationControls from "@/components/PaginationControls";
import { useAppliedSearch } from "@/lib/useAppliedSearch";

function AdminUsersPage() {
  const auth = useAuth();
  const can = typeof auth?.can === "function" ? auth.can : () => true;

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [factories, setFactories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingSelectedDetails, setLoadingSelectedDetails] = useState(false);
  const [error, setError] = useState("");
  const {
    searchInput,
    setSearchInput,
    appliedSearch,
    applySearch,
    clearSearch,
    onSearchKeyDown,
  } = useAppliedSearch("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 1,
  });

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    is_admin: false,
  });
  const [assignRoleId, setAssignRoleId] = useState("");
  const [assignFactoryId, setAssignFactoryId] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");

  const [selectedUserRoles, setSelectedUserRoles] = useState([]);
  const [selectedUserFactories, setSelectedUserFactories] = useState([]);

  async function reload(page = pagination.page, pageSize = pagination.page_size) {
    setLoading(true);
    setError("");
    try {
      const [u, r, f] = await Promise.all([
        fetchUsers({ q: appliedSearch || undefined, page, page_size: pageSize }),
        fetchRoles(),
        fetchFactories(),
      ]);

      const normalized = normalizeListResponse(u);
      const roleRows = Array.isArray(r) ? r : r?.rows || r?.items || [];
      const factoryRows = Array.isArray(f) ? f : f?.rows || f?.items || [];

      setUsers(normalized.items || []);
      setPagination(normalized.pagination);
      setRoles(roleRows);
      setFactories(factoryRows);
    } catch (e) {
      setError(e?.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  async function loadSelectedUserDetails(userId) {
    if (!userId) {
      setSelectedUserRoles([]);
      setSelectedUserFactories([]);
      return;
    }

    setLoadingSelectedDetails(true);
    setError("");
    try {
      const [rolesResp, factoriesResp] = await Promise.all([
        fetchUserRoles(userId),
        fetchUserFactories(userId),
      ]);

      setSelectedUserRoles(
        Array.isArray(rolesResp?.roles) ? rolesResp.roles : Array.isArray(rolesResp) ? rolesResp : []
      );
      setSelectedUserFactories(
        Array.isArray(factoriesResp?.factories)
          ? factoriesResp.factories
          : Array.isArray(factoriesResp)
          ? factoriesResp
          : []
      );
    } catch (e) {
      setSelectedUserRoles([]);
      setSelectedUserFactories([]);
      setError(e?.message || "Failed to load selected user details");
    } finally {
      setLoadingSelectedDetails(false);
    }
  }

  useEffect(() => {
    reload(1, pagination.page_size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedSearch]);

  useEffect(() => {
    loadSelectedUserDetails(selectedUserId);
  }, [selectedUserId]);

  const selectedUser = useMemo(
    () => (users || []).find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId]
  );

  async function onCreateUser() {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) return;
    setSaving(true);
    setError("");
    try {
      const created = await createUser({
        name: newUser.name.trim(),
        email: newUser.email.trim().toLowerCase(),
        password: newUser.password,
        is_admin: !!newUser.is_admin,
      });
      setNewUser({ name: "", email: "", password: "", is_admin: false });
      await reload(pagination.page, pagination.page_size);
      if (created?.id) setSelectedUserId(created.id);
    } catch (e) {
      setError(e?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  async function onToggleUser() {
    if (!selectedUserId) return;
    if (!confirm("Toggle user status (enable/disable)?")) return;
    setSaving(true);
    setError("");
    try {
      await disableUser(selectedUserId);
      await reload(pagination.page, pagination.page_size);
      await loadSelectedUserDetails(selectedUserId);
    } catch (e) {
      setError(e?.message || "Failed to toggle status");
    } finally {
      setSaving(false);
    }
  }

  async function onAssignRole() {
    if (!selectedUserId || !assignRoleId) return;
    setSaving(true);
    setError("");
    try {
      await assignRoleToUser(selectedUserId, assignRoleId);
      setAssignRoleId("");
      await reload(pagination.page, pagination.page_size);
      await loadSelectedUserDetails(selectedUserId);
    } catch (e) {
      setError(e?.message || "Failed to assign role");
    } finally {
      setSaving(false);
    }
  }

  async function onRemoveRole(roleId) {
    if (!selectedUserId) return;
    if (!confirm("Remove this role from user?")) return;
    setSaving(true);
    setError("");
    try {
      await removeRoleFromUser(selectedUserId, roleId);
      await reload(pagination.page, pagination.page_size);
      await loadSelectedUserDetails(selectedUserId);
    } catch (e) {
      setError(e?.message || "Failed to remove role");
    } finally {
      setSaving(false);
    }
  }

  async function onAssignFactory() {
    if (!selectedUserId || !assignFactoryId) return;
    setSaving(true);
    setError("");
    try {
      await assignFactoryToUser(selectedUserId, assignFactoryId);
      setAssignFactoryId("");
      await reload(pagination.page, pagination.page_size);
      await loadSelectedUserDetails(selectedUserId);
    } catch (e) {
      setError(e?.message || "Failed to assign factory");
    } finally {
      setSaving(false);
    }
  }

  async function onRemoveFactory(factoryId) {
    if (!selectedUserId) return;
    if (!confirm("Remove this factory access from user?")) return;
    setSaving(true);
    setError("");
    try {
      await removeFactoryFromUser(selectedUserId, factoryId);
      await reload(pagination.page, pagination.page_size);
      await loadSelectedUserDetails(selectedUserId);
    } catch (e) {
      setError(e?.message || "Failed to remove factory access");
    } finally {
      setSaving(false);
    }
  }

  async function onResetPassword() {
    if (!selectedUserId) return;
    if (!resetPassword || resetPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      setError("Password confirmation does not match.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await resetUserPassword(selectedUserId, resetPassword);
      setResetPassword("");
      setResetPasswordConfirm("");
      alert("Password reset successfully.");
    } catch (e) {
      setError(e?.message || "Failed to reset password");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Admin · Users</h1>
        <p className="text-gray-600">
          Create users, assign roles, factories, and reset passwords.
        </p>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
            <div className="flex w-full md:max-w-xl gap-3">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search users by name or email"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg"
              />
              <button
                onClick={applySearch}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Search
              </button>
              <button
                onClick={clearSearch}
                className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear
              </button>
            </div>

            <button
              onClick={() => reload(pagination.page, pagination.page_size)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                      No users.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        selectedUserId === u.id ? "bg-blue-50" : ""
                      }`}
                      onClick={() => setSelectedUserId(u.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{u.name || "-"}</div>
                        <div className="text-sm text-gray-500">{u.email || "-"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            u.status === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {u.status || (u.is_active === false ? "DISABLED" : "ACTIVE")}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            pagination={pagination}
            currentCount={users.length}
            itemLabel="users"
            pageSizeOptions={[10, 20, 25, 50]}
            onPageChange={(page) => reload(page, pagination.page_size)}
            onPageSizeChange={(size) => reload(1, size)}
          />

          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold text-gray-800 mb-3">Create Staff User</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Name"
                className="px-4 py-3 border border-gray-300 rounded-lg"
              />
              <input
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="Email"
                className="px-4 py-3 border border-gray-300 rounded-lg"
              />
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Password"
                className="px-4 py-3 border border-gray-300 rounded-lg"
              />
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={!!newUser.is_admin}
                onChange={(e) =>
                  setNewUser((p) => ({ ...p, is_admin: e.target.checked }))
                }
              />
              Make admin
            </label>

            <button
              onClick={onCreateUser}
              disabled={
                saving ||
                !newUser.name.trim() ||
                !newUser.email.trim() ||
                !newUser.password ||
                !can("admin.users.create")
              }
              className="mt-3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Create User"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {!selectedUser ? (
            <p className="text-gray-500">Select a user on the left.</p>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900">{selectedUser.name}</div>
                <div className="text-sm text-gray-600">{selectedUser.email}</div>
                <div className="text-sm text-gray-600 mt-1">
                  Admin: <span className="font-medium">{selectedUser.is_admin ? "Yes" : "No"}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    onClick={onToggleUser}
                    disabled={saving}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
                  >
                    Toggle Status
                  </button>
                </div>

                <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-1">Reset Password</h4>
                  <p className="text-sm text-gray-500 mb-3">
                    Admin can directly reset this user's password.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="New password"
                      className="px-4 py-3 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="password"
                      value={resetPasswordConfirm}
                      onChange={(e) => setResetPasswordConfirm(e.target.value)}
                      placeholder="Confirm new password"
                      className="px-4 py-3 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <button
                    onClick={onResetPassword}
                    disabled={saving || !resetPassword || !resetPasswordConfirm}
                    className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Reset Password"}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">Current Roles</h3>
                  {loadingSelectedDetails ? (
                    <span className="text-xs text-gray-500">Loading...</span>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedUserRoles.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                    >
                      {r.name}
                      <button
                        onClick={() => onRemoveRole(r.id)}
                        disabled={saving}
                        className="text-blue-800 hover:text-red-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {selectedUserRoles.length === 0 && !loadingSelectedDetails ? (
                    <span className="text-sm text-gray-500">No roles assigned.</span>
                  ) : null}
                </div>

                <div className="flex gap-3">
                  <select
                    value={assignRoleId}
                    onChange={(e) => setAssignRoleId(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">Select role</option>
                    {roles
                      .filter((role) => !selectedUserRoles.some((r) => r.id === role.id))
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={onAssignRole}
                    disabled={saving || !assignRoleId}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                  >
                    Add Role
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">Factory Access</h3>
                  {loadingSelectedDetails ? (
                    <span className="text-xs text-gray-500">Loading...</span>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedUserFactories.map((f) => (
                    <span
                      key={f.id}
                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs bg-purple-100 text-purple-800"
                    >
                      {f.name}
                      <button
                        onClick={() => onRemoveFactory(f.id)}
                        disabled={saving}
                        className="text-purple-800 hover:text-red-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {selectedUserFactories.length === 0 && !loadingSelectedDetails ? (
                    <span className="text-sm text-gray-500">No factories assigned.</span>
                  ) : null}
                </div>

                <div className="flex gap-3">
                  <select
                    value={assignFactoryId}
                    onChange={(e) => setAssignFactoryId(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="">Select factory</option>
                    {factories
                      .filter((factory) => !selectedUserFactories.some((f) => f.id === factory.id))
                      .map((factory) => (
                        <option key={factory.id} value={factory.id}>
                          {factory.name}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={onAssignFactory}
                    disabled={saving || !assignFactoryId}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                  >
                    Add Factory
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-800 mb-2">Summary</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>
                    Assigned roles: <span className="font-medium">{selectedUserRoles.length}</span>
                  </div>
                  <div>
                    Assigned factories:{" "}
                    <span className="font-medium">{selectedUserFactories.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default requireAuth(requireAdmin(AdminUsersPage));