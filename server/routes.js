import express from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { askTutor, gradeEssay } from './services/ai.js';
import { getConfig, setConfig, clearConfig, isAIConfigured } from './config.js';

export const router = express.Router();

export const aiLimiter = rateLimit({
  windowMs: Number(process.env.AI_RATE_WINDOW_MIN || 15) * 60 * 1000,
  max: Number(process.env.AI_RATE_MAX_REQ || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Terlalu banyak permintaan. Coba lagi beberapa menit.' }
});

const MAX_BYTES = Number(process.env.MAX_IMAGE_BYTES || 5 * 1024 * 1024);
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      const e = new Error('Format gambar harus JPEG, PNG, atau WEBP.');
      e.status = 400;
      e.publicMessage = e.message;
      return cb(e);
    }
    cb(null, true);
  }
});

function sanitizeText(input, max = 4000) {
  if (typeof input !== 'string') return '';
  return input.replace(/\u0000/g, '').trim().slice(0, max);
}

function requireAI(_req, res, next) {
  if (!isAIConfigured()) {
    return res.status(412).json({
      ok: false,
      error: 'API key belum dikonfigurasi. Masukkan API key terlebih dahulu.'
    });
  }
  next();
}

router.get('/health', (_req, res) => {
  res.json({ ok: true, ai: isAIConfigured() ? 'live' : 'locked', ts: Date.now() });
});

router.get('/config', (_req, res) => {
  const cfg = getConfig();
  res.json({
    ok: true,
    configured: isAIConfigured(),
    baseUrl: cfg.baseUrl,
    model: cfg.model,
    visionModel: cfg.visionModel
  });
});

router.post('/config', (req, res) => {
  const apiKey = sanitizeText(req.body?.apiKey, 400);
  const baseUrl = sanitizeText(req.body?.baseUrl, 300);
  const model = sanitizeText(req.body?.model, 100);
  const visionModel = sanitizeText(req.body?.visionModel, 100);

  if (!apiKey || apiKey.length < 10) {
    return res.status(400).json({ ok: false, error: 'API key tidak valid (terlalu pendek).' });
  }
  if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
    return res.status(400).json({ ok: false, error: 'Base URL harus dimulai dengan http(s)://.' });
  }

  setConfig({
    apiKey,
    ...(baseUrl && { baseUrl }),
    ...(model && { model }),
    ...(visionModel && { visionModel })
  });

  res.json({ ok: true, ai: 'live' });
});

router.delete('/config', (_req, res) => {
  clearConfig();
  res.json({ ok: true, ai: isAIConfigured() ? 'live' : 'locked' });
});

router.post('/tutor', requireAI, upload.single('image'), async (req, res, next) => {
  try {
    const question = sanitizeText(req.body?.question, 2000);
    const imageDataUrl = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
      : null;

    if (!question && !imageDataUrl) {
      return res.status(400).json({ ok: false, error: 'Kirim pertanyaan teks atau unggah gambar soal.' });
    }

    const result = await askTutor({ question, imageDataUrl });
    res.json({ ok: true, data: result });
  } catch (err) { next(err); }
});

router.post('/essay', requireAI, async (req, res, next) => {
  try {
    const prompt = sanitizeText(req.body?.prompt, 1000);
    const answer = sanitizeText(req.body?.answer, 4000);
    const rubric = Array.isArray(req.body?.rubric)
      ? req.body.rubric.map(r => sanitizeText(String(r), 200)).slice(0, 8)
      : undefined;

    if (!prompt || !answer) {
      return res.status(400).json({ ok: false, error: 'Soal dan jawaban wajib diisi.' });
    }

    const result = await gradeEssay({ prompt, answer, rubric });
    res.json({ ok: true, data: result });
  } catch (err) { next(err); }
});
