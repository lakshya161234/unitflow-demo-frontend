import { apiRequest } from "./api";

export function fetchClientContacts(clientId, factoryId) {
  return apiRequest(
    `/clients/${clientId}/contacts?factory_id=${factoryId}`
  );
}

export function addClientContact(clientId, data, factoryId) {
  return apiRequest(
    `/clients/${clientId}/contacts?factory_id=${factoryId}`,
    {
      method: "POST",
      body: data,
    }
  );
}

export function updateClientContact(clientId, contactId, data, factoryId) {
  return apiRequest(
    `/clients/${clientId}/contacts/${contactId}?factory_id=${factoryId}`,
    {
      method: "PUT",
      body: data,
    }
  );
}

export function deleteClientContact(clientId, contactId, factoryId) {
  return apiRequest(
    `/clients/${clientId}/contacts/${contactId}?factory_id=${factoryId}`,
    {
      method: "DELETE",
    }
  );
}
