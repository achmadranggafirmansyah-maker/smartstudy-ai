import { el, toast, escapeHtml } from './ui.js';
import { gradeEssay } from './api.js';
import { bumpStat, pushHistory } from './storage.js';

const DEFAULT_RUBRIC = ['Pemahaman konsep','Ketepatan istilah','Struktur & kejelasan','Kelengkapan argumen'];

export function renderEssay(root) {
  root.innerHTML = '';

  const promptEl = el('textarea', { placeholder: 'Tulis soal atau topik uraian di sini…', 'aria-label': 'Soal uraian', rows: '3' });
  const answerEl = el('textarea', { placeholder: 'Tulis jawabanmu…', 'aria-label': 'Jawaban', rows: '7' });
  const rubricEl = el('textarea', { placeholder: DEFAULT_RUBRIC.join('\n'), 'aria-label': 'Rubrik penilaian (opsional)', rows: '4' }, DEFAULT_RUBRIC.join('\n'));

  const submit = el('button', { class: 'btn primary block' }, '📝 Nilai Jawaban Saya');
  const result = el('div', { 'aria-live': 'polite', style: 'margin-top:14px' });

  const form = el('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      const prompt = promptEl.value.trim();
      const answer = answerEl.value.trim();
      if (!prompt || !answer) { toast('Soal dan jawaban wajib diisi.', 'err'); return; }
      if (answer.length < 20) { toast('Jawaban terlalu pendek. Tulis minimal 20 karakter.', 'err'); return; }

      submit.disabled = true;
      submit.innerHTML = '<span class="loader"></span> Menilai…';
      result.innerHTML = '';
      try {
        const rubric = rubricEl.value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 8);
        const res = await gradeEssay({ prompt, answer, rubric });
        renderFeedback(result, res.data, res.mode);
        bumpStat('essayAttempts');
        pushHistory({ type: 'essay', question: prompt.slice(0, 120), score: res.data.score, title: 'Latihan Uraian' });
      } catch (err) {
        result.appendChild(el('div', { class: 'warn-box' }, 'Gagal menilai: ' + escapeHtml(err.message)));
      } finally {
        submit.disabled = false;
        submit.textContent = '📝 Nilai Jawaban Saya';
      }
    }
  });

  form.appendChild(el('div', { class: 'card' },
    el('h2', {}, '✍️ Latihan Uraian'),
    el('p', { class: 'hint' }, 'Dapatkan umpan balik berbasis rubrik yang transparan.'),
    el('label', {}, 'Soal / Topik'),
    promptEl,
    el('label', { style: 'margin-top:10px;display:block' }, 'Jawabanmu'),
    answerEl,
    el('label', { style: 'margin-top:10px;display:block' }, 'Rubrik (satu per baris, opsional)'),
    rubricEl,
    el('div', { style: 'margin-top:12px' }, submit)
  ));

  root.appendChild(form);
  root.appendChild(result);
}

function renderFeedback(container, data, mode) {
  container.innerHTML = '';
  const badge = mode === 'live' ? el('span', { class: 'chip ok' }, 'AI aktif') : el('span', { class: 'chip' }, 'Mode demo');

  container.appendChild(el('div', { class: 'card' },
    el('div', { style: 'margin-bottom:6px' }, badge),
    el('h2', {}, `Skor: ${data.score}/100`),
    el('div', { class: 'progress' }, el('span', { style: `width:${data.score}%` })),
    el('p', { class: 'hint' }, `Tingkat: ${data.level}`)
  ));

  if (data.rubricBreakdown?.length) {
    const ul = el('ul', { class: 'list' });
    data.rubricBreakdown.forEach(r => {
      ul.appendChild(el('li', {},
        el('div', { style: 'display:flex;justify-content:space-between' },
          el('strong', {}, r.criteria),
          el('span', {}, `${r.score}/100`)),
        el('div', { class: 'hint' }, r.comment)
      ));
    });
    container.appendChild(el('div', { class: 'card' }, el('h3', {}, 'Rincian Rubrik'), ul));
  }

  if (data.strengths?.length) {
    const ul = el('ul', { class: 'list' });
    data.strengths.forEach(s => ul.appendChild(el('li', {}, '✅ ' + s)));
    container.appendChild(el('div', { class: 'card' }, el('h3', {}, 'Kelebihan'), ul));
  }

  if (data.improvements?.length) {
    const ul = el('ul', { class: 'list' });
    data.improvements.forEach(s => ul.appendChild(el('li', {}, '🛠️ ' + s)));
    container.appendChild(el('div', { class: 'card' }, el('h3', {}, 'Saran Perbaikan'), ul));
  }

  if (data.revisedAnswer) {
    container.appendChild(el('div', { class: 'card' },
      el('h3', {}, 'Contoh Jawaban Ideal'),
      el('div', { style: 'white-space:pre-wrap;font-size:14px;line-height:1.6' }, data.revisedAnswer)
    ));
  }

  if (data.disclaimer) {
    container.appendChild(el('div', { class: 'warn-box' }, '⚠️ ' + data.disclaimer));
  }
}
