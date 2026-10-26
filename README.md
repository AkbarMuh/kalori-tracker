# Kalori Tracker

PWA pencatat kalori harian untuk pemakaian pribadi. Fitur:

- Catat makanan per waktu makan
- Makanan favorit untuk tambah cepat
- Target harian
- Ringkasan harian dan mingguan
- Backup JSON
- Sinkron antar perangkat lewat repo GitHub privat
- Tebak kalori dari foto atau teks dengan Claude

## Jalankan di laptop

```
npm install
npm run dev
```

## Setup sekali saja

### 1. Hosting di GitHub Pages
1. Push repo ini ke GitHub (branch `main`).
2. Buka **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Setiap push ke `main` akan men-deploy aplikasi ke `https://<username>.github.io/<nama-repo>/`.
4. Buka alamat itu di HP, lalu pilih **Add to Home Screen** / **Install app**.

### 2. Sinkron data (opsional)
1. Buat repo **privat** baru untuk data, mis. `kalori-data`. Boleh kosong.
2. Buat token di **GitHub → Settings → Developer settings → Fine-grained tokens**:
   - Repository access: **Only select repositories** → `kalori-data`
   - Permissions: **Contents → Read and write**
3. Di aplikasi, buka **Pengaturan → Sinkron ke GitHub**, isi owner, nama repo, dan token. Lakukan di setiap perangkat.

Data tetap tersimpan di perangkat dan aplikasi tetap bisa dipakai offline. Sinkron berjalan otomatis saat ada perubahan.

### 3. AI (opsional)
Buat API key di [console.anthropic.com](https://console.anthropic.com), lalu isi di **Pengaturan → AI**.
Biaya pemakaian API ditagih ke akun Anthropic-mu.

## Keamanan
Token GitHub dan API key hanya disimpan di browser perangkatmu. Siapa pun yang memegang HP-mu
dalam keadaan terbuka bisa melihatnya. Kalau HP hilang, cabut token dan key dari GitHub dan
Anthropic Console.
