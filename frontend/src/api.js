const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

export async function api(path, { token, method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error(`Tidak dapat terhubung ke server. Pastikan backend berjalan di ${API_URL}.`);
  }

  if (response.status === 204) return null;
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || 'Permintaan gagal. Silakan coba lagi.');
  return result;
}

export const formatRupiah = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

export const formatDate = (value) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(`${value}Z`));
