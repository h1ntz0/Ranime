# Panduan Menjalankan Ranime (Web + API)

Tutorial lengkap cara menjalankan website Ranime di lokal. Ikuti urutannya: dari nol sampai website kebuka di browser.

---

## 1. Prasyarat

Pastikan sudah terinstall di laptop:

| Tools     | Versi      | Cek dengan        |
| --------- | ---------- | ----------------- |
| Node.js   | >= 22      | `node -v`         |
| npm       | (ikut node) | `npm -v`          |
| Docker    | terbaru    | `docker --version` |

> Pakai WSL2 Ubuntu / Linux. Kalau belum ada Docker Desktop di Windows, install dulu lalu jalankan WSL2-nya.

---

## 2. Instalasi Pertama Kali (cuma sekali)

Jalankan di folder project:

```bash
# 1. Install semua dependency
npm install

# 2. Buat file environment (kalau belum ada)
cp .env.example .env
```

Buka file `.env` dan isi `JWT_SECRET`:

```bash
# generate secret baru, lalu tempel ke .env
openssl rand -hex 32
```

Contoh isi `.env` yang benar:

```env
DATABASE_URL=postgres://anime:anime@localhost:5432/animelist
ANILIST_API_URL=https://graphql.anilist.co
JWT_SECRET=<hasil openssl tadi>
PORT=4000
FRONTEND_URL=http://localhost:3000
```

---

## 3. Menyalakan Database (PostgreSQL)

Database jalan di Docker, wajib dinyalakan **sebelum** API:

```bash
# Nyalakan container database (nama: animelist-postgres)
npm run db:up

# Cek status (harus "running" dan "healthy")
docker ps
```

### Pertama kali saja: migrasi + seed

```bash
# Buat tabel-tabel di database
npm run db:migrate

# Isi data awal + akun demo
npm run db:seed
```

> `db:seed` hanya perlu dijalankan **sekali** saat pertama kali (atau saat DB di-reset). Hasilnya akan print akun demo, contoh: `flowuser@example.local / password123`.

---

## 4. Menjalankan Website

```bash
npm run dev
```

Perintah ini menjalankan **API dan Web sekaligus**:

| Service | URL                          | Keterangan                       |
| ------- | ---------------------------- | -------------------------------- |
| Web     | http://localhost:3000        | Website yang dibuka di browser   |
| API     | http://localhost:4000/api/health | Backend (cek status server)   |

Buka **http://localhost:3000** di browser.

---

## 5. Login dengan Akun Demo

Di halaman login gunakan (sama seperti yang di-print saat `db:seed`):

- **Email:** `flowuser@example.local`
- **Password:** `password123`

Fitur yang butuh login: Library, Watchlist, Rating, Review, Statistics, Settings.

---

## 6. Menjalankan Cuma Satu Service (opsional)

```bash
npm run dev -w @animelist/api   # API saja (auto-reload saat file berubah)
npm run dev -w @animelist/web   # Web saja
```

---

## 7. Perintah Berguna Lainnya

| Perintah              | Fungsi                                        |
| --------------------- | --------------------------------------------- |
| `npm run build`       | Build produksi API + Web                      |
| `npm run test`        | Jalankan semua test (API 63 + Web)            |
| `npm run typecheck`   | Cek tipe TypeScript semua workspace           |
| `npm run lint`        | Cek kualitas kode (ESLint)                    |
| `npm run db:down`     | Matikan container database                    |
| `docker ps`           | Lihat container yang jalan                    |
| `docker logs animelist-postgres` | Lihat log database                 |

---

## 8. Troubleshooting

| Gejala                                    | Solusi                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| `ECONNREFUSED` / database tidak connect   | `npm run db:up` dulu, tunggu status "healthy" (`docker ps`)            |
| Port 3000/4000 sudah kepakai              | Matikan app lain di port itu, atau ubah port di `apps/web/vite.config.ts` dan `.env` |
| `JWT_SECRET` kosong / startup error       | Isi `.env` dengan hasil `openssl rand -hex 32`                         |
| Halaman error "temporarily unavailable"   | Cek API: buka http://localhost:4000/api/health harus return 200        |
| Section home kosong                       | Pastikan seed sudah jalan (`npm run db:seed`) dan koneksi internet ke AniList lancar |
| Ingin reset database                      | `npm run db:down` lalu `docker volume rm animelist-postgres` (hitung-hitung, volume name `postgres-data`), lalu `npm run db:up && npm run db:migrate && npm run db:seed` |
| `npm install` error                       | Pastikan Node >= 22, hapus `node_modules` + `package-lock.json` lalu install ulang |

---

## 9. Ringkasan Cepat (TL;DR)

```bash
# Pertama kali
npm install && cp .env.example .env && openssl rand -hex 32   # isi JWT_SECRET di .env

# Setiap mau pakai
npm run db:up
npm run dev
```

Buka **http://localhost:3000** → login `flowuser@example.local` / `password123`.

---

## 10. Catatan

- API berjalan dengan `tsx watch`: **setiap edit file di `apps/api/src/` otomatis di-restart**.
- Web berjalan dengan Vite dev: edit file di `apps/web/src/` langsung terlihat di browser (HMR).
- Semua data dari AniList disinkronkan dan disimpan lokal di PostgreSQL; browser tidak pernah akses AniList langsung.
- Verifikasi cepat API: `curl http://localhost:4000/api/health`