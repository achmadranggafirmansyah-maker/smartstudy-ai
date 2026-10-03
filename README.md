# SmartStudy AI

Aplikasi pendamping belajar berbasis AI (PWA + Node.js + Google Gemini).

## Cara Menjalankan Lokal

1. `npm install`
2. `cp .env.example .env`
3. `npm start`
4. Buka http://localhost:3000

## Aktivasi dengan Google Gemini (Gratis)

Saat pertama kali buka, isi:
- API Key: `AIza...` (dari https://aistudio.google.com/app/apikey)
- Base URL: `https://generativelanguage.googleapis.com/v1beta/openai/`
- Model: `gemini-2.5-flash`

## Deploy ke Vercel

1. Import repo ini ke Vercel
2. Framework Preset: Other
3. Build Command: `npm install`
4. Deploy

## Fitur

- Tutor AI (teks + foto soal)
- Latihan kuis pilihan ganda
- Latihan uraian dengan rubrik
- Kalkulator matematika
- Riwayat & statistik
- PWA install-able

## Lisensi

MIT
