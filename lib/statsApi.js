import { apiRequest } from "./api";

export function fetchStats(params = {}) {
  const qs = new URLSearchParams();
  if (params.factory_id) qs.set("factory_id", params.factory_id);
  if (params.date_from) qs.set("date_from", params.date_from);
  if (params.date_to) qs.set("date_to", params.date_to);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiRequest(`/stats${suffix}`);
}
