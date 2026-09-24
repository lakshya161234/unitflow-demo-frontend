import { apiRequest } from "./api";

export function getProductionLogs(token, factory_id) {
  return apiRequest(`/production?factory_id=${factory_id}`, { token });
}

export function createProduction(token, factory_id, data) {
  return apiRequest("/production", {
    method: "POST",
    token,
    body: { ...data, factory_id },
  });
}
