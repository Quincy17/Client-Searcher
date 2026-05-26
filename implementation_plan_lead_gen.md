# Implementation Plan — Lead Generation & Outreach Automation
**IT Agency Automated Client Discovery System**
*Versi 1.0 · Mei 2026 · Stack: Next.js · MySQL · Playwright · Gemini API*

---

## Ringkasan Sistem

Sistem ini mengotomatisasi pencarian klien potensial melalui Google Maps, melakukan scoring berbasis algoritma dan AI, generate pesan outreach yang dipersonalisasi, serta melacak pipeline CRM dari kontak pertama hingga closing. Semua proses berjalan semi-manual — sistem mengerjakan bagian berat, Anda melakukan review dan pengiriman akhir.

---

## Alur 5 Fase

| # | Fase | Teknologi | Keterangan |
|---|------|-----------|------------|
| 1 | Discovery | Playwright Scraper | Scrape Google Maps, ambil data bisnis |
| 2 | Scoring | Algorithm + AI Rank | Hitung skor potensi tiap lead |
| 3 | AI Proposal | Gemini API | Generate pesan WA personal per klien |
| 4 | Approval | Human Review | Anda review, edit, approve, atau reject |
| 5 | Outreach | wa.me + CRM | Buka WA, kirim, lacak pipeline |

---

## Tech Stack

| Layer | Tool | Fungsi | Biaya |
|-------|------|--------|-------|
| Framework | Next.js 14 (App Router) | Frontend + Backend + API dalam satu repo | Gratis |
| UI | shadcn/ui + Tailwind CSS | Komponen siap pakai, dashboard modern | Gratis |
| ORM | Prisma | Type-safe MySQL, mudah migrate | Gratis |
| Database | MySQL | Penyimpanan semua data lead & CRM | Gratis (lokal) |
| Scraping | Playwright + playwright-extra | Headless browser, human-like behavior | Gratis |
| AI | Anthropic Gemini API (Sonnet) | Generate pesan + assist scoring | ~$0.05/sesi |
| Job Queue | DB-based (tabel jobs) | Antrian scraping, cukup untuk 20–30 leads | Gratis |
| WhatsApp | wa.me deep link | Buka WA dengan pesan pre-filled | Gratis |

> **Kenapa Next.js, bukan Laravel?** Playwright berjalan native di Node.js tanpa runtime tambahan. Gemini API SDK tersedia langsung untuk JS/TS. Satu codebase untuk scraping + frontend + backend = lebih cepat development dan maintenance.

---

## Database Schema

### Tabel: `scraping_sessions`
```sql
id             INT AUTO_INCREMENT PRIMARY KEY
city           VARCHAR(100)    -- misal: "Surabaya"
niche          VARCHAR(100)    -- misal: "restoran", "klinik"
limit_count    INT DEFAULT 30
status         ENUM('pending','running','done','failed')
total_found    INT DEFAULT 0
created_at     TIMESTAMP DEFAULT NOW()
```

### Tabel: `leads`
```sql
id                   INT AUTO_INCREMENT PRIMARY KEY
session_id           INT  -- FK ke scraping_sessions
-- Data dari Google Maps
name                 VARCHAR(200)
address              TEXT
phone                VARCHAR(30)
website              VARCHAR(300)
rating               DECIMAL(2,1)
review_count         INT
category             VARCHAR(100)
instagram_url        VARCHAR(200)
-- Hasil deteksi
has_website          BOOLEAN DEFAULT FALSE
has_custom_email     BOOLEAN DEFAULT FALSE
-- Hasil scoring & AI
score                INT DEFAULT 0
recommended_service  VARCHAR(200)
-- CRM status
status               ENUM('raw','scored','approved','rejected','contacted',
                     'replied','interested','proposal_sent','closed_won','closed_lost')
follow_up_count      INT DEFAULT 0
notes                TEXT
created_at           TIMESTAMP DEFAULT NOW()
updated_at           TIMESTAMP ON UPDATE NOW()
```

### Tabel: `outreach_messages`
```sql
id            INT AUTO_INCREMENT PRIMARY KEY
lead_id       INT  -- FK ke leads
message_text  TEXT       -- Pesan WA yang di-generate Gemini
version       INT DEFAULT 1  -- Bertambah tiap regenerate
approved_at   TIMESTAMP NULL
wa_link       TEXT       -- Pre-built wa.me URL
created_at    TIMESTAMP DEFAULT NOW()
```

