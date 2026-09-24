import { factoryApiRequest } from "./api";

export function fetchPurchases(params = {}, factoryId) {
  const qs = new URLSearchParams();
  ["q", "status", "date_from", "date_to", "page", "page_size"].forEach((key) => {
    const value = params?.[key];
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  });
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return factoryApiRequest(`/purchases${suffix}`, { factoryId });
}

export function fetchPurchaseById(id, factoryId) {
  return factoryApiRequest(`/purchases/${id}`, { factoryId });
}

export function createPurchase(payload, factoryId) {
  return factoryApiRequest(`/purchases`, { method: "POST", body: payload, factoryId });
}

export function updatePurchase(id, payload, factoryId) {
  return factoryApiRequest(`/purchases/${id}`, { method: "PUT", body: payload, factoryId });
}

export function deletePurchase(id, factoryId) {
  return factoryApiRequest(`/purchases/${id}`, { method: "DELETE", factoryId });
}

export function setPurchaseStatus(id, payload, factoryId) {
  return factoryApiRequest(`/purchases/${id}/status`, { method: "PUT", body: payload, factoryId });
}

export function changePurchaseStatus(id, payload, factoryId) {
  return setPurchaseStatus(id, payload, factoryId);
}

export function fetchPurchasePdf(id, factoryId, refresh = false) {
  const qs = refresh ? "?refresh=1" : "";
  return factoryApiRequest(`/purchases/${id}/pdf${qs}`, { factoryId, parseAs: "blob" });
}
