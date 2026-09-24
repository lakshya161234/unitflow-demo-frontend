import { apiRequest } from "./api";

export function createCampaign(payload) {
  return apiRequest(`/messages/campaigns`, { method: "POST", body: payload });
}

export function createCampaignFromFilter(payload) {
  return apiRequest(`/messages/campaigns/from-filter`, { method: "POST", body: payload });
}

export function createPromotionalCampaign(payload) {
  return apiRequest(`/messages/campaigns/promotional`, { method: "POST", body: payload });
}

export function dispatchCampaign(id, payload = {}) {
  return apiRequest(`/messages/campaigns/${id}/dispatch`, { method: "POST", body: payload });
}

export function deleteCampaign(id) {
  return apiRequest(`/messages/campaigns/${id}`, { method: "DELETE" });
}

export function fetchCampaignStatus(id) {
  return apiRequest(`/messages/campaigns/${id}/status`);
}

export function fetchOutbox(params = {}) {
  const qs = new URLSearchParams();
  ["status", "channel", "campaign_id", "page", "page_size"].forEach((key) => {
    const value = params?.[key];
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  });
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiRequest(`/messages/outbox${suffix}`);
}
