import { apiRequest } from "./api";

export function addProductToClient(clientId, productId, factoryId) {
  return apiRequest(`/clients/${clientId}/products`, {
    method: "POST",
    body: { product_id: productId },
    factoryId,
  });
}

export function removeProductFromClient(clientId, productId, factoryId) { // optional; may not exist on all backends
  return apiRequest(`/clients/${clientId}/products/${productId}`, {
    method: "DELETE",
  });
}
