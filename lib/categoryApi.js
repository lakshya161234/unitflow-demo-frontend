import { apiRequest } from "./api";

export function fetchCategories() {
  return apiRequest(`/categories`);
}

export function fetchCategoryById(id) {
  return apiRequest(`/categories/${id}`);
}

export function createCategory(payload) {
  return apiRequest(`/categories`, { method: "POST", body: payload });
}

export function updateCategory(id, payload) {
  return apiRequest(`/categories/${id}`, { method: "PUT", body: payload });
}

export function deleteCategory(id) {
  return apiRequest(`/categories/${id}`, { method: "DELETE" });
}
