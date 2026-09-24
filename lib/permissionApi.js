import { apiRequest } from "./api";

export function fetchPermissions(factoryId) {
  return apiRequest(`/permissions?factory_id=${factoryId}`);
}


