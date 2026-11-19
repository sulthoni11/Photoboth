# SnapVibe Studio — Progress Log

> Photobooth web interaktif (Korean Life4Cuts × Y2K Aesthetic). 100% client-side untuk gambar, ekspor 1200 px tanpa watermark.
>
> **Update terakhir:** 17 November 2026
> **Status:** versi pertama + edisi koran vintage sudah jalan. `npm run build` + `tsc` bersih, landing 118 KB gzip JS.

---

## 0. Status Ringkas

| Area | Status | Bukti |
|---|---|---|
| Scaffold React 19 + Vite 7 + TS + Tailwind v4 | ✅ | `npm run build` sukses |
| Desain token light/dark | ✅ | `src/index.css` |
| Landing page (7 section + FAQ + footer) | ✅ | 25 canvas ter-render saat smoke test |
| Canvas engine + 6 frame tema | ✅ | `src/lib/canvas/*` |
| Edisi koran kota (6 edisi, foto arsip + lambang kota) | ✅ | `src/lib/canvas/newspaper.ts`, `cities.ts`, `public/news/` |
| Camera stage (izin, mirror, filter, timer, retake) | ✅ | `CameraStage.tsx`, `useCamera.ts` |
| Frame editor (ganti frame, warna, caption, tanggal) | ✅ | `FrameEditor.tsx` |
| Export PNG/JPG 1200 px + Web Share | ✅ | `render.ts`, `FrameEditor.tsx` |
| Music jukebox + proxy `/api/music` | ✅ | `server/index.js`, 503 fallback & 429 terverifikasi |
| Header keamanan (CSP, Permissions-Policy, HSTS) | ✅ | dicek via `curl -D -` |
| Anggaran performa landing | ✅ | 108 KB gzip JS (target ≤130) |
| Lighthouse run | ⬜ | belum dijalankan (lihat §11) |
| Uji kamera nyata / Jamendo key nyata | ⬜ | butuh perangkat + key (lihat §12) |

---

## 1. Cara Menjalankan

```bash
npm install

# development: 2 terminal
npm run api    # server proxy musik + rate limit (port 8787)
npm run dev    # vite (port 5173, /api diproxy ke 8787)

# produksi
npm run build
npm start      # server Node menyajikan dist/ + /api (port 8787)
```

Konfigurasi: salin `.env.example` → `.env`, isi `JAMENDO_CLIENT_ID`. Tanpa key, aplikasi tetap jalan dengan lima loop WebAudio (mode offline).

---

## 2. Yang Sudah Jadi

**Landing (`/`)**
- Nav kartu mengambang + menu mobile disclosure (tanpa Radix, hemat 22 KB gzip).
- Announcement bar 4 fakta + kompatibilitas browser.
- Hero: headline dengan highlight blob pink, CTA, strip hasil sungguhan (bukan ilustrasi 3D generik), 2 kartu frame miring di belakang.
- Marquee 6 frame (Magic UI `marquee`, CSS murni) + grid katalog dengan swatch warna.
- "Cara kerjanya": 3 langkah + garis putus-putus melengkung.
- Galeri 3 strip hasil nyata (pengganti testimoni palsu).
- Section privasi dengan kartu "Network" yang jujur (`POST /api/photos → tidak ada`).
- FAQ `<details>` native, CTA penutup dengan `ShimmerButton`, footer 3 kolom + lisensi.

