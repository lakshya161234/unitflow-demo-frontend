import { apiRequest } from "./api";

/**
 * Legacy inventory items endpoints are deprecated (410).
 * The ERP now uses the company-wide Product master for dropdowns.
 */
export async function fetchItems() {
  return apiRequest(`/products`);
}
