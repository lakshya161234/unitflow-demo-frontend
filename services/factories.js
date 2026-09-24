import { apiRequest } from "./api";

export function getFactories(token) {
  return apiRequest("/factories", { token });
}
