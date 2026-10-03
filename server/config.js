// Vercel stateless: API key datang dari header request, bukan dari file.

export function getConfigFromReq(req) {
  const headerKey = req.headers['x-api-key'] || '';
  const headerBase = req.headers['x-api-base'] || '';
  const headerModel = req.headers['x-api-model'] || '';
  const headerVision = req.headers['x-api-vision'] || '';

  return {
    apiKey: headerKey || process.env.OPENAI_API_KEY || '',
    baseUrl: headerBase || process.env.OPENAI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: headerModel || process.env.OPENAI_MODEL || 'gemini-2.5-flash',
    visionModel: headerVision || process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gemini-2.5-flash'
  };
}

export function isAIConfigured(req) {
  const cfg = getConfigFromReq(req || { headers: {} });
  return Boolean(cfg.apiKey && cfg.apiKey.trim().length > 10);
}
