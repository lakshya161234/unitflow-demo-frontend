const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export async function apiRequest(
  endpoint,
  { method = "GET", body, token } = {}
) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (res.status === 403) throw new Error("FORBIDDEN");

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");

  return data;
}
