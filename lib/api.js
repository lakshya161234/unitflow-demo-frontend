function getDesktopRuntimeBaseUrl() {
  if (typeof window === "undefined") return null;
  return window.UnitFlowDesktop?.runtimeConfig?.apiBaseUrl || null;
}

export function resolveBaseUrl() {
  return (
    getDesktopRuntimeBaseUrl() ||
    process.env.API_BASE_URL ||
    "http://localhost:4000"
  );
}

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function getActiveFactoryId() {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("active_factory");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.id || null;
  } catch {
    return null;
  }
}

export async function apiRequest(path, options = {}) {
  const token = getToken();
  const responseType = options.responseType || options.parseAs || "json";

  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let res;
  try {
    res = await fetch(`${resolveBaseUrl()}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error("Network error. Please try again.");
  }

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    throw new Error("Session expired");
  }

  if (res.status === 403) {
    throw new Error("You do not have permission to perform this action.");
  }

  if (!res.ok) {
    let msg = "Something went wrong";
    let errorPayload = null;
    try {
      errorPayload = await res.json();
      msg = errorPayload?.message || msg;
    } catch {
      try {
        const text = await res.text();
        if (text) msg = text;
      } catch {}
    }
    const err = new Error(msg);
    if (errorPayload && typeof errorPayload === "object") Object.assign(err, errorPayload);
    err.status = res.status;
    throw err;
  }

  if (responseType === "blob") {
    return await res.blob();
  }

  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function factoryApiRequest(path, options = {}) {
  const factoryId = options.factoryId || getActiveFactoryId();
  const headers = {
    ...(factoryId ? { "X-Factory-Id": factoryId } : {}),
    ...(options.headers || {}),
  };
  return apiRequest(path, { ...options, headers });
}
