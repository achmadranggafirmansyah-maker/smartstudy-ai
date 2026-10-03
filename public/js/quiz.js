import { el, toast, escapeHtml } from './ui.js';
import { bumpStat, pushHistory } from './storage.js';

const BANK = {
  matematika: [
    { q: 'Hasil dari 2x + 5 = 17, nilai x adalah…', opts: ['4','5','6','7'], ans: 2, why: '2x = 17 − 5 = 12, maka x = 12 ÷ 2 = 6.' },
    { q: 'Luas lingkaran dengan jari-jari 7 cm (π=22/7) adalah…', opts: ['154 cm²','144 cm²','44 cm²','49 cm²'], ans: 0, why: 'L = πr² = (22/7)(7²) = 154 cm².' },
    { q: 'Jika f(x)=3x−1, maka f(4) = …', opts: ['10','11','12','13'], ans: 1, why: 'f(4) = 3(4) − 1 = 11.' }
  ],
  ipa: [
    { q: 'Satuan SI untuk gaya adalah…', opts: ['Joule','Watt','Newton','Pascal'], ans: 2, why: 'Gaya diukur dalam Newton (N) = kg·m/s².' },
    { q: 'Proses tumbuhan membuat makanan disebut…', opts: ['Respirasi','Fotosintesis','Transpirasi','Fermentasi'], ans: 1, why: 'Fotosintesis menggunakan cahaya, CO₂, dan air untuk membuat glukosa.' },
    { q: 'Bagian sel yang berperan sebagai pusat kendali adalah…', opts: ['Mitokondria','Ribosom','Nukleus','Vakuola'], ans: 2, why: 'Nukleus menyimpan DNA dan mengatur aktivitas sel.' }
  ],
  bahasa: [
    { q: 'Kalimat yang menggunakan kata baku adalah…', opts: ['Dia sedang praktek di lab.','Dia sedang praktik di lab.','Dia sedang prakttek di lab.','Dia sedang prakteik di lab.'], ans: 1, why: 'Kata baku menurut KBBI adalah "praktik".' },
    { q: 'Ide pokok paragraf biasanya terletak pada…', opts: ['Kalimat utama','Kalimat penjelas','Kata hubung','Kata ulang'], ans: 0, why: 'Ide pokok terdapat pada kalimat utama.' }
  ],
  umum: [
    { q: 'Ibu kota Indonesia saat ini adalah…', opts: ['Bandung','Surabaya','Jakarta','Medan'], ans: 2, why: 'Jakarta masih menjadi ibu kota hingga pemindahan resmi.' },
    { q: '1 kilometer sama dengan… meter', opts: ['10','100','1000','10000'], ans: 2, why: '1 km = 1000 m.' }
  ]
};

