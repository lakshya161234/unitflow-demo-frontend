import { factoryApiRequest } from "./api";

export function fetchInvoices(paramsOrFactoryId, maybeFactoryId) {
  let params = {};
  let factoryId = maybeFactoryId;
  if (typeof paramsOrFactoryId === "string") {
    factoryId = paramsOrFactoryId;
  } else {
    params = paramsOrFactoryId || {};
  }
  const qs = new URLSearchParams();
  ["status", "q", "page", "page_size"].forEach((key) => {
    const value = params?.[key];
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  });
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return factoryApiRequest(`/invoices${suffix}`, { factoryId });
}

export function fetchInvoiceById(invoiceId, factoryId) {
  return factoryApiRequest(`/invoices/${invoiceId}`, { factoryId });
}

export function createInvoice(data, factoryId) {
  return factoryApiRequest(`/invoices`, { method: "POST", body: data, factoryId });
}

export function changeInvoiceStatus(id, payload, factoryId) {
  return factoryApiRequest(`/invoices/${id}/status`, { method: "PUT", body: payload, factoryId });
}

export function deleteInvoice(id, factoryId) {
  return factoryApiRequest(`/invoices/${id}`, { method: "DELETE", factoryId });
}

export function fetchInvoicePdf(id, factoryId, refresh = false) {
  const qs = refresh ? "?refresh=1" : "";
  return factoryApiRequest(`/invoices/${id}/pdf${qs}`, { factoryId, parseAs: "blob" });
}

export function sendInvoiceReminder(id, payload, factoryId) {
  return factoryApiRequest(`/invoices/${id}/remind`, { method: "POST", body: payload, factoryId });
}