### Tabel: `follow_ups`
```sql
id            INT AUTO_INCREMENT PRIMARY KEY
lead_id       INT
action_type   ENUM('contacted','follow_up','replied','no_reply','closed')
channel       ENUM('whatsapp','email','other')
notes         TEXT
created_at    TIMESTAMP DEFAULT NOW()
```

---

## Detail Fase

### Fase 1 — Lead Discovery

User mengisi form input: kota, niche (dropdown atau free text), dan limit leads (slider 1–30). Setelah submit, sistem membuat record `scraping_session` baru lalu trigger Playwright job di background.

Playwright membuka browser headless, buka `maps.google.com`, search `"{niche} di {kota}"`, scroll daftar hasil, dan untuk tiap listing klik untuk buka detail panel. Data yang diambil:

| Field | Contoh |
|-------|--------|
| Nama bisnis | Warung Makan Bu Sari |
| Alamat | Jl. Raya Darmo No. 12, Surabaya |
| Nomor telepon | +62812xxxx |
| Website (jika ada) | warungbusari.com |
| Rating | 4.3 |
| Jumlah review | 127 |
| Kategori | Restoran · Warung |
| Instagram URL | instagram.com/warungbusari |

> **Anti-bot mitigation:** Gunakan `playwright-extra` + `puppeteer-extra-plugin-stealth`. Tambahkan random delay 1.5–3 detik antar klik. Rotate user-agent. Jangan scrape lebih dari 30 listing per sesi. Jangan jalankan lebih dari 1 sesi bersamaan.

---

### Fase 2 — Lead Scoring

Setelah scraping selesai, scoring berjalan otomatis. Algoritma murni tanpa API call tambahan.

**Bobot scoring:**

| Kriteria | Skor |
|----------|------|
| Tidak punya website | +40 |
| Website jelek / link bio saja | +30 |
| Rating Google > 4.0 | +20 |
| Belum punya landing page | +20 |
| Jumlah review > 20 | +15 |
| Tidak ada domain email bisnis | +15 |
| Ada link Instagram | +10 |
| **Score max potensial** | **150** |

**Recommended service berdasarkan kategori:**

| Niche | Recommended Service |
|-------|-------------------|
| Restoran / Cafe / Kuliner | Landing page + menu digital + reservasi online |
| UMKM / Toko / Retail | Katalog produk digital + WhatsApp order |
| Klinik / Salon / Spa | Appointment & booking system |
| Sekolah / Kursus / Les | Sistem akademik + formulir pendaftaran online |
| Hotel / Penginapan / Villa | Booking system + galeri kamar |
| Jasa / Kontraktor / Lainnya | Company profile web + portfolio |

---

### Fase 3 — AI Proposal Generation

Untuk tiap lead yang sudah di-score, sistem memanggil Gemini API dengan konteks lengkap: nama bisnis, kategori, kota, breakdown masalah yang ditemukan, dan recommended service.

**Output 1 — Pesan WA Outreach:** 150–200 kata, casual tapi profesional, personal, tidak terkesan spam, menyebutkan masalah spesifik bisnis tersebut, dan CTA yang jelas.

**Output 2 — Mini Audit:** 1–2 kalimat ringkasan masalah digital yang dideteksi, digunakan sebagai preview di dashboard approval.

Hasil disimpan ke tabel `outreach_messages` dengan `version = 1`. Jika user regenerate, version bertambah tapi versi lama tetap tersimpan.

---

### Fase 4 — Human Approval Dashboard

Halaman `/campaigns/[id]` menampilkan tabel leads. Tiap baris bisa di-expand untuk lihat preview pesan WA. Tersedia filter by score range, status, dan kategori niche.

| Action | Fungsi |
|--------|--------|
| Approve | Simpan pesan, lead siap untuk outreach |
| Edit | Edit inline pesan WA, lalu approve |
| Regenerate | Minta Gemini buat versi baru (version +1) |
| Reject | Skip lead ini, tidak dihubungi |

---

### Fase 5 — Outreach + CRM Pipeline

Setelah approved, tombol **Buka WhatsApp** membuka `https://wa.me/[phone]?text=[encoded_message]` di tab baru. Setelah klik, status lead otomatis berubah ke `contacted` dan `follow_up_count` bertambah.

**CRM status pipeline:**