export function renderQuiz(root) {
  root.innerHTML = '';
  let state = { topic: null, questions: [], answers: [], submitted: false };

  const card = el('div', { class: 'card' },
    el('h2', {}, '📝 Latihan Pilihan Ganda'),
    el('p', { class: 'hint' }, 'Pilih topik, jawab semua soal, lalu periksa. Pembahasan akan ditampilkan otomatis.')
  );

  const topicSel = el('select', { 'aria-label': 'Pilih topik' },
    el('option', { value: '' }, '— Pilih topik —'),
    el('option', { value: 'matematika' }, 'Matematika'),
    el('option', { value: 'ipa' }, 'IPA'),
    el('option', { value: 'bahasa' }, 'Bahasa Indonesia'),
    el('option', { value: 'umum' }, 'Pengetahuan Umum')
  );

  const startBtn = el('button', { class: 'btn primary block', style: 'margin-top:10px' }, '🚀 Mulai Latihan');
  card.appendChild(el('label', {}, 'Topik'));
  card.appendChild(topicSel);
  card.appendChild(startBtn);

  const quizArea = el('div', { id: 'quizArea' });

  startBtn.addEventListener('click', () => {
    const t = topicSel.value;
    if (!t) { toast('Pilih topik terlebih dahulu.', 'err'); return; }
    state = { topic: t, questions: structuredClone(BANK[t] || []), answers: new Array((BANK[t] || []).length).fill(-1), submitted: false };
    renderQuestions();
  });

  function renderQuestions() {
    quizArea.innerHTML = '';
    if (!state.questions.length) {
      quizArea.appendChild(el('div', { class: 'empty' }, 'Belum ada soal untuk topik ini.'));
      return;
    }

    state.questions.forEach((q, qi) => {
      const block = el('div', { class: 'card q-block' },
        el('h3', {}, `Soal ${qi + 1} dari ${state.questions.length}`),
        el('p', { style: 'margin:4px 0 10px;font-size:15px;font-weight:600' }, q.q)
      );
      q.opts.forEach((opt, oi) => {
        const id = `q${qi}o${oi}`;
        const label = el('label', { class: 'opt' + (state.answers[qi] === oi ? ' selected' : ''), for: id });
        const radio = el('input', {
          type: 'radio', name: `q${qi}`, id, value: oi, style: 'margin-right:8px',
          onchange: () => {
            state.answers[qi] = oi;
            quizArea.querySelectorAll(`input[name="q${qi}"]`).forEach(r => {
              r.closest('.opt').classList.toggle('selected', r.checked);
            });
          }
        });
        if (state.answers[qi] === oi) radio.checked = true;
        label.appendChild(radio);
        label.appendChild(document.createTextNode(opt));
        block.appendChild(label);
      });
      quizArea.appendChild(block);
    });

    const check = el('button', { class: 'btn mint block' }, '✅ Periksa Jawaban');
    check.addEventListener('click', () => submitAnswers());
    quizArea.appendChild(el('div', { style: 'margin-top:8px' }, check));
  }

  function submitAnswers() {
    const unanswered = state.answers.findIndex(a => a < 0);
    if (unanswered !== -1) { toast(`Soal ${unanswered + 1} belum dijawab.`, 'err'); return; }

    let correct = 0;
    state.questions.forEach((q, qi) => {
      const picked = state.answers[qi];
      const correctOpt = q.ans;
      quizArea.querySelectorAll(`input[name="q${qi}"]`).forEach(r => {
        const oi = Number(r.value);
        const wrap = r.closest('.opt');
        wrap.classList.remove('selected');
        if (oi === correctOpt) wrap.classList.add('correct');
        if (oi === picked && picked !== correctOpt) wrap.classList.add('wrong');
        r.disabled = true;
      });
      if (picked === correctOpt) correct++;
      const block = quizArea.querySelectorAll('.q-block')[qi];
      block.appendChild(el('div', { class: 'warn-box', style: 'margin-top:8px;background:rgba(45,212,191,.15);color:inherit;border-color:transparent' }, '📘 Pembahasan: ' + escapeHtml(q.why)));
    });

    const total = state.questions.length;
    const pct = Math.round((correct / total) * 100);

    bumpStat('quizAttempts');
    bumpStat('quizCorrect', correct);
    bumpStat('quizTotal', total);
    pushHistory({ type: 'quiz', topic: state.topic, correct, total, pct, title: `Latihan ${state.topic}` });

    const summary = el('div', { class: 'card' },
      el('h2', {}, '📊 Hasil Latihan'),
      el('p', {}, `Benar ${correct} dari ${total} soal (${pct}%).`),
      el('div', { class: 'progress' }, el('span', { style: `width:${pct}%` })),
      el('span', { class: `chip ${pct >= 80 ? 'ok' : pct >= 60 ? 'mint' : 'bad'}` },
        pct >= 80 ? 'Luar biasa!' : pct >= 60 ? 'Bagus, tingkatkan lagi.' : 'Perlu latihan tambahan.')
    );

    quizArea.appendChild(summary);
    summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  root.appendChild(card);
  root.appendChild(quizArea);
}