**Studio (`/studio`)**
- Mode 1 (Polaroid) / 3 (Strip) / 4 (Life4Cuts); foto slot menyesuaikan rasio otomatis.
- Timer 3/5/10 detik, hitung mundur besar, flash, suara shutter disintesis (tanpa file audio).
- 5 filter (Normal, Noir, Warm Vintage, Soft Peach, Cool Tone) — preview CSS, capture via `ctx.filter`.
- Mirror toggle, retake per pose, upload galeri sebagai fallback kamera.
- Kamera dimatikan (`track.stop()`) saat sesi selesai / unmount.
- Editor: 6 frame klasik + 6 edisi koran kota, 5 swatch per frame, caption ≤25 karakter, tanggal otomatis.
- Ekspor PNG lossless + JPG q0.92 pada 1200 px, Web Share API dengan fallback unduh.
- Panel "Sebelum & sesudah" di tahap 2: slider yang bisa digeser (foto asli di kiri, hasil HD di kanan), pemilih pose 1–n, serta tombol "Pakai asli" / "Pakai hasil HD" untuk memilih versi yang dipakai di strip, pratinjau, dan ekspor. Hasil HD disimpan terpisah (`enhancedRef`) sehingga bisa bolak-balik tanpa memproses ulang; riwayat dibersihkan otomatis bila pose di-retake.
- AI Magic Enhancer client-side (Canvas 2D, `src/lib/enhance.ts`): tombol bintang amber di tiap kartu foto tahap 1 **dan** tiap thumbnail di tahap 2, panel "Sempurnakan foto" (Sempurnakan semua) di kolom kanan tahap 2, indikator HD + revert ke asli, hold-to-compare & slider sebelum/sesudah. Hasil enhance masuk ke `shots` sehingga ikut terpakai di preview dan ekspor. Grading dikerjakan di ruang sRGB agar warna tidak pudar.
  Pipeline enhancer (revisi): denoise bilateral dua tahap (luma + chroma, radius kecil), pemulihan detail ber-gate tepi dengan halo suppression, penghalusan ekstra hanya di area datar (kulit) sementara tekstur berstruktur (rambut/bulu mata) dikembalikan sebagian, lalu tone hanya pada luminance + vibrance yang menjaga warna kulit. Tidak ada lagi upscale-blur 1.6x. Uji pada foto demo 700×900: noise area datar std 5.82 → 1.08, detail kulit halus, helai rambut tetap terbaca (4.60 → 4.21), saturasi 0.334 → 0.353, waktu ±0.3 dtk/foto.
- Music jukebox dalam Sheet: dua tab — **Cari lagu** (katalog Audius) dan **Suasana** (4 mood Jamendo + 5 loop synth offline). Hasil pencarian menampilkan cover, judul, artis, dan durasi; klik untuk memutar sebagai musik sesi. Ada play/pause, trek berikutnya, slider volume, dan tombol bisu. Tidak ada request jaringan sebelum panel dibuka.
  Proxy Audius di `server/index.js`: `/api/music/search?q=`, `/api/music/stream/:id` (mendukung HTTP Range untuk seek), `/api/music/art/:id` (cover). Semua lewat origin sendiri sehingga CSP tetap `connect-src 'self'` / `media-src 'self'` dan tidak butuh API key di browser. Cache pencarian 10 menit, rate limit 30 req/menit per IP.

---

## 3. Arah Desain (dari referensi Picmyevent)

| Token | Nilai | Pemakaian |
|---|---|---|
| `--background` | `#FFFFFF` / `#0B0C10` | Kanvas |
| `--foreground` | `#0F1222` / `#F2F3F7` | Headline |
| `--muted-foreground` | `#6B7280` / `#9AA0AE` | Body |
| `--border` | `#EDEFF3` / `#23262F` | Kartu |
| `--primary` | `#4F62F6` / `#6B7CFF` | Satu-satunya aksen CTA |
| `--blob-pink` | `#F9D5E5` / `#3A2430` | Blob dekoratif |
| `--radius` | `0.875rem` | Kartu 14 px, tombol 8 px |
| Shadow | 2 level (`xs`, `card`) | Tidak ada varian lain |

Tipografi: Plus Jakarta Sans (display 700/800), Inter (UI 400–600), Pacifico **hanya** wordmark. Semua di-self-host lewat `@fontsource`, tanpa request ke Google Fonts.

Aturan yang dipegang: putih dominan, blob pastel organik (bukan gradient mesh), border tipis, satu aksen biru, ilustrasi 3D tidak dipakai berulang.

---

## 4. Riset UI: shadcn/ui + Magic UI

### 4.1 shadcn/ui — dipakai
`Button`, `Card`, `Input`, `Label`, `Slider`, `ToggleGroup`, `Toggle`, `Sheet`, `Skeleton`, `Sonner`, `Tabs`, `ScrollArea`, `Popover`, `Tooltip`, `AlertDialog`, `DropdownMenu`, `Badge`, `Separator` (beberapa terpasang untuk pemakaian lanjutan, tidak ikut bundle jika tak diimpor).

Catatan teknis: generator shadcn sempat menulis `import { cn } from "cn"` dan menambahkan dependency `cn` + `next-themes`. Sudah diperbaiki: semua import ke `@/lib/utils`, `next-themes` diganti `ThemeProvider` sendiri, `cn` dihapus. Import Radix juga diubah dari barrel `radix-ui` ke paket per-primitif agar landing tidak menyeret seluruh dialog suite.

