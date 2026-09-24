import { apiRequest, factoryApiRequest } from "./api";

function withOptionalFactory(qs, factoryId) {
  if (factoryId) qs.set("factory_id", factoryId);
  return qs;
}

export async function fetchClients(paramsOrFactoryId, maybeFactoryId) {
  let params = {};
  let factoryId = maybeFactoryId;

  if (typeof paramsOrFactoryId === "string") {
    factoryId = paramsOrFactoryId;
  } else {
    params = paramsOrFactoryId || {};
  }

  const qs = new URLSearchParams();
  ["q", "product_id", "category_id", "page", "page_size"].forEach((key) => {
    const value = params?.[key];
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  });

  withOptionalFactory(qs, factoryId);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiRequest(`/clients${suffix}`);
}

export async function fetchClientById(clientId, factoryId) {
  const qs = new URLSearchParams();
  withOptionalFactory(qs, factoryId);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiRequest(`/clients/${clientId}${suffix}`);
}

export function updateClient(clientId, data, factoryId) {
  const qs = new URLSearchParams();
  withOptionalFactory(qs, factoryId);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiRequest(`/clients/${clientId}${suffix}`, {
    method: "PUT",
    body: data,
  });
}

export function disableClient(clientId, factoryId) {
  const qs = new URLSearchParams();
  withOptionalFactory(qs, factoryId);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiRequest(`/clients/${clientId}${suffix}`, { method: "DELETE" });
}

export function createClient(data, factoryId) {
  const qs = new URLSearchParams();
  withOptionalFactory(qs, factoryId);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiRequest(`/clients${suffix}`, { method: "POST", body: data });
}

export function fetchInactiveClients(days, factoryId) {
  const qs = new URLSearchParams();
  qs.set("days", String(days || 45));
  if (factoryId) qs.set("factory_id", factoryId);
  return apiRequest(`/clients/inactive?${qs.toString()}`);
}

export function fetchClientOrders(clientId, factoryId) {
  return factoryApiRequest(`/clients/${clientId}/orders`, { factoryId });
}

export function generateClientLetterPdf(clientId, payload) {
  return apiRequest(`/clients/${clientId}/letter.pdf`, {
    method: "POST",
    body: payload,
    parseAs: "blob",
  });
}

export function fetchClientSlipPdf(clientId) {
  return apiRequest(`/clients/${clientId}/slip.pdf`, { parseAs: "blob" });
}

export function reEngageClient(clientId, payload) {
  return apiRequest(`/clients/${clientId}/re-engage`, { method: "POST", body: payload });
}
