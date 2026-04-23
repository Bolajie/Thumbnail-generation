const API_BASE = '/api';

export async function generateThumbnails(payload) {
  const res = await fetch(`${API_BASE}/generate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw data;
  }

  return data;
}
