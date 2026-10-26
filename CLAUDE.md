# Kalori Tracker

Aplikasi pencatat kalori harian untuk pemakaian pribadi (satu pengguna). Berupa PWA yang
di-host di GitHub Pages dan di-install di HP. Data disimpan lokal dan disinkronkan ke repo
GitHub privat.

## Keputusan yang sudah diambil

- **Platform:** Web PWA. Mobile-first dan bisa di-install (Add to Home Screen), tetap nyaman dibuka di laptop.
- **Hosting:** GitHub Pages, deploy lewat GitHub Actions setiap push ke `main`.
- **Penyimpanan:** local-first. IndexedDB adalah sumber kebenaran di perangkat, lalu
  disinkronkan ke `data.json` di repo GitHub **privat** yang terpisah dari repo kode ini.
- **Input kalori:** manual, ditambah daftar makanan favorit untuk input cepat.
- **Bahasa UI:** Bahasa Indonesia.

## Stack

- Vite + React + TypeScript (strict)
- Dexie (wrapper IndexedDB)
- `vite-plugin-pwa` untuk manifest dan service worker
- Vitest untuk unit test
- Grafik mingguan: SVG sederhana buatan sendiri, tanpa library chart dulu

Tambahkan dependency hanya kalau benar-benar perlu. Ini proyek pribadi, jadi utamakan kesederhanaan.

## Fitur

### Fase 1 (MVP)
1. **Catat makanan:** nama, kalori, waktu makan (`sarapan` | `siang` | `malam` | `camilan`), tanggal/jam. Bisa diedit dan dihapus.
2. **Makanan favorit:** simpan makanan yang sering dicatat, lalu cukup satu tap untuk menambahkannya.
3. **Target kalori harian:** bisa diatur. Tampilkan total, sisa, dan progress hari ini.
4. **Ringkasan harian:** total per waktu makan.
5. **Ringkasan mingguan:** 7 hari terakhir dibandingkan target (grafik batang dan rata-rata).
6. **Export/import JSON:** backup manual.

### Fase 2: Sinkron GitHub
- Pengguna memasukkan *fine-grained PAT* (izin: Contents read/write, **hanya** untuk repo data), owner, dan nama repo di halaman Pengaturan.
- Baca/tulis lewat GitHub Contents API (`GET`/`PUT /repos/{owner}/{repo}/contents/data.json`).
- Pakai `sha` file untuk optimistic concurrency. Kalau `PUT` gagal karena konflik (409/422):
  ambil versi terbaru, gabungkan, lalu coba lagi.
- Aturan merge: per record berdasarkan `id`, menang yang `updatedAt` terbaru. Penghapusan memakai
  soft delete (`deletedAt`) supaya terbawa saat sinkron.
- Sinkron berjalan saat aplikasi dibuka, setelah ada perubahan (dengan debounce), dan lewat tombol manual.
  Kalau sinkron gagal atau offline, aplikasi tetap bisa dipakai. Tampilkan status sinkron, jangan memblokir UI.

### Fase 3 (nanti): Foto + LLM
- Foto makanan, lalu LLM vision memperkirakan nama makanan dan kalorinya. Hasilnya **selalu** bisa diedit pengguna sebelum disimpan.
- Bisa juga input teks bebas ("nasi goreng + telur ceplok"), lalu LLM memecahnya menjadi item dan kalori.
- Model: `claude-opus-5-5` lewat `@anthropic-ai/sdk` (`client.beta.messages.parse` + `betaZodOutputFormat`,
  `fallbacks: 'default'`). Cek dengan skill `claude-api` sebelum mengubah kode ini.
- **Keputusan:** API key Anthropic milik pengguna disimpan di browser (`localStorage`), seperti PAT, dan
  dipanggil langsung dari browser (`dangerouslyAllowBrowser: true`). Belum ada backend. Kalau nanti butuh
  backend (mis. integrasi WhatsApp), pindahkan pemanggilan ke proxy serverless.
- SDK di-import secara lazy (`import()`) supaya tidak masuk bundle utama.
- Foto diperkecil ke sisi maksimal 1568px sebelum dikirim, dan **tidak** disimpan ke `data.json`.
  Yang disimpan cukup hasil estimasinya.

## Status

Fase 1–3 sudah diimplementasikan. Alur AI dan sinkron diuji dengan API tiruan. Belum pernah dicoba
dengan token GitHub atau API key Anthropic sungguhan.

## UI

Mobile-first dan beranimasi: ring progress, angka yang menghitung naik, bottom sheet, item yang
masuk/keluar dengan animasi, dan grafik batang yang tumbuh. Semua animasi pakai CSS (tanpa library)
dan dimatikan otomatis jika `prefers-reduced-motion`. Warna didefinisikan sebagai CSS variable di
`:root` dengan varian dark mode.

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

interface FavoriteFood {
  id: string;
  name: string;
  calories: number;
  defaultMeal?: MealType;
  updatedAt: string;
  deletedAt?: string;
}

interface Settings {
  dailyTarget: number;   // kkal
  updatedAt: string;
}
```

`data.json` di repo data berisi `{ version, entries, favorites, settings }`. Naikkan `version` dan
tulis migrasi setiap kali skema berubah.

## Struktur folder

```
src/
  db/          # schema.ts (zod schema + tipe), db.ts (Dexie), repo.ts (semua penulisan data + event perubahan)
  sync/        # merge.ts (fungsi murni), github.ts (Contents API), syncService.ts (status + auto-sync)
  ai/          # estimate.ts (Claude: foto/teks -> item + kalori)
  features/    # TodayView, WeekView, FavoritesView, SettingsView, EntryForm, AiReview
  components/  # ProgressRing, AnimatedNumber, Sheet, SyncBadge
  lib/         # date.ts, summary.ts, backup.ts
```

Semua penulisan data **harus** lewat `db/repo.ts`, supaya `updatedAt` terisi dan sinkron otomatis terpicu.

## Konvensi

- Logika bisnis (kalkulasi ringkasan, merge sinkron, helper tanggal) ditulis sebagai fungsi murni di luar komponen dan wajib punya unit test.
- Tanggal selalu dihitung dengan zona waktu lokal perangkat. Jangan pakai `toISOString().slice(0,10)` untuk mendapatkan tanggal hari ini.
- Jangan pernah commit token, API key, atau data pribadi. PAT dan key hanya disimpan di IndexedDB/localStorage perangkat.
- Pastikan aplikasi tetap bisa dipakai offline. Fitur jaringan bersifat tambahan.

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
