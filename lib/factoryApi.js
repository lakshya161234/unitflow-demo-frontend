import { apiRequest } from "./api";

export function fetchFactories() {
  return apiRequest("/factories");
}

export function createFactory(payload) {
  return apiRequest("/factories", { method: "POST", body: payload });
}

export function updateFactory(id, payload) {
  return apiRequest(`/factories/${id}`, { method: "PUT", body: payload });
}

export function deleteFactory(id) {
  return apiRequest(`/factories/${id}`, { method: "DELETE" });
}