### 4.2 Magic UI — dipakai & ditolak
| Komponen | Status | Alasan |
|---|---|---|
| `marquee` | ✅ dipakai | CSS murni, 0 KB JS tambahan |
| `shimmer-button` | ✅ dipakai | Hanya di CTA penutup, CSS murni |
| `blur-fade` | ❌ dilepas | Menyeret `motion` 42 KB gzip ke landing untuk fade halus |
| `particles`, `meteors`, `globe`, `animated-beam`, `sparkles-text`, `retro-grid`, `aurora-text`, `dock`, `shine-border` | ❌ ditolak | Ramai / berat / mengganggu fokus kamera |

Pengganti `blur-fade`: `src/components/site/Reveal.tsx` — IntersectionObserver + transisi CSS, menghormati `prefers-reduced-motion`.

### 4.3 Aturan motion
Transisi 150–500 ms, hanya untuk reveal, panel, flash, dan hitung mundur. Animasi tidak memblokir input dan berhenti total saat `prefers-reduced-motion: reduce`.

---

## 5. Anti-"AI Slop" — Gate Review

**Ditolak dan tidak ada di kode:** gradient ungu→pink, glassmorphism kartu, emoji sebagai ikon, copy "revolutionary/seamless", logo perusahaan fiktif, testimoni palsu, dark mode setengah jadi, shadow besar di semua elemen.

**Dipegang:** satu aksen warna, spacing kelipatan 4/8, copy spesifik ("1200 px", "0 file"), `<details>` untuk FAQ, foto contoh diberi kredit lisensi, state kosong/error/loading nyata.

---

## 6. Arsitektur & Struktur

```
src/
  app-level: main.tsx, App.tsx (router + theme + scroll)
  pages/          Landing.tsx, Studio.tsx
  components/
    landing/      Hero, FrameShowcase, HowItWorks, GallerySection, PrivacySection, ClosingCta
    site/         SiteHeader, SiteFooter, Logo, ThemeToggle, Reveal
    strip/        StripCanvas (renderer + cache gambar)
    studio/       CameraStage, FrameEditor, MusicJukebox, StudioHeader
    ui/           shadcn + shimmer-button + marquee
  lib/
    canvas/       layout.ts, draw.ts, frames.ts, render.ts
    capture.ts, filters.ts, music.ts, theme.tsx, demo.ts, utils.ts
  hooks/          useCamera.ts, useMusicPlayer.ts
server/index.js   static + /api/music + security headers (zero dependency)
```

Keputusan kunci:
- **Grafis di canvas penuh** (`layout` → `draw` → `frames` → `render`), satu fungsi `renderStrip` dipakai pratinjau dan ekspor → hasil selalu identik.
- **Foto = dataURL** di state React, tidak pernah menyentuh jaringan.
- **Studio di-split** via `React.lazy`; landing tidak memuat kode kamera, Radix dialog, maupun sonner.

---

## 7. Performa — Angka Nyata

Diukur dari output `npm run build` + `gzip -c`:

| Item | Ukuran |
|---|---|
| JS first load landing | **118 KB gzip** (react 81 + app 34 + icons 3) |
| Studio JS | **46.8 KB gzip** (camera, enhance, editor + util) |
| CSS landing | 18.0 KB gzip |
| Chunk Studio (lazy) | 43.8 KB gzip |
| Build | ~3–5 detik |
| Canvas di landing | 25 (156–468 px lebar) |

| Target | Status |
|---|---|
| Landing JS ≤130 KB gzip | ✅ 118 KB |
| Studio JS ≤200 KB gzip | ✅ 46.8 KB (di luar vendor bersama) |
| Ganti frame <50 ms | 🟡 desain one-pass canvas; belum diukur timing di perangkat |
| LCP ≤1.8 s, INP ≤200 ms, CLS ≤0.02 | ⬜ belum Lighthouse |
| Lolos Lighthouse ≥95 | ⬜ belum dijalankan |

Strategi yang terbukti dari pengukuran: membuang `motion` (−42 KB gzip), memakai `<details>` bukan accordion Radix (−22 KB gzip), menghapus preload Radix dari landing, dan memindahkan sonner ke chunk Studio.

---

## 8. Keamanan — Terpasang & Terverifikasi

