# Kalori Tracker

PWA pencatat kalori pribadi bareng **Salju**, beruang kutub yang menemani kamu.
Foto makananmu, Salju yang menebak isinya dan menghitung kalorinya. Hasilnya langsung tercatat.

Aplikasi live: https://akbarmuh.github.io/kalori-tracker/

- **Foto → kalori otomatis** pakai AI, bisa diubah atau diurungkan sesudahnya
- Ekspresi Salju ikut progresmu: ngantuk, lapar, senang, bangga, atau kekenyangan
- Ringkasan per waktu makan dan riwayat 7/30 hari
- Onboarding untuk menghitung target kalori harian
- Catat manual, makanan favorit, dan tebak dari teks
- Sinkron antar perangkat lewat repo GitHub privat (opsional), backup JSON
- Bisa dipakai offline dan di-install di HP

## Jalankan di laptop

```
npm install
npm run dev
```

## Setup sekali saja

### 1. Pasang di HP
Buka alamat aplikasi di Chrome (Android) atau Safari (iPhone), lalu pilih **Add to Home Screen** / **Install app**.

### 2. AI pengenal makanan
Saat pertama kali menekan tombol kamera, aplikasi meminta koneksi AI (bisa diubah di
**Pengaturan → AI pengenal makanan**):
- **Azure OpenAI:** buka deployment-mu di Azure AI Foundry, lalu salin **Target URI** dan **Key**.
  Deployment harus mendukung input gambar dan structured outputs (mis. keluarga GPT-4.1).
- **Claude:** API key dari [console.anthropic.com](https://console.anthropic.com).

Untuk HP atau laptop lain: **Pengaturan → Pasang di HP lain**, lalu scan QR-nya. QR itu berisi key,
jadi jangan dibagikan. Biaya pemakaian API ditagih ke akun pemilik key.

### 3. Sinkron data (opsional)
1. Buat repo **privat** baru untuk data, mis. `kalori-data`. Boleh kosong.
2. Buat token di **GitHub → Settings → Developer settings → Fine-grained tokens**:
   - Repository access: **Only select repositories** → `kalori-data`
   - Permissions: **Contents → Read and write**
3. Di aplikasi, buka **Pengaturan → Sinkron ke GitHub**, isi owner, nama repo, dan token. Lakukan di setiap perangkat.

Foto makanan hanya disimpan di perangkat dan tidak ikut disinkronkan.

### Deploy sendiri
Fork repo ini, lalu buka **Settings → Pages → Source: GitHub Actions**. Setiap push ke `main` akan
men-deploy ke `https://<username>.github.io/<nama-repo>/`.

## Keamanan
Token GitHub dan API key hanya disimpan di browser perangkatmu. Siapa pun yang memegang HP-mu
dalam keadaan terbuka bisa melihatnya. Kalau HP hilang, cabut token dan key dari GitHub dan
Anthropic Console.
