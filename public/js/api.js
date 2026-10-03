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

// Simpan config ke localStorage (client-side, stateless).
// Tidak ada request ke server.
export async function saveConfig({ apiKey, baseUrl, model, visionModel }) {
  if (!apiKey || apiKey.length < 10) {
    throw new Error('API key terlalu pendek.');
  }
  setStoredKey({
    apiKey,
    baseUrl: baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: model || 'gemini-2.5-flash',
    visionModel: visionModel || model || 'gemini-2.5-flash'
  });
  return { ok: true, ai: 'live' };
}

// Hapus config dari localStorage
export async function clearConfig() {
  clearStoredKey();
  return { ok: true, ai: 'locked' };
}

// Health: cek dari localStorage
export async function getHealth() {
  const stored = getStoredKey();
  if (!stored?.apiKey || stored.apiKey.length < 10) {
    return { ok: true, ai: 'locked' };
  }
  return { ok: true, ai: 'live' };
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