| Status | Keterangan |
|--------|-----------|
| `raw` | Baru hasil scraping, belum di-score |
| `scored` | Sudah ada score & recommended service |
| `approved` | Pesan WA disetujui, siap dikirim |
| `contacted` | WA sudah dibuka / pesan sudah dikirim |
| `replied` | Lead membalas pesan |
| `interested` | Lead tertarik, diskusi berlanjut |
| `proposal_sent` | PDF proposal sudah dikirim |
| `closed_won` | Deal berhasil |
| `closed_lost` | Tidak jadi, lead tidak tertarik |

---

## Folder Structure

```
/app
  /api
    scrape/route.ts          → trigger Playwright job
    sessions/[id]/route.ts   → status polling (tiap 2 detik)
    leads/[id]/route.ts      → update status / approve / reject
    generate/route.ts        → panggil Gemini API
    outreach/route.ts        → log klik WA, update follow_up_count
  /(dashboard)
    page.tsx                 → overview stats
    campaigns/page.tsx       → list semua campaign / sesi
    campaigns/new/page.tsx   → form input scraping baru
    campaigns/[id]/page.tsx  → lead list + approval review
    crm/page.tsx             → CRM pipeline view (Kanban / tabel)

/lib
  /scraper
    playwright.ts            → Playwright logic utama
    extractor.ts             → extract field dari Google Maps DOM
    stealth.ts               → anti-bot config & delay
  /scorer
    algorithm.ts             → scoring rules & bobot
    service-matcher.ts       → kategori niche → recommended service
  /ai
    proposal.ts              → generate pesan via Gemini API
    prompts.ts               → template system prompt
  /db
    prisma.ts                → Prisma client singleton

/prisma
  schema.prisma              → definisi semua tabel
  migrations/                → history migration

/public
  /assets
    agency-profile.pdf       → PDF agency Anda (static, dilampirkan sebagai link)
```

---

## Timeline Pengerjaan

| Minggu | Scope | Output |
|--------|-------|--------|
| 1 | Setup project (Next.js, Prisma, MySQL, shadcn), buat semua tabel, layout dashboard dasar | Skeleton app bisa jalan lokal |
| 2 | Playwright scraper + form input kota/niche/limit + progress polling | Bisa scrape dan simpan ke DB |
| 3 | Scoring algorithm + service matcher + Gemini API integration | Lead punya score + pesan ter-generate |
| 4 | Approval dashboard (tabel, preview, approve/edit/reject/regenerate) | Full review flow bisa dipakai |
| 5 | CRM pipeline (status tracking, follow-up log, wa.me button, filter) | System end-to-end lengkap |
| 6 | Testing, edge cases, anti-bot tuning, polishing UI | Production-ready untuk personal use |

---

## Catatan Penting

**Anti-bot Playwright:** Install `playwright-extra` dan `puppeteer-extra-plugin-stealth`. Gunakan `headless: false` saat development untuk debug, ganti ke `headless: true` untuk production. Tambahkan random delay 1.5–3 detik antar setiap aksi. Jangan menjalankan lebih dari satu sesi scraping secara bersamaan.

**Biaya Gemini API:** Dengan 20–30 leads per sesi dan rata-rata ~400 token per pesan, estimasi biaya tidak ada, karena menggunakan api key free tier dari google ai studio, kita menggunakan model gemini 3.1 Flash.

**PDF Agency:** Simpan di `/public/assets/agency-profile.pdf` dan sertakan link download-nya di pesan WA. Tidak perlu generate PDF dinamis per klien.

**Deployment:** Untuk personal use, jalankan lokal dengan `npm run dev`. Jika ingin akses dari mana saja, deploy ke VPS (Hetzner ~€4/bulan, DigitalOcean ~$6/bulan) dengan PM2. Hindari Vercel Serverless untuk scraping — Playwright + Chromium membutuhkan ~150MB dan eksekusi jangka panjang.

**Estimasi biaya keseluruhan:**

| Item | Biaya |
|------|-------|
| Next.js, Playwright, MySQL, Prisma, shadcn/ui | Gratis |
| Gemini API (per sesi 30 leads) | ~$0.03 – $0.05 |
| VPS (opsional) | ~$6/bulan |
| Domain (opsional) | ~$10/tahun |

---

*Implementation Plan — Lead Generation & Outreach Automation System · Mei 2026*
