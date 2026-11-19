import { API_BASE } from "./config.js";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers: { Accept: "application/json", ...(options.headers || {}) } });
  } catch (err) {
    throw new ApiError("Cannot reach the store server. Check your connection and try again.", 0, null);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) throw new ApiError(firstError(data) || `Request failed (${res.status})`, res.status, data);
  return data;
}

// Flatten DRF error payloads into one readable sentence.
export function firstError(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return firstError(data[0]);
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  for (const [key, value] of Object.entries(data)) {
    const msg = firstError(value);
    if (msg) return key === "non_field_errors" || key === "items" ? msg : `${labelFor(key)}: ${msg}`;
  }
  return "";
}

function labelFor(key) {
  return key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  upload: (path, formData) => request(path, { method: "POST", body: formData }),
};

export function money(value) {
  const n = Number(value || 0);
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: n % 1 ? 2 : 0 });
}
