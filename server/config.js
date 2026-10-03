// Vercel stateless: API key datang dari header request, bukan dari file.

export function getConfigFromReq(req) {
  const h = (req && req.headers) || {};
  return {
    apiKey: h['x-api-key'] || process.env.OPENAI_API_KEY || '',
    baseUrl: h['x-api-base'] || process.env.OPENAI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: h['x-api-model'] || process.env.OPENAI_MODEL || 'gemini-2.5-flash',
    visionModel: h['x-api-vision'] || process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gemini-2.5-flash'
  };
}

export function isAIConfigured(req) {
  const cfg = getConfigFromReq(req);
  return Boolean(cfg.apiKey && cfg.apiKey.trim().length > 10);
}
