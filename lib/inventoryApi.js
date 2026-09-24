import { factoryApiRequest } from "./api";

function appendQuery(qs, params = {}, keys = []) {
  keys.forEach((key) => {
    const value = params?.[key] ?? (key === "product_id" ? params?.productId : undefined);
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  });
  return qs;
}

export function fetchStock(params = {}, factoryId) {
  const qs = appendQuery(new URLSearchParams(), params, ["as_of", "date_from", "date_to", "product_id", "page", "page_size"]);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return factoryApiRequest(`/inventory/stock${suffix}`, { factoryId });
}

export function fetchStockSummary(params = {}, factoryId) {
  const qs = appendQuery(new URLSearchParams(), params, ["as_of", "date_from", "date_to", "product_id"]);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return factoryApiRequest(`/inventory/stock-summary${suffix}`, { factoryId });
}

export function fetchMovements(params = {}, factoryId) {
  const qs = appendQuery(new URLSearchParams(), params, ["date_from", "date_to", "product_id", "source_type", "source_id", "page", "page_size"]);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return factoryApiRequest(`/inventory/movements${suffix}`, { factoryId });
}

export function createManualIn(payload, factoryId) {
  return factoryApiRequest(`/inventory/movements/in`, { method: "POST", body: payload, factoryId });
}

export function createManualOut(payload, factoryId) {
  return factoryApiRequest(`/inventory/movements/out`, { method: "POST", body: payload, factoryId });
}

export function createAdjustment(payload, factoryId) {
  return factoryApiRequest(`/inventory/movements/adjustment`, { method: "POST", body: payload, factoryId });
}