| # | Kontrol | Implementasi | Verifikasi |
|---|---|---|---|
| 1 | Privasi kamera | Semua render di browser; `track.stop()` di cleanup & akhir sesi | kode + `useCamera.ts` |
| 2 | HTTPS/HSTS | `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` | `curl -D -` ✅ |
| 3 | Tainted canvas | Tidak ada aset runtime eksternal; font & foto same-origin | tidak ada request cross-origin di app |
| 4 | API key | `JAMENDO_CLIENT_ID` hanya dibaca server; rate limit 30/menit/IP | 503 `missing_key`, 429 setelah 30 request ✅ |
| 5 | XSS teks kustom | `fillText` saja, strip karakter kontrol, `maxLength=25` | kode |
| 6 | CSP & Permissions | `camera=(self), microphone=(), geolocation=()`; `media-src 'self' blob: https://*.jamendo.com` | `curl -D -` ✅ |

Tambahan: tidak ada cookie, tidak ada `localStorage` berisi gambar (hanya preferensi tema). Catatan: HSTS baru berlaku bila situs disajikan lewat HTTPS.

---

## 9. Responsif

- Mobile-first; breakpoint 375 / 640 / 1024 / 1280.
- Kontrol studio menumpuk di bawah video pada mobile; panel pengaturan menjadi kartu terpisah.
- Galeri memakai scroll-snap horizontal di mobile, grid di desktop.
- Target sentuh ≥36 px pada kontrol kecil, 40–44 px pada aksi utama.
- `viewport-fit=cover` disiapkan untuk notch.

---

## 10. Deviasi dari Rencana Awal

| Rencana | Realisasi | Alasan |
|---|---|---|
| Magic UI `blur-fade` untuk reveal | `Reveal` CSS | 42 KB gzip demi animasi fade tidak sepadan |
| Accordion shadcn untuk FAQ | `<details>` native | 22 KB gzip untuk 5 item |
| Fallback musik = 5 file audio statis | 5 loop disintesis WebAudio | Tanpa aset berlisensi, tanpa 4–5 MB unduhan |
| Next.js API route (opsi awal) | Server Node zero-dependency | Vite dipilih; key tetap tidak terekspos |
| Frame sebagai SVG overlay | Digambar penuh di canvas | Satu pipeline, bebas risiko CORS/taint |
| Testimoni pelanggan | Galeri hasil + detail teknis | Tidak mengarang bukti sosial |

---

## 11. Verifikasi yang Dijalankan

1. `npx tsc -p tsconfig.json` → bersih (exit 0).
2. `npm run build` → sukses; angka bundle di §7.
3. Server produksi (`node server/index.js`):
   - `GET /` → 200 + CSP/Permissions-Policy/HSTS/nosniff/Referrer-Policy.
   - `GET /studio` → 200 `text/html` (SPA fallback).
   - `GET /assets/*` → `Cache-Control: immutable`.
   - `GET /api/music` tanpa key → 503 `{source:"fallback",reason:"missing_key"}`.
   - 30+ request → 429 (rate limit aktif).
4. Smoke test DOM dengan Chrome headless: landing & `/studio` termount; 25 canvas landing mencapai state `opacity-100` (render selesai, bukan canvas kosong).

**Tidak dijalankan:** Lighthouse, uji jari/klik nyata, uji kamera di perangkat, uji dengan `JAMENDO_CLIENT_ID` asli, audit screen reader.

---

## 12. Batasan yang Diketahui

- **Belum ada test otomatis** (unit/E2E). Verifikasi masih manual + build.
- **Kamera belum diuji di perangkat nyata**; jalur izin-ditolak dan upload galeri sudah ada, tetapi perilaku iOS Safari di lapangan belum dibuktikan.
- **Jamendo belum diuji dengan key asli**; jalur fallback sudah terverifikasi.
- **Lagu Audius hanya untuk diputar di app**, bukan untuk ditempel ke video ekspor: hak pakai ada pada kreator. Untuk musik di hasil ekspor perlu trek berlisensi jelas (Jamendo CC-BY dengan atribusi, atau musik berbayar).
- Tanpa SSR/SEO dinamis (SPA Vite, sesuai pilihan stack).
- Ekspor mode 4 menghasilkan canvas 1200×2352×2 ≈ 5,6 MP (aman, tapi memori ponsel kelas bawah perlu diuji).
- Foto contoh `/demo/*.jpg` hanya untuk pratinjau UI (Unsplash License), bukan fitur produk.

---

## 13. Changelog

