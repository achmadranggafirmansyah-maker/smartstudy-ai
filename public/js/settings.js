import { el, toast, confirmDialog } from './ui.js';
import { KEYS, DEFAULT_SETTINGS, read, write, clearAll, clearHistory, getStats } from './storage.js';
import { clearStoredKey } from './api.js';

export function renderSettings(root) {
  root.innerHTML = '';
  const s = read(KEYS.SETTINGS, DEFAULT_SETTINGS);

  const reduceMotion = el('input', { type: 'checkbox', id: 'reduceMotion', ...(s.reduceMotion ? { checked: 'checked' } : {}) });
  const saveHistory = el('input', { type: 'checkbox', id: 'saveHistory', ...(s.saveHistory ? { checked: 'checked' } : {}) });

  const card = el('div', { class: 'card' },
    el('h2', {}, '⚙️ Pengaturan'),
    el('div', { style: 'display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)' },
      el('div', {}, el('strong', {}, 'Kurangi animasi'), el('div', { class: 'hint' }, 'Mengurangi gerakan untuk aksesibilitas.')),
      reduceMotion),
    el('div', { style: 'display:flex;justify-content:space-between;align-items:center;padding:10px 0' },
      el('div', {}, el('strong', {}, 'Simpan riwayat'), el('div', { class: 'hint' }, 'Riwayat disimpan di perangkat Anda saja.')),
      saveHistory),
    el('button', { class: 'btn primary block', style: 'margin-top:10px' }, '💾 Simpan Pengaturan')
  );

  card.querySelector('button').addEventListener('click', () => {
    write(KEYS.SETTINGS, { theme: 'auto', reduceMotion: reduceMotion.checked, saveHistory: saveHistory.checked });
    document.documentElement.classList.toggle('reduce-motion', reduceMotion.checked);
    toast('Pengaturan disimpan.', 'ok');
  });

  const stats = getStats();
  const statsCard = el('div', { class: 'card' },
    el('h2', {}, '📈 Statistik Anda'),
    el('div', { class: 'grid cols-2' },
      statBox('Sesi Tutor', stats.tutorSessions || 0),
      statBox('Latihan Kuis', stats.quizAttempts || 0),
      statBox('Benar / Total', `${stats.quizCorrect || 0} / ${stats.quizTotal || 0}`),
      statBox('Latihan Uraian', stats.essayAttempts || 0)
    )
  );

  const apiCard = el('div', { class: 'card' },
    el('h2', {}, '🔑 API Key'),
    el('p', { class: 'hint' }, 'API key disimpan di browser Anda (localStorage). Tidak dikirim ke server.'),
    el('div', { class: 'btn-row' },
      el('button', {
        class: 'btn ghost',
        onclick: () => {
          if (!confirmDialog('Ganti API key? Aplikasi akan dikunci sampai Anda memasukkan key baru.')) return;
          clearStoredKey();
          toast('API key dihapus. Halaman akan dimuat ulang.', 'ok');
          setTimeout(() => location.reload(), 600);
        }
      }, '🔓 Ganti API Key')
    )
  );

  const dataCard = el('div', { class: 'card' },
    el('h2', {}, '🗑️ Data & Privasi'),
    el('p', { class: 'hint' }, 'Riwayat belajar tersimpan lokal di browser.'),
    el('div', { class: 'btn-row' },
      el('button', {
        class: 'btn ghost',
        onclick: () => {
          if (!confirmDialog('Hapus seluruh riwayat?')) return;
          clearHistory(); toast('Riwayat dihapus.', 'ok');
        }
      }, 'Hapus Riwayat'),
      el('button', {
        class: 'btn danger',
        onclick: () => {
          if (!confirmDialog('Hapus SEMUA data (riwayat, statistik, pengaturan)?')) return;
          clearAll(); toast('Semua data dihapus.', 'ok');
          setTimeout(() => location.reload(), 500);
        }
      }, 'Hapus Semua Data'))
  );

  const aboutCard = el('div', { class: 'card' },
    el('h2', {}, 'ℹ️ Tentang SmartStudy AI'),
    el('p', { class: 'hint' },
      'SmartStudy AI adalah alat bantu latihan dan pemahaman materi. ' +
      'Aplikasi ini BUKAN sarana bantuan tersembunyi saat ujian. ' +
      'Jawaban AI dapat keliru dan perlu diperiksa dengan sumber resmi.')
  );

  root.append(card, statsCard, apiCard, dataCard, aboutCard);
}

function statBox(label, value) {
  return el('div', { class: 'stat' },
    el('div', { class: 'label' }, label),
    el('div', { class: 'value' }, String(value))
  );
}
