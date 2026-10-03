import { el, toast, escapeHtml } from './ui.js';
import { askTutor } from './api.js';
import { bumpStat, pushHistory } from './storage.js';

let lastImageFile = null;

export function renderTutor(root) {
  lastImageFile = null;
  root.innerHTML = '';

  const card = el('div', { class: 'card' },
    el('h2', {}, '🤖 Tutor AI'),
    el('p', { class: 'hint' }, 'Ajukan pertanyaan teks atau unggah foto soal. Penjelasan disusun langkah demi langkah.')
  );

  const ta = el('textarea', {
    id: 'tutorQ',
    placeholder: 'Contoh: Jelaskan cara menyelesaikan persamaan 2x + 5 = 17',
    'aria-label': 'Pertanyaan untuk tutor AI'
  });

  const fileInput = el('input', {
    type: 'file', accept: 'image/jpeg,image/png,image/webp', id: 'tutorImg', hidden: 'hidden'
  });

  const drop = el('div', {
    class: 'file-drop', role: 'button', tabindex: '0',
    onclick: () => fileInput.click(),
    onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } }
  }, '📷 Ketuk untuk unggah / ambil foto soal (JPEG/PNG/WEBP, maks 5 MB)');

  const preview = el('div', { style: 'margin-top:10px' });

  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    if (!['image/jpeg','image/png','image/webp'].includes(f.type)) {
      toast('Format gambar harus JPEG, PNG, atau WEBP.', 'err'); fileInput.value = ''; return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast('Ukuran gambar maksimal 5 MB.', 'err'); fileInput.value = ''; return;
    }
    lastImageFile = f;
    preview.innerHTML = '';
    const url = URL.createObjectURL(f);
    preview.appendChild(el('img', { src: url, class: 'img-preview', alt: 'Pratinjau gambar soal' }));
    preview.appendChild(el('div', { class: 'hint' }, `${f.name} · ${(f.size/1024).toFixed(0)} KB · `));
    preview.appendChild(el('button', {
      class: 'btn ghost', style: 'margin-left:6px;padding:4px 10px;font-size:12px',
      onclick: () => { lastImageFile = null; fileInput.value = ''; preview.innerHTML = ''; }
    }, 'Hapus gambar'));
  });

  const submit = el('button', { class: 'btn primary block', type: 'submit' }, '✨ Minta Penjelasan');
  const result = el('div', { id: 'tutorResult', 'aria-live': 'polite' });

  const form = el('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      const q = ta.value.trim();
      if (!q && !lastImageFile) { toast('Isi pertanyaan atau unggah gambar.', 'err'); return; }
      submit.disabled = true;
      submit.innerHTML = '<span class="loader"></span> Memproses…';
      result.innerHTML = '';
      try {
        const res = await askTutor({ question: q, imageFile: lastImageFile });
        renderResult(result, res.data, res.mode);
        bumpStat('tutorSessions');
        pushHistory({ type: 'tutor', question: q || '(gambar soal)', title: res.data.title, mode: res.mode });
      } catch (err) {
        result.appendChild(el('div', { class: 'warn-box' },
          `Gagal memproses: ${escapeHtml(err.message || 'kesalahan tidak diketahui')}`));
      } finally {
        submit.disabled = false;
        submit.textContent = '✨ Minta Penjelasan';
      }
    }
  });

  card.appendChild(ta);
  card.appendChild(el('div', { style: 'margin-top:10px' }, drop));
  card.appendChild(fileInput);
  card.appendChild(preview);
  card.appendChild(el('div', { style: 'margin-top:12px' }, submit));

  root.appendChild(card);
  root.appendChild(result);
}

function renderResult(container, data, mode) {
  container.innerHTML = '';
  const badge = mode === 'live'
    ? el('span', { class: 'chip ok' }, 'AI aktif')
    : el('span', { class: 'chip' }, 'Mode demo');

  container.appendChild(el('div', { class: 'card' },
    el('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:6px' }, badge),
    el('h2', {}, escapeHtml(data.title || 'Penjelasan')),
    el('p', { class: 'hint' }, escapeHtml(data.summary || ''))
  ));

  if (data.steps?.length) {
    const ul = el('ul', { class: 'step-list' });
    data.steps.forEach(s => ul.appendChild(el('li', { html: escapeHtml(s) })));
    container.appendChild(el('div', { class: 'card' }, el('h3', {}, 'Langkah Penyelesaian'), ul));
  }

  if (data.answer) {
    container.appendChild(el('div', { class: 'card' },
      el('h3', {}, 'Jawaban'),
      el('div', { style: 'font-size:15px;line-height:1.5', html: escapeHtml(data.answer) })
    ));
  }

  if (data.tips?.length) {
    const ul = el('ul', { class: 'list' });
    data.tips.forEach(t => ul.appendChild(el('li', {}, '💡 ' + t)));
    container.appendChild(el('div', { class: 'card' }, el('h3', {}, 'Tips Belajar'), ul));
  }

  if (data.disclaimer) {
    container.appendChild(el('div', { class: 'warn-box' }, '⚠️ ' + escapeHtml(data.disclaimer)));
  }
}
