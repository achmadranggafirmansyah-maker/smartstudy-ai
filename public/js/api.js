async function request(path, options = {}) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const res = await fetch(path, { ...options, signal: ctrl.signal });
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
  try { return await request('/api/health'); }
  catch { return { ok: false, ai: 'unknown' }; }
}

export async function saveConfig({ apiKey, baseUrl, model, visionModel }) {
  return request('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, baseUrl, model, visionModel })
  });
}

export async function clearConfig() {
  return request('/api/config', { method: 'DELETE' });
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
