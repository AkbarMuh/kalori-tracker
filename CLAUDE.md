# Kalori Tracker

Aplikasi pencatat kalori pribadi (satu pengguna) dengan maskot beruang putih bernama **Salju**.
**Fitur utamanya: foto makanan → LLM menebak item dan kalorinya → otomatis tercatat.** Berupa PWA
yang di-host di GitHub Pages dan di-install di HP. Data disimpan lokal dan bisa disinkronkan ke
repo GitHub privat.

## Keputusan yang sudah diambil

- **Platform:** Web PWA, mobile-first, bisa di-install (Add to Home Screen).
- **Hosting:** GitHub Pages, deploy lewat GitHub Actions setiap push ke `main`.
- **Penyimpanan:** local-first. IndexedDB adalah sumber kebenaran di perangkat, lalu disinkronkan
  ke `data.json` di repo GitHub **privat** yang terpisah dari repo kode ini.
- **Alur utama:** tombol kamera besar di tengah tab bar → foto → Salju menganalisis →
  entri **langsung tersimpan** (tanpa langkah konfirmasi) → toast "Ubah · Urungkan".
  Input manual dan teks bebas tetap ada, tapi sebagai jalur sekunder.
- **Menu minimal:** 2 tab (Hari ini, Riwayat) + kamera di tengah. Pengaturan dibuka dari ikon di
  pojok kanan atas. Favorit muncul di sheet catat manual dan dikelola di Pengaturan.
- **Gaya:** tema kutub biru es (aurora di dark mode), maskot Salju, ikon SVG soft bertelinga
  beruang. **Jangan pakai emoji OS** di UI. Pakai `components/Icon.tsx`.
- **Animasi pembuka** "Salju bangun tidur" sekitar 4 detik setiap aplikasi dibuka, bisa di-tap untuk lewati.
- **Bahasa UI:** Bahasa Indonesia.

## Stack

- Vite + React 19 + TypeScript (strict)
- Dexie (IndexedDB), zod (validasi data dan structured output LLM)
- `vite-plugin-pwa` untuk manifest dan service worker
- `@anthropic-ai/sdk` (di-import secara lazy)
- Vitest untuk unit test, ESLint (termasuk aturan React Compiler `react-hooks`)
- Grafik dan maskot: SVG buatan sendiri; semua animasi pakai CSS, tanpa library animasi

Tambahkan dependency hanya kalau benar-benar perlu.

## Fitur

1. **Foto → kalori (inti):** `features/Camera.tsx`. Foto diperkecil (1568px untuk model, 720px
   untuk preview, 192px untuk thumbnail). Hasil disimpan dengan `source: 'ai'` dan bisa
   diurungkan atau diedit lewat toast. Analisis bisa dibatalkan (`AbortController`).
   Kalau API key belum ada, sheet "Atur AI dulu" muncul dan lanjut otomatis setelah key disimpan.
2. **Thumbnail foto** disimpan di tabel Dexie `photos`, **hanya di perangkat** (tidak ikut sinkron
   atau export).
3. **Hari ini:** ring progress dengan Salju di tengah (ekspresi mengikuti progres), total per waktu
   makan (kartu bisa di-tap untuk catat manual), dan daftar makanan dengan thumbnail.
4. **Interaksi:** tap Salju (bereaksi + dialog acak), mata Salju mengikuti jari, geser kartu ringkasan
   untuk ganti hari, geser makanan ke kiri untuk hapus (+ urungkan), getaran pendek (Android).
5. **Riwayat:** grafik 7 hari (batang bisa di-tap), statistik, daftar 30 hari terakhir dengan
   ekspresi Salju per hari (tap untuk membuka hari itu).
6. **Onboarding** (bisa di-skip, bisa dibuka lagi): slider umur/tinggi/berat → target
   (Mifflin–St Jeor + aktivitas + tujuan, dengan batas aman minimum).
7. **Sinkron GitHub:** PAT fine-grained (Contents read/write, hanya repo data). Contents API dengan
   `sha` untuk optimistic concurrency, retry saat konflik 409/422. Merge per record (`updatedAt`
   terbaru menang), soft delete (`deletedAt`). Kalau sinkron gagal atau offline, UI tidak terblokir.
