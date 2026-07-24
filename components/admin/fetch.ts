export function errorMessage(data: unknown, fallback: string) {
  return data &&
    typeof data === "object" &&
    "error" in data &&
    typeof data.error === "string"
    ? data.error
    : fallback;
}

export async function adminFetch(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  payload?: unknown,
  fallback = "操作失败，请稍后重试。",
) {
  const response = await fetch(path, {
    method,
    headers: payload ? { "content-type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(errorMessage(data, fallback));
}
