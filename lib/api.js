const BASE = '/api'; // same app, no separate server

export async function api(path, { method = 'GET', body } = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth')) {
    localStorage.clear();
    window.location.href = '/login';
  }
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}
