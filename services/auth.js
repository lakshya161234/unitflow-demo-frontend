import { apiRequest } from "./api";

export function login(email, password) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function getProfile(token) {
  return apiRequest("/auth/me", { token });
}
