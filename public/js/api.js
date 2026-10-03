const KEY_STORAGE = 'smartstudy:apikey';

export function getStoredKey() {
  try {
    const raw = localStorage.getItem(KEY_STORAGE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function setStoredKey(cfg) {
  try { localStorage.setItem(KEY_STORAGE, JSON.stringify(cfg)); } catch {}
}

export function clearStoredKey() {
  try { localStorage.removeItem(KEY_STORAGE); } catch {}
}

async function request(path, options = {}) {
  const stored = getStoredKey();
  const headers = { ...(options.headers || {}) };
  if (stored?.apiKey) {
    headers['X-API-Key'] = stored.apiKey;
    if (stored.baseUrl) headers['X-API-Base'] = stored.baseUrl;
    if (stored.model) headers['X-API-Model'] = stored.model;
    if (stored.visionModel) headers['X-API-Vision'] = stored.visionModel;
  }

  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const res = await fetch(path, { ...options, headers, signal: ctrl.signal });
    const ct = res.headers.get('content-type') || '';
    const isJson = ct.includes('application/json');
    const body = isJson ? await res.json() : { ok: false, error: await res.text() };
    if (!res.ok || body.ok === false) {
      const err = new Error(body.error || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return body;
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error('Permintaan melebihi batas waktu. Coba lagi.');
      err.status = 408; throw err;
    }
    throw e;
  } finally { clearTimeout(to); }
}

export async function getHealth() {
  const stored = getStoredKey();
  // Di Vercel stateless, health hanya cek apakah key ada di browser.
  if (!stored?.apiKey || stored.apiKey.length < 10) {
    return { ok: true, ai: 'locked' };
  }
  // Verifikasi ke server sekali
  try {
    const res = await fetch('/api/health', {
      headers: { 'X-API-Key': stored.apiKey }
    });
    const data = await res.json();
    return data;
  } catch {
    return { ok: true, ai: 'live' };
  }
}

export async function askTutor({ question, imageFile }) {
  const fd = new FormData();
  if (question) fd.append('question', question);
  if (imageFile) fd.append('image', imageFile);
  return request('/api/tutor', { method: 'POST', body: fd });
}

export async function gradeEssay({ prompt, answer, rubric }) {
  return request('/api/essay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, answer, rubric })
  });
}