### 2026-11-17 — Edisi koran kota
- Frame family baru: halaman depan surat kabar untuk Bandung, Yogyakarta, Surabaya, Jakarta, Semarang, Makassar.
- Layout 600 px: masthead berbingkai, nama kota italic auto-fit, bar tanggal, foto utama grayscale, headline + kotak label, artikel dua kolom justify, foto pendukung bernomor.
- Data riset per kota (fakta, koordinat, nomor edisi, copy) di `src/lib/canvas/cities.ts`.
- Font baru: Playfair Display + Lora (variable, latin) untuk masthead dan isi artikel.
- UI: grup "Edisi koran kota" di pemilih frame; label caption/tanggal menyesuaikan jenis frame.
- Kertas berumur (foxing, vignette, grain), foto sepia + halftone, foto arsip landmark asli, dan lambang kota dari Wikimedia Commons. Tanpa stiker.

### 2026-11-17 — Implementasi v0.1
- Scaffold React 19 + Vite 7 + Tailwind v4 + shadcn/ui (style `new-york`, token OKLCH-ready).
- Design token light/dark lengkap + font self-host (Plus Jakarta Sans, Inter, Pacifico).
- Landing 7 section + FAQ, gaya mengikuti referensi (putih, blob pastel, satu aksen biru, kartu 14 px).
- Canvas engine: 3 layout, 6 frame tema (Kawaii Cat, Y2K Chrome, Coquette, Classic Korean, Groovy 70s, Polaroid), compositor dengan cache gambar.
- Studio end-to-end: kamera → capture → editor → ekspor/share; fallback upload galeri.
- Music jukebox + proxy server zero-dependency dengan rate limit dan header keamanan.
- Optimasi terukur: motion & Radix-accordion keluar dari landing (108 KB gzip JS).
- Perbaikan generator shadcn: `cn` import, `next-themes`, barrel `radix-ui`.

---

## 14. Edisi Koran Kota

**Tujuan:** frame berbentuk halaman depan surat kabar, satu edisi per kota, mengikuti referensi visual: masthead berbingkai, nama kota italic raksasa, bar tanggal, foto utama, headline + kotak label, artikel dua kolom, dan foto pendukung bernomor.

**Enam edisi:** Bandung, Yogyakarta, Surabaya, Jakarta (Monas), Semarang, Makassar.

**Sumber riset (fakta & angle copy):**

| Kota | Sumber utama | Fakta yang dipakai |
|---|---|---|
| Bandung | detikJabar, Kompas, Indonesia Travel | Braga & asal julukan Paris van Java; Gedung Sate 1920–1924, enam bulatan = enam juta gulden; KAA 1955 |
| Yogyakarta | visitingjogja.jogjaprov.go.id, Teras Malioboro, Kompaspedia | Tugu Pal Putih 15 m (versi ketiga, 1889); sumbu Tugu–Malioboro–Keraton; UNESCO 2023 |
| Surabaya | Disbudporapar Surabaya, Suara Surabaya, detikJatim | Tugu Pahlawan 41,15 m (10 lengkungan, 11 ruas); 10 November 1945; Suramadu 5.438 m (2009) |
| Jakarta | Jakarta Tourism, Kompas | Monas 132 m, lahan 80 ha; dibangun 17 Agustus 1961; dibuka 12 Juli 1975 |
| Semarang | Indonesia Travel, detikJateng, CNN Indonesia | Gereja Blenduk 1753; Lawang Sewu 1904 dengan 928 pintu/jendela; Tugu Muda |
| Makassar | SIMCABUD Makassar, Disbudpar Sulsel | Benteng Ujung Pandang 1545; Perjanjian Bungaya 1667 → Fort Rotterdam; Losari |

**Anatomi layout (600 px desain, ekspor 1200 px):**

1. Kepala halaman: tiga sel berbingkai — BERITA KOTA / SnapVibe / EDISI KHUSUS — dengan double rule atas dan garis pemisah.
2. Nama kota: Playfair Display Italic, auto-fit hingga hampir selebar halaman, plus kicker kecil (mis. PARIS VAN JAVA).
3. Bar tanggal: nomor edisi · TENTANG KOTA · tanggal Bahasa Indonesia (berganti jadi koordinat bila tanggal dimatikan).
4. Foto utama 540×320–366, grayscale + border 1 px, caption italic dan koordinat di kanan.
5. Headline serif + emblem SV + kotak label (mis. ARSITEKTUR KOLONIAL).
6. Dek italic, lalu artikel dua kolom dengan justify.
7. Foto pendukung 2–3 buah (mode 3/4) bernomor 01/02/03 dengan fakta ringkas.
8. Footer double rule + nomor halaman.

