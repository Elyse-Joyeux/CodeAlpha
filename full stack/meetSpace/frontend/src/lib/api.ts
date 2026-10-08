export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const getToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem("t");

export const getName = () =>
  typeof window === "undefined" ? null : localStorage.getItem("name");

export async function api<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const r = await fetch(API + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + getToken(),
      ...init.headers,
    },
  });

  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Request failed");

  return d;
}
