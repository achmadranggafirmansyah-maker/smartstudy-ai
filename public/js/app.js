import { el, $$, toast, escapeHtml } from './ui.js';
import { getHealth, setStoredKey, getStoredKey } from './api.js';
import { getStats } from './storage.js';
import { renderTutor } from './tutor.js';
import { renderQuiz } from './quiz.js';
import { renderEssay } from './essay.js';
import { renderSettings } from './settings.js';
import { evaluate, FORMULAS, runFormula } from './calc.js';

const routes = {
  '#/dashboard': renderDashboard,
  '#/tutor': renderTutor,
  '#/quiz': renderQuiz,
  '#/essay': renderEssay,
  '#/calc': renderCalc,
  '#/history': renderHistory,
  '#/settings': renderSettings
};

const main = document.getElementById('main');
const menuBtn = document.getElementById('menuBtn');
const sidenav = document.getElementById('sidenav');

const appState = { aiReady: false, checking: true };

function closeMenu() {
  sidenav.classList.remove('open');
  sidenav.setAttribute('aria-hidden', 'true');
  menuBtn.setAttribute('aria-expanded', 'false');
}
menuBtn?.addEventListener('click', () => {
  const open = sidenav.classList.toggle('open');
  sidenav.setAttribute('aria-hidden', String(!open));
  menuBtn.setAttribute('aria-expanded', String(open));
});
document.addEventListener('click', (e) => {
  if (window.innerWidth < 900 && sidenav.classList.contains('open') &&
      !sidenav.contains(e.target) && e.target !== menuBtn && !menuBtn.contains(e.target)) {
    closeMenu();
  }
});

function updateModeBadge(ai) {
  const b = document.getElementById('modeBadge');
  if (ai === 'live') { b.textContent = 'AI aktif'; b.className = 'mode-badge live'; }
  else if (ai === 'locked') { b.textContent = 'Terkunci'; b.className = 'mode-badge demo'; }
  else { b.textContent = 'Offline'; b.className = 'mode-badge'; }
}

function setActiveNav(hash) {
  $$('[data-nav]').forEach(a => a.classList.toggle('active', a.getAttribute('href') === hash));
}

function navigate() {
  if (!appState.aiReady) { renderOnboarding(main); return; }
  const hash = location.hash || '#/dashboard';
  const handler = routes[hash] || renderDashboard;
  main.innerHTML = '';
  handler(main);
  setActiveNav(hash);
  window.scrollTo(0, 0);
  closeMenu();
}

window.addEventListener('hashchange', () => {
  if (!appState.aiReady && location.hash && location.hash !== '#/') {
    location.hash = '';
    renderOnboarding(main);
    return;
  }
  navigate();
});

