import { apiRequest } from "./api";

export function fetchProducts(paramsOrFactoryId, maybeFactoryId) {
  let params = {};
  let factoryId = maybeFactoryId;

  if (typeof paramsOrFactoryId === "string") {
    factoryId = paramsOrFactoryId;
  } else {
    params = paramsOrFactoryId || {};
  }

  const qs = new URLSearchParams();
  ["q", "category_id", "page", "page_size"].forEach((key) => {
    const value = params?.[key];
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  });
  if (factoryId) qs.set("factory_id", factoryId);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiRequest(`/products${suffix}`);
}

export function fetchProductById(id) {
  return apiRequest(`/products/${id}`);
}

export function createProduct(payload) {
  return apiRequest(`/products`, { method: "POST", body: payload });
}

export function updateProduct(id, payload) {
  return apiRequest(`/products/${id}`, { method: "PUT", body: payload });
}

export function deleteProduct(id) {
  return apiRequest(`/products/${id}`, { method: "DELETE" });
}
