import { apiRequest } from "./api";

export function getClients(token, factory_id) {
  return apiRequest(`/clients?factory_id=${factory_id}`, { token });
}

export function createClient(token, factory_id, data) {
  return apiRequest("/clients", {
    method: "POST",
    token,
    body: { ...data, factory_id },
  });
}

export function updateClient(token, factory_id, id, data) {
  return apiRequest(`/clients/${id}`, {
    method: "PUT",
    token,
    body: { ...data, factory_id },
  });
}

export function disableClient(token, factory_id, id) {
  return apiRequest(`/clients/${id}`, {
    method: "DELETE",
    token,
    body: { factory_id },
  });
}