function renderOnboarding(root) {
  root.innerHTML = '';
  sidenav.setAttribute('aria-hidden', 'true');

  const apiKeyInput = el('input', { type: 'password', id: 'onboardKey', placeholder: 'AIzaSy...', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'API Key' });
  const baseUrlInput = el('input', { type: 'text', id: 'onboardBaseUrl', placeholder: 'https://generativelanguage.googleapis.com/v1beta/openai/', 'aria-label': 'Base URL' });
  const modelInput = el('input', { type: 'text', id: 'onboardModel', placeholder: 'gemini-2.5-flash', 'aria-label': 'Model' });

  const advanced = el('details', { style: 'margin-top:10px' },
    el('summary', { style: 'cursor:pointer;font-size:13px;color:var(--muted)' }, 'Pengaturan lanjutan (opsional)'),
    el('div', { style: 'margin-top:8px' },
      el('label', {}, 'Base URL'), baseUrlInput,
      el('label', { style: 'margin-top:8px;display:block' }, 'Model Teks'), modelInput
    )
  );

  const submit = el('button', { class: 'btn primary block', type: 'submit' }, '🔓 Aktifkan Sekarang');
  const errorBox = el('div', { 'aria-live': 'polite' });

  const form = el('form', {
    onsubmit: async (e) => {
  e.preventDefault();
  const apiKey = apiKeyInput.value.trim();
  if (apiKey.length < 10) { toast('API key terlalu pendek.', 'err'); return; }

  submit.disabled = true;
  submit.innerHTML = '<span class="loader"></span> Memverifikasi…';
  errorBox.innerHTML = '';

  try {
    const cfg = {
      apiKey,
      baseUrl: baseUrlInput.value.trim() || 'https://generativelanguage.googleapis.com/v1beta/openai/',
      model: modelInput.value.trim() || 'gemini-2.5-flash',
      visionModel: modelInput.value.trim() || 'gemini-2.5-flash'
    };
    setStoredKey(cfg);

    // Verifikasi: kirim satu request uji ke server
    const testRes = await fetch('/api/health', {
      headers: { 'X-API-Key': cfg.apiKey }
    });
    const testData = await testRes.json();

    if (testData.ai === 'live' || testData.ok) {
      appState.aiReady = true;
      updateModeBadge('live');
      toast('Aktivasi berhasil. Selamat belajar!', 'ok');
      location.hash = '#/dashboard';
      navigate();
    } else {
      throw new Error('Server belum siap menerima key. Coba lagi.');
    }
  } catch (err) {
    const msg = err.message || 'Gagal mengaktifkan.';
    errorBox.appendChild(el('div', { class: 'warn-box', style: 'margin-top:12px' }, '❌ ' + escapeHtml(msg)));
    toast('Aktivasi gagal.', 'err');
  } finally {
    submit.disabled = false;
    submit.textContent = '🔓 Aktifkan Sekarang';
  }
}
  },
    el('label', { for: 'onboardKey' }, 'API Key'),
    apiKeyInput,
    advanced,
    el('div', { style: 'margin-top:14px' }, submit),
    errorBox
  );

  const card = el('div', { class: 'card onboarding', role: 'region', 'aria-label': 'Aktivasi aplikasi' },
    el('div', { class: 'onboard-icon' }, '🔐'),
    el('h1', { style: 'margin:8px 0 6px;font-size:22px' }, 'Aktivasi SmartStudy AI'),
    el('p', { class: 'hint', style: 'margin-top:0' }, 'Masukkan API key untuk membuka seluruh fitur. Key hanya tersimpan di server Anda sendiri.'),
    el('div', { class: 'warn-box', style: 'margin:12px 0' }, '⚠️ Jangan bagikan API key Anda. Aplikasi ini hanya untuk penggunaan pribadi.'),
    el('div', { style: 'margin-bottom:12px' },
      el('a', { href: 'https://aistudio.google.com/app/apikey', target: '_blank', rel: 'noopener noreferrer', class: 'link', style: 'color:var(--purple-600);font-weight:600' }, 'Belum punya API key Gemini? Ambil gratis di Google AI Studio →')
    ),
    form
  );

  root.appendChild(card);
}

async function bootstrap() {
  const stored = getStoredKey();
  if (stored?.apiKey) {
    appState.aiReady = true;
    updateModeBadge('live');
    navigate();
  } else {
    appState.aiReady = false;
    updateModeBadge('locked');
    renderOnboarding(main);
  }
}
window.addEventListener('DOMContentLoaded', bootstrap);



function renderDashboard(root) {
  const stats = getStats();
  const pct = stats.quizTotal ? Math.round((stats.quizCorrect / stats.quizTotal) * 100) : 0;

  root.append(
    el('div', { class: 'card' },
      el('h2', {}, '👋 Selamat belajar!'),
      el('p', { class: 'hint' }, 'SmartStudy AI membantu Anda memahami materi dengan penjelasan bertahap.')
    ),
    el('div', { class: 'grid cols-2' },
      statBox('Sesi Tutor', stats.tutorSessions || 0, false),
      statBox('Akurasi Kuis', pct + '%', true),
      statBox('Latihan Kuis', stats.quizAttempts || 0, false),
      statBox('Latihan Uraian', stats.essayAttempts || 0, true)
    ),
    el('div', { class: 'card' },
      el('h2', {}, '🚀 Mulai Cepat'),
      el('div', { class: 'btn-row' },
        el('a', { href: '#/tutor', class: 'btn primary' }, '🤖 Tanya Tutor'),
        el('a', { href: '#/quiz', class: 'btn mint' }, '📝 Latihan Kuis'),
        el('a', { href: '#/essay', class: 'btn ghost' }, '✍️ Latihan Uraian'),
        el('a', { href: '#/calc', class: 'btn ghost' }, '🧮 Kalkulator'))
    )
  );
}

