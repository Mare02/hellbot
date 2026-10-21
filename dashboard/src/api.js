export async function api(path, options = {}) {
  const { body, ...rest } = options;
  const response = await fetch(`/api${path}`, {
    credentials: 'omit',
    ...rest,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...rest.headers,
      'X-Hellbot-Request': 'dashboard',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (rest.signal?.aborted) throw new DOMException('Request aborted.', 'AbortError');
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status}).`);
    error.issues = data.issues;
    throw error;
  }
  return data;
}

export function queryString(values) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value === '' || value === undefined || value === null) return;
    if (['from', 'to'].includes(key) && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const boundary = new Date(`${value}T${key === 'from' ? '00:00:00.000' : '23:59:59.999'}`);
      query.set(key, boundary.toISOString());
    } else {
      query.set(key, String(value));
    }
  });
  return query.toString();
}

export function changedFields(original, current) {
  const patch = {};
  Object.entries(current).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = changedFields(original?.[key] || {}, value);
      if (Object.keys(nested).length) patch[key] = nested;
    } else if (JSON.stringify(original?.[key]) !== JSON.stringify(value)) {
      patch[key] = value;
    }
  });
  return patch;
}

export function dateLabel(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export function mergeApplication(previous = [], incoming = []) {
  const updates = new Map(previous.map((item) => [item.profile, item]));
  incoming.forEach((item) => updates.set(item.profile, item));
  return [...updates.values()];
}
