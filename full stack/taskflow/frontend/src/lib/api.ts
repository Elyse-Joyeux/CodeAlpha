const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function getToken() {
  return typeof window === "undefined" ? null : localStorage.getItem("t");
}

export function getName() {
  return typeof window === "undefined" ? null : localStorage.getItem("name");
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("t");
  localStorage.removeItem("name");
  localStorage.removeItem("uid");
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String(data.error)
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}