8. **Backup:** export/import JSON (import menggabungkan, tidak menimpa).

## LLM

- Saat ini: `claude-opus-5-5` lewat `client.beta.messages.parse` + `betaZodOutputFormat`,
  `fallbacks: 'default'`. Cek skill `claude-api` sebelum mengubah kode ini.
- API key milik pengguna disimpan di `localStorage` dan dipanggil langsung dari browser
  (`dangerouslyAllowBrowser: true`). Belum ada backend.
- **Rencana:** pengguna akan memberikan Azure OpenAI (GPT). Buat estimator yang bisa ditukar
  (provider dipilih di Pengaturan) dan jangan menyebar logika provider ke luar `ai/`.

## Status

Semua fitur di atas sudah diimplementasikan. Alur foto dan sinkron diuji dengan API tiruan dan
belum pernah dicoba dengan API key Anthropic atau token GitHub sungguhan.

## Model data

```ts
type MealType = 'sarapan' | 'siang' | 'malam' | 'camilan';

interface FoodEntry {
  id: string;            // crypto.randomUUID()
  date: string;          // 'YYYY-MM-DD' (zona waktu lokal)
  time: string;          // ISO timestamp
  meal: MealType;
  name: string;
  calories: number;      // kkal, bilangan bulat >= 0
  source: 'manual' | 'favorite' | 'ai';
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

interface FavoriteFood { id; name; calories; defaultMeal?; updatedAt; deletedAt? }
interface Settings { id: 'main'; dailyTarget: number; updatedAt: string }
interface Photo { entryId: string; dataUrl: string }   // lokal saja
```

`data.json` di repo data berisi `{ version, settings, entries, favorites }`. Naikkan `version` dan
tulis migrasi setiap kali skema berubah.

## Struktur folder

```
src/
  db/          # schema.ts (zod + tipe), db.ts (Dexie, termasuk tabel photos), repo.ts (semua penulisan + event)
  sync/        # merge.ts (fungsi murni), github.ts (Contents API), syncService.ts (status + auto-sync)
  ai/          # estimate.ts (LLM: foto/teks -> item + kalori; resize foto)
  features/    # Camera (alur inti), TodayView, HistoryView, SettingsPage, Onboarding, EntryForm, ItemsEditor, meals.ts
  components/  # Icon, PolarBear, Splash, Sheet, SwipeRow, ToastHost, NumberSlider, ProgressRing, AnimatedNumber, SnowBurst, SyncBadge
  lib/         # date, summary, mascot, tdee, gesture, toast, haptics, backup
```

Semua penulisan data **harus** lewat `db/repo.ts`, supaya `updatedAt` terisi, sinkron otomatis
terpicu, dan Salju bereaksi (`onEntriesAdded`).

## Konvensi

- Logika bisnis (ringkasan, merge, tanggal, mood maskot, TDEE, klasifikasi gesture) ditulis
  sebagai fungsi murni di `lib/` atau `sync/` dan wajib punya unit test.
- Tanggal selalu memakai zona waktu lokal. Jangan pakai `toISOString().slice(0,10)` untuk tanggal hari ini.
- Jangan pernah commit token, API key, atau data pribadi.
- Aplikasi harus tetap bisa dipakai offline. Fitur jaringan bersifat tambahan.
- Animasi harus menghormati `prefers-reduced-motion` (sudah ditangani global di CSS, dan Splash dilewati).
- ESLint melarang `setState` sinkron di dalam effect. Picu reaksi dari event handler atau subscription.

## Perintah

Node.js 24 (di laptop ini ada di `C:\Program Files\nodejs`).

```
npm install
npm run dev        # dev server (http://localhost:5173)
npm run build      # typecheck + build produksi ke dist/
npm test           # vitest
npm run lint       # eslint
npm run typecheck
npm run icons      # buat ulang ikon PWA dari public/icon.svg
```

Deploy: `.github/workflows/deploy.yml` menjalankan lint, test, dan build dengan
`BASE_PATH=/<nama-repo>/`, lalu publish ke GitHub Pages setiap push ke `main`.