**Sentuhan vintage & identitas kota:**
- Kertas berumur: wash hangat, vignette tepi, noda foxing deterministik (sama di pratinjau dan ekspor), grain, dan garis pelat cetak.
- Foto: grayscale + sepia + overlay halftone, meniru cetakan koran lama.
- Lambang kota asli di samping headline, dicetak mono dengan blend multiply agar menyatu dengan kertas.
- Foto arsip landmark: Gedung Sate, Tugu Pal Putih, Tugu Pahlawan, Monas, Gereja Blenduk, dan Fort Rotterdam. Semua dari Wikimedia Commons (CC BY-SA 2.0/3.0/4.0 atau domain publik), kredit fotografer dicetak di bawah foto.
- Foto arsip memakai filter grayscale + sepia, overlay halftone 12%, dan bingkai tipis; tidak ada ilustrasi buatan sendiri maupun stiker.
- Aset hanya diunduh saat frame koran dipakai: 6 foto 500 px + 6 lambang 200 px, total ±540 KB, di-cache per sesi.
- Garis kolom tipis di antara dua kolom artikel.

**Teknis:**

- `FrameTheme.editorial` baru: frame menyusun halamannya sendiri; `renderStrip` memanggil `measure` → set ukuran canvas → `paint`, jadi pratinjau dan ekspor tetap satu pipeline.
- `cities.ts` menyimpan data edisi; `newspaper.ts` menyimpan layout + painter; `PAPER_TINTS` menjadi pilihan warna kertas.
- Font Playfair Display + Lora (variable) dimuat lewat `waitForFonts` sebelum render.
- Foto otomatis grayscale lewat `ctx.filter`; caption bawaan edisi dipakai bila caption pengguna masih default.
- UI: grup "Edisi koran kota" di pemilih frame; judul kolom berubah jadi "Caption foto" dan "Warna kertas".

**Verifikasi:** screenshot headless keenam edisi (mode 1) + detail Bandung mode 4 dan Yogyakarta mode 3, crop 1,3× area headline + arsip untuk memastikan lambang, foto, dan kredit tidak bertabrakan, landing merender 31 canvas (30 sudah tergambar), `tsc` + `build` bersih.

**Sumber gambar:** Wikimedia Commons — foto Gedung Sate (Gunawan Kartapranata, CC BY-SA 3.0), Tugu Pal Putih (CEphoto/Uwe Aranas, CC BY-SA 3.0), Tugu Pahlawan (sbamueller, CC BY-SA 2.0), Monas (Ramayoni, CC BY-SA 4.0), Gereja Blenduk (Herusutimbul, CC BY-SA 4.0), Fort Rotterdam (Sanko., CC BY-SA 3.0). Lambang kota berstatus domain publik.

**Revisi tampilan:** lambang 46 px di samping headline dengan filter grayscale 72% + contrast 114%, label rubrik "LAPORAN UTAMA", byline, cutline + kredit foto, kotak fakta di bawah catatan arsip, masthead 27 px. Tinggi halaman mode 1 ±1220 px, mode 3/4 ±1280 px (ekspor 2×).

**Biaya:** landing 118 KB gzip JS, CSS 18,2 KB. Font dan aset koran hanya dimuat ketika frame koran dirender; 12 berkas gambar (±540 KB) ditambahkan ke `public/news/` dan di-cache, bukan bagian dari bundle JS. Foto diperkecil ke 500 px dan lambang 200 px agar cukup untuk ekspor 1200 px tanpa berat berlebih.

---

## 15. Next Step

1. Isi `.env` dengan `JAMENDO_CLIENT_ID`, uji satu sesi dengan streaming asli.
2. Jalankan Lighthouse mobile; jika LCP > 1.8 s, prioritaskan preload hero strip dan tunda render thumbnail koran di landing.
3. Uji kamera di Android Chrome + iOS Safari; catat perilaku izin dan `ctx.filter` (dipakai untuk grayscale koran).
4. Uji ekspor PNG 1200 px untuk edisi koran di perangkat mid-range (kanvas ±1200×2000).
5. Tambah test: unit untuk `layout`/`frames`/`newspaper` (dimensi & snapshot kecil), E2E untuk alur upload → export.
