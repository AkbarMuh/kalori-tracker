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

- Provider bisa dipilih (`ai/config.ts`, disimpan di `localStorage` `kalori.ai`); default di form: **Azure OpenAI**.
  - **Azure** (`ai/azure.ts`): `fetch` langsung ke `…/openai/deployments/{deployment}/chat/completions`
    dengan header `api-key`, `response_format: json_schema` (strict), dan fallback ke `json_object` kalau
    deployment menolak schema. Endpoint Azure mengizinkan CORS (`*`). Deployment harus mendukung input
    gambar dan structured outputs (mis. keluarga gpt-4.1). Pengguna cukup menempel **Target URI** dari
    portal (`parseAzureTarget`) dan key.
  - **Claude** (`ai/claude.ts`): `claude-opus-5-5` lewat `client.beta.messages.parse` +
    `betaZodOutputFormat`, `fallbacks: 'default'`. Cek skill `claude-api` sebelum mengubah kode ini.
- Kedua provider di-import secara lazy. Hasilnya dinormalkan oleh `normalizeEstimate` (kkal 0–20000).
- **Jangan pernah menanam key atau endpoint di kode, CLAUDE.md, atau commit.** Repo dan situsnya publik.
  Untuk pindah perangkat: Pengaturan → "Pasang di HP lain" (QR/link dengan config di fragment
  `#ai=…`; dibaca di `main.tsx` lalu dihapus dari URL).
- Tes koneksi Azure yang sungguhan secara lokal: key ada di `.env.local` (git-ignored,
  `AZURE_TARGET_URI`, `AZURE_KEY`). Jangan pernah mencetak isinya.

## PWA & update

- `registerType: 'prompt'` + `src/pwa.ts`: update yang ditemukan dalam 8 detik pertama setelah aplikasi
  dibuka langsung dipasang (reload saat animasi pembuka). Kalau ditemukan setelahnya, muncul toast
  "Muat ulang". Jangan kembali ke `autoUpdate`/`skipWaiting`, karena halaman yang sedang terbuka bisa
  kehilangan chunk lazy (modul AI) yang lamanya sudah dihapus dari server.
- Pasang ke Layar Utama (`lib/install.ts`, `features/Install.tsx`): Android/desktop memakai
  `beforeinstallprompt` (tombol "Pasang"). iOS/iPadOS tidak punya prompt, jadi tampilkan panduan
  (iOS 26: ••• → Bagikan → Tambahkan ke Layar Utama). Browser in-app (Instagram, FB, dll.) dan WhatsApp
  (SFSafariViewController) tidak bisa menambahkan ke Layar Utama, jadi arahkan ke "Buka di Safari".
  iPadOS mengaku sebagai Mac, dan dideteksi lewat `maxTouchPoints`.
- **iOS: aplikasi di Layar Utama punya penyimpanan sendiri** (terpisah dari Safari). Data dan config AI
  tidak ikut, jadi kolom Target URI juga menerima link setup `#ai=…`.
- Ikon: `public/icon.svg` (umum), `icon-maskable.svg` (full-bleed untuk Android/iOS), dan
  `icon-monochrome.svg` (themed icon Android 13+). `npm run icons` membuat semua PNG-nya.

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
  ai/          # config.ts (provider, Target URI, link setup), estimate.ts (skema, prompt, resize foto), azure.ts, claude.ts
  features/    # Camera (alur inti), TodayView, HistoryView, SettingsPage, Onboarding, EntryForm, ItemsEditor, meals.ts
  components/  # Icon, PolarBear, Splash, Sheet, SwipeRow, ToastHost, NumberSlider, ProgressRing, AnimatedNumber, SnowBurst, SyncBadge
  lib/         # date, summary, mascot, tdee, gesture, toast, haptics, backup
  pwa.ts       # registrasi service worker + alur update
scripts/       # launcher-icons.mjs (ikon monokrom, maskable, dan apple-touch)
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
npm run icons      # buat ulang semua ikon PWA (generator + scripts/launcher-icons.mjs)
```

Deploy: `.github/workflows/deploy.yml` menjalankan lint, test, dan build dengan
`BASE_PATH=/<nama-repo>/`, lalu publish ke GitHub Pages setiap push ke `main`.
