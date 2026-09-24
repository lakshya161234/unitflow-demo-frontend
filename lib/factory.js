import { apiRequest } from "./api";
import { getToken } from "./auth";

export async function factoryRequest(path, options = {}) {
  const token = getToken();

  return apiRequest(path, {
    ...options,
    token,
  });
}
