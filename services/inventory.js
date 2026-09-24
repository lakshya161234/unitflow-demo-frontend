import { apiRequest } from "./api";

// Inventory items
export function getItems(token, factory_id) {
  return apiRequest(`/inventory/items?factory_id=${factory_id}`, { token });
}

export function createItem(token, factory_id, data) {
  return apiRequest("/inventory/items", {
    method: "POST",
    token,
    body: { ...data, factory_id },
  });
}

export function updateItem(token, factory_id, id, data) {
  return apiRequest(`/inventory/items/${id}`, {
    method: "PUT",
    token,
    body: { ...data, factory_id },
  });
}

export function disableItem(token, factory_id, id) {
  return apiRequest(`/inventory/items/${id}`, {
    method: "DELETE",
    token,
    body: { factory_id },
  });
}

// Stock movements
export function addStock(token, factory_id, data) {
  return apiRequest("/inventory/movements/in", {
    method: "POST",
    token,
    body: { ...data, factory_id },
  });
}

export function removeStock(token, factory_id, data) {
  return apiRequest("/inventory/movements/out", {
    method: "POST",
    token,
    body: { ...data, factory_id },
  });
}

export function getStockSummary(token, factory_id, item_id) {
  return apiRequest(
    `/inventory/movements/summary?factory_id=${factory_id}&item_id=${item_id}`,
    { token }
  );
}
