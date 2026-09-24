import { apiRequest } from "./api";

export function fetchRoles() {
  return apiRequest(`/admin/roles`);
}

export function createRole(payload) {
  return apiRequest(`/admin/roles`, { method: "POST", body: payload });
}

export function deleteRole(roleId) {
  return apiRequest(`/admin/roles/${roleId}`, { method: "DELETE" });
}

export function attachPermissionsToRole(roleId, permission_keys) {
  return apiRequest(`/admin/roles/${roleId}/permissions`, { method: "POST", body: { permission_keys } });
}

export function removePermissionFromRole(roleId, permissionKeyOrId) {
  return apiRequest(`/admin/roles/${roleId}/permissions/${encodeURIComponent(permissionKeyOrId)}`, { method: "DELETE" });
}

export function fetchUsers(params = {}) {
  const qs = new URLSearchParams();
  ["q", "page", "page_size"].forEach((key) => {
    const value = params?.[key];
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  });
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiRequest(`/admin/users${suffix}`);
}

export function fetchUserAssignments() {
  return apiRequest(`/admin/users/assignments`);
}

export function fetchUserRoles(userId) {
  return apiRequest(`/admin/users/${userId}/roles`);
}

export function fetchUserFactories(userId) {
  return apiRequest(`/admin/users/${userId}/factories`);
}

export function createUser(payload) {
  return apiRequest(`/admin/users`, { method: "POST", body: payload });
}

export function disableUser(userId) {
  return apiRequest(`/admin/users/${userId}/disable`, { method: "PUT" });
}

export function toggleUserStatus(userId) {
  return disableUser(userId);
}

export function assignRoleToUser(userId, role_id) {
  return apiRequest(`/admin/users/${userId}/roles`, { method: "POST", body: { role_id } });
}

export function removeRoleFromUser(userId, roleId) {
  return apiRequest(`/admin/users/${userId}/roles/${roleId}`, { method: "DELETE" });
}

export function assignFactoryToUser(userId, factory_id) {
  return apiRequest(`/admin/users/${userId}/factories`, { method: "POST", body: { factory_id } });
}

export function removeFactoryFromUser(userId, factoryId) {
  return apiRequest(`/admin/users/${userId}/factories/${factoryId}`, { method: "DELETE" });
}

export function grantDirectPermissions(userId, permission_keys) {
  return apiRequest(`/admin/users/${userId}/permissions`, { method: "POST", body: { permission_keys } });
}

export function revokeDirectPermission(userId, permissionKey) {
  return apiRequest(`/admin/users/${userId}/permissions/${encodeURIComponent(permissionKey)}`, { method: "DELETE" });
}

export function resetUserPassword(userId, new_password) {
  return apiRequest(`/admin/users/${userId}/password`, { method: "PUT", body: { new_password } });
}
