import { factoryApiRequest } from "./api";

// Sales companies (legal selling entities) are managed from backend only.
// Frontend can only list them and select on order creation.
export function fetchSalesCompanies(factoryId) {
  return factoryApiRequest(`/sales-companies`, { factoryId });
}
