import { factoryApiRequest } from "./api";

export function fetchPayments(paramsOrFactoryId, maybeFactoryId) {
  let params = {};
  let factoryId = maybeFactoryId;
  if (typeof paramsOrFactoryId === "string") {
    factoryId = paramsOrFactoryId;
  } else {
    params = paramsOrFactoryId || {};
  }
  const qs = new URLSearchParams();
  ["status", "method", "q", "page", "page_size"].forEach((key) => {
    const value = params?.[key];
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  });
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return factoryApiRequest(`/payments${suffix}`, { factoryId });
}

export function deletePayment(id, factoryId) {
  return factoryApiRequest(`/payments/${id}`, { method: "DELETE", factoryId });
}
