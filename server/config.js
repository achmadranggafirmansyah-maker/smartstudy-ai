import fs from 'node:fs';
import path from 'node:path';

const RUNTIME_FILE = path.join(process.cwd(), '.runtime-config.json');

const envDefaults = () => ({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseUrl: process.env.OPENAI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/',
  model: process.env.OPENAI_MODEL || 'gemini-2.5-flash',
  visionModel: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gemini-2.5-flash'
});

let runtime = envDefaults();

try {
  if (fs.existsSync(RUNTIME_FILE)) {
    const saved = JSON.parse(fs.readFileSync(RUNTIME_FILE, 'utf8'));
    runtime = { ...envDefaults(), ...saved };
    if (process.env.OPENAI_API_KEY) runtime.apiKey = process.env.OPENAI_API_KEY;
    if (process.env.OPENAI_BASE_URL) runtime.baseUrl = process.env.OPENAI_BASE_URL;
    if (process.env.OPENAI_MODEL) runtime.model = process.env.OPENAI_MODEL;
    if (process.env.OPENAI_VISION_MODEL) runtime.visionModel = process.env.OPENAI_VISION_MODEL;
  }
} catch (e) {
  console.warn('[config] gagal memuat file runtime:', e.message);
}

export function getConfig() { return { ...runtime }; }

export function setConfig(patch) {
  runtime = { ...runtime, ...patch };
  try {
    fs.writeFileSync(
      RUNTIME_FILE,
      JSON.stringify({
        apiKey: runtime.apiKey,
        baseUrl: runtime.baseUrl,
        model: runtime.model,
        visionModel: runtime.visionModel
      }, null, 2),
      { mode: 0o600 }
    );
  } catch (e) {
    console.warn('[config] gagal menyimpan runtime:', e.message);
  }
  return getConfig();
}

export function clearConfig() {
  runtime = envDefaults();
  try { if (fs.existsSync(RUNTIME_FILE)) fs.unlinkSync(RUNTIME_FILE); } catch {}
  return getConfig();
}

export function isAIConfigured() {
  return Boolean(runtime.apiKey && runtime.apiKey.trim().length > 10);
}
