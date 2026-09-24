import { apiRequest } from "./api";

export async function fetchAnnouncements(params = {}, opts = {}) {
  const qs = new URLSearchParams();
  ["page", "page_size", "cursor", "limit"].forEach((key) => {
    const value = params?.[key];
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  });

  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  try {
    return await apiRequest(`/announcements${suffix}`);
  } catch (e) {
    if (opts?.preferAdmin) {
      try {
        return await apiRequest(`/broadcast/admin/recent${suffix}`);
      } catch {
        return apiRequest(`/broadcast${suffix}`);
      }
    }
    return apiRequest(`/broadcast${suffix}`);
  }
}

export function createAnnouncement(payload) {
  if (payload?.targetType && typeof payload?.body === "string") {
    return apiRequest(`/broadcast`, { method: "POST", body: payload });
  }

  const title = String(payload?.title || "").trim();
  const content = String(payload?.content || "").trim();
  const targets = payload?.targets || {};

  let targetType = "ALL";
  let userIds = [];
  let roleIds = [];

  if (targets?.all) targetType = "ALL";
  else if (Array.isArray(targets?.user_ids) && targets.user_ids.length) {
    targetType = "USERS";
    userIds = targets.user_ids;
  } else if (Array.isArray(targets?.roles) && targets.roles.length) {
    targetType = "ROLES";
    roleIds = targets.roles;
  }

  const bodyText = title ? `${title}\n\n${content}` : content;

  return apiRequest(`/broadcast`, {
    method: "POST",
    body: {
      targetType,
      body: bodyText,
      ...(userIds.length ? { userIds } : {}),
      ...(roleIds.length ? { roleIds } : {}),
    },
  });
}

export function markAnnouncementSeen(id) {
  return apiRequest(`/broadcast/${id}/seen`, { method: "POST", body: {} });
}

export function deleteAnnouncement(id) {
  return apiRequest(`/broadcast/${id}`, { method: "DELETE" });
}