function statBox(label, value, mint) {
  return el('div', { class: 'stat' + (mint ? ' mint' : '') },
    el('div', { class: 'label' }, label),
    el('div', { class: 'value' }, String(value)));
}

function renderCalc(root) {
  root.innerHTML = '';
  const display = el('input', { type: 'text', placeholder: 'Contoh: (2+3)^2 / 5 atau sqrt(16)+log(100)', 'aria-label': 'Ekspresi matematika' });
  const out = el('div', { class: 'card', style: 'margin-top:12px;min-height:52px;font-size:18px;font-weight:700' }, '—');

  const calcBtn = el('button', { class: 'btn primary block', style: 'margin-top:8px' }, '🟰 Hitung');
  calcBtn.addEventListener('click', () => {
    try { out.textContent = '= ' + Number(evaluate(display.value).toFixed(10)); }
    catch (err) { out.textContent = '⚠️ ' + err.message; }
  });

  const card = el('div', { class: 'card' },
    el('h2', {}, '🧮 Kalkulator Matematika'),
    el('p', { class: 'hint' }, 'Mendukung + - * / ^ (), fungsi sin/cos/tan/sqrt/log/ln/abs, konstanta pi dan e.'),
    display, calcBtn, out
  );

  const fCard = el('div', { class: 'card' }, el('h2', {}, '📐 Pembantu Rumus'));
  FORMULAS.forEach(f => {
    const inputs = {};
    const row = el('div', { style: 'margin-bottom:10px' });
    row.appendChild(el('strong', {}, f.name));
    row.appendChild(el('div', { class: 'hint' }, f.expr));
    const vars = el('div', { style: 'display:flex;gap:6px;margin-top:6px;flex-wrap:wrap' });
    f.vars.forEach(v => {
      const inp = el('input', { type: 'number', placeholder: v, style: 'max-width:100px', 'aria-label': v });
      inputs[v] = inp;
      vars.appendChild(inp);
    });
    const btn = el('button', { class: 'btn ghost', style: 'padding:6px 12px;font-size:12px' }, 'Hitung');
    const res = el('span', { class: 'chip', style: 'margin-left:8px' }, '—');
    btn.addEventListener('click', () => {
      try {
        const values = {};
        for (const v of f.vars) values[v] = inputs[v].value;
        res.textContent = '= ' + Number(runFormula(f, values).toFixed(6));
      } catch (err) { res.textContent = '⚠️ ' + err.message; }
    });
    vars.append(btn, res);
    row.appendChild(vars);
    fCard.appendChild(row);
  });

  root.append(card, fCard);
}

function renderHistory(root) {
  root.innerHTML = '';
  let list = [];
  try { list = JSON.parse(localStorage.getItem('smartstudy:history') || '[]'); } catch {}

  const card = el('div', { class: 'card' },
    el('h2', {}, '📚 Riwayat Aktivitas'),
    el('p', { class: 'hint' }, 'Menampilkan hingga 100 aktivitas terbaru.')
  );

  if (!list.length) {
    root.appendChild(card);
    root.appendChild(el('div', { class: 'empty' }, 'Belum ada riwayat. Mulai latihan untuk melihat riwayat di sini.'));
    return;
  }

  const ul = el('ul', { class: 'list' });
  list.forEach(item => {
    const date = new Date(item.ts).toLocaleString('id-ID');
    let detail = '';
    if (item.type === 'quiz') detail = `Skor: ${item.correct}/${item.total} (${item.pct}%)`;
    if (item.type === 'essay') detail = `Skor: ${item.score}/100`;
    if (item.type === 'tutor') detail = item.question || '';
    ul.appendChild(el('li', {},
      el('div', { style: 'display:flex;justify-content:space-between;gap:8px' },
        el('strong', {}, item.title || item.type),
        el('span', { class: 'hint' }, date)),
      detail ? el('div', { class: 'hint' }, detail) : null));
  });

  card.appendChild(ul);
  root.appendChild(card);
}
