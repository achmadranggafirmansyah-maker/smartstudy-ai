import { getConfigFromReq } from '../config.js';

async function callChat(req, { model, messages, jsonMode = true, maxTokens = 900 }) {
  const cfg = getConfigFromReq(req);
  if (!cfg.apiKey) {
    const e = new Error('API key belum dikonfigurasi');
    e.status = 412;
    e.publicMessage = 'API key belum dikonfigurasi.';
    throw e;
  }

  const body = { model: model || cfg.model, messages, temperature: 0.3, max_tokens: maxTokens };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 60_000);

  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const e = new Error(`AI provider error ${res.status}: ${errText.slice(0, 200)}`);
      e.status = 502;
      e.publicMessage = res.status === 401
        ? 'API key ditolak oleh penyedia AI.'
        : res.status === 429
        ? 'Kuota AI habis. Tunggu sebentar atau ganti model.'
        : 'Layanan AI sedang tidak tersedia.';
      throw e;
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content || '{}';
    try { return JSON.parse(content); }
    catch { return { raw: content }; }
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('AI timeout');
      e.status = 504;
      e.publicMessage = 'Permintaan ke AI melebihi batas waktu.';
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

const TUTOR_SYSTEM = `Kamu adalah "SmartStudy AI", tutor belajar untuk pelajar Indonesia.
Aturan:
- Gunakan bahasa Indonesia yang sederhana dan ramah.
- Jelaskan konsep langkah demi langkah (maksimum 6 langkah).
- Jika soal matematika/fisika/kimia, tunjukkan rumus dan perhitungan.
- Sertakan 1-3 tips belajar singkat.
- Ingatkan di akhir bahwa jawaban AI bisa salah dan perlu diperiksa.
Balas HANYA dalam JSON valid dengan skema:
{
  "title": "judul singkat",
  "summary": "ringkasan 1-2 kalimat",
  "steps": ["langkah 1", "..."],
  "answer": "jawaban akhir",
  "tips": ["tips 1", "..."],
  "disclaimer": "Jawaban AI dapat keliru. Periksa kembali dengan sumber resmi."
}`;

export async function askTutor(req, { question, imageDataUrl }) {
  const cfg = getConfigFromReq(req);
  const userContent = [];
  userContent.push({
    type: 'text',
    text: question || 'Baca soal pada gambar berikut dan jelaskan penyelesaiannya.'
  });
  if (imageDataUrl) userContent.push({ type: 'image_url', image_url: { url: imageDataUrl } });

  const data = await callChat(req, {
    model: imageDataUrl ? cfg.visionModel : cfg.model,
    messages: [
      { role: 'system', content: TUTOR_SYSTEM },
      { role: 'user', content: userContent }
    ]
  });

  return normalizeTutor(data);
}

function normalizeTutor(data) {
  if (data?.raw) {
    return {
      title: 'Penjelasan',
      summary: data.raw.slice(0, 240),
      steps: [data.raw],
      answer: '-',
      tips: [],
      disclaimer: 'Jawaban AI dapat keliru. Periksa kembali dengan sumber resmi.'
    };
  }
  return {
    title: String(data.title || 'Penjelasan'),
    summary: String(data.summary || ''),
    steps: Array.isArray(data.steps) ? data.steps.map(String).slice(0, 8) : [],
    answer: String(data.answer || '-'),
    tips: Array.isArray(data.tips) ? data.tips.map(String).slice(0, 5) : [],
    disclaimer: String(data.disclaimer || 'Jawaban AI dapat keliru. Periksa kembali dengan sumber resmi.')
  };
}

const ESSAY_SYSTEM = `Kamu adalah penilai latihan uraian untuk pelajar Indonesia.
Nilai jawaban berdasarkan rubrik. Bersikap adil, konstruktif, dan jelas.
Balas HANYA dalam JSON valid dengan skema:
{
  "score": 0-100,
  "level": "Perlu latihan" | "Cukup" | "Baik" | "Sangat baik",
  "rubricBreakdown": [{ "criteria": "...", "score": 0-100, "comment": "..." }],
  "strengths": ["..."],
  "improvements": ["..."],
  "revisedAnswer": "contoh jawaban ideal singkat",
  "disclaimer": "Penilaian AI bersifat indikatif."
}`;

export async function gradeEssay(req, { prompt, answer, rubric }) {
  const rubricList = (rubric && rubric.length ? rubric : [
    'Pemahaman konsep', 'Ketepatan istilah', 'Struktur & kejelasan', 'Kelengkapan argumen'
  ]);
  const userMsg = `Soal:\n${prompt}\n\nRubrik:\n- ${rubricList.join('\n- ')}\n\nJawaban siswa:\n${answer}`;

  const data = await callChat(req, {
    messages: [
      { role: 'system', content: ESSAY_SYSTEM },
      { role: 'user', content: userMsg }
    ]
  });

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  return {
    score: clamp(Number(data.score) || 0, 0, 100),
    level: String(data.level || '-'),
    rubricBreakdown: Array.isArray(data.rubricBreakdown)
      ? data.rubricBreakdown.slice(0, 8).map(r => ({
          criteria: String(r.criteria || '-'),
          score: clamp(Number(r.score) || 0, 0, 100),
          comment: String(r.comment || '')
        }))
      : [],
    strengths: Array.isArray(data.strengths) ? data.strengths.map(String).slice(0, 6) : [],
    improvements: Array.isArray(data.improvements) ? data.improvements.map(String).slice(0, 6) : [],
    revisedAnswer: String(data.revisedAnswer || ''),
    disclaimer: String(data.disclaimer || 'Penilaian AI bersifat indikatif.')
  };
}
