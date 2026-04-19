const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

async function request<T>(
  method: string,
  path: string,
  options: { params?: Record<string, string>; body?: unknown } = {}
): Promise<T> {
  let url = `${BASE_URL}${path}`;
  if (options.params) {
    url += `?${new URLSearchParams(options.params)}`;
  }

  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
}

export const api = {
  get: <T>(path: string, params?: Record<string, string>) =>
    request<T>('GET', path, { params }),
  post: <T = void>(path: string, body?: unknown) =>
    request<T>('POST', path, { body }),
  put: <T = void>(path: string, body?: unknown) =>
    request<T>('PUT', path, { body }),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
};
