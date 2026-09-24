import { factoryApiRequest } from "./api";

export function createProductionLog(data, factoryId) {
  return factoryApiRequest(`/production`, { method: "POST", body: data, factoryId });
}

export function fetchProductionLogs(paramsOrFactoryId, maybeFactoryId) {
  let params = {};
  let factoryId = maybeFactoryId;
  if (typeof paramsOrFactoryId === "string") {
    factoryId = paramsOrFactoryId;
  } else {
    params = paramsOrFactoryId || {};
  }
  const qs = new URLSearchParams();
  ["q", "product_id", "page", "page_size"].forEach((key) => {
    const value = params?.[key];
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  });
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return factoryApiRequest(`/production${suffix}`, { factoryId });
}

export function deleteProductionLog(id, factoryId) {
  return factoryApiRequest(`/production/${id}`, { method: "DELETE", factoryId });
}
