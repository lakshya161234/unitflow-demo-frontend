// import { apiRequest } from "./api";

// const TOKEN_KEY = "token";

// export function getToken() {
//   if (typeof window === "undefined") return null;
//   return localStorage.getItem(TOKEN_KEY);
// }

// export function setToken(token) {
//   localStorage.setItem(TOKEN_KEY, token);
// }

// export function clearToken() {
//   localStorage.removeItem(TOKEN_KEY);
// }

// export async function login(email, password) {
//   const data = await apiRequest("/auth/login", {
//     method: "POST",
//     body: { email, password }, // ✅ NO stringify here
//   });

//   setToken(data.token);
//   return data;
// }

// export async function fetchMe() {
//   const token = getToken();
//   if (!token) throw new Error("No token");

//   return apiRequest("/auth/me");
// }






import { apiRequest } from "./api";

const TOKEN_KEY = "token";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(email, password) {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    body: { email, password },
  });

  setToken(data.token);
  return data;
}

export async function fetchMe() {
  return apiRequest("/auth/me");
}


export function requestForgotPasswordOtp(email) {
  return apiRequest("/auth/forgot-password/request-otp", { method: "POST", body: { email } });
}

export function resetForgotPassword(email, otp, new_password) {
  return apiRequest("/auth/forgot-password/reset", { method: "POST", body: { email, otp, new_password } });
}
