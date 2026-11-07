# AetherFlow — Cloud-Native Media Processing Pipeline & Broadcast Console

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22_LTS-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Java](https://img.shields.io/badge/Java-21_LTS_Spring_Boot_3.3-orange?style=flat-square&logo=openjdk)](https://spring.io/projects/spring-boot)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-6.1_libx264_aac-red?style=flat-square&logo=ffmpeg)](https://ffmpeg.org/)
[![BullMQ](https://img.shields.io/badge/Queue-BullMQ_Redis_Stream-crimson?style=flat-square&logo=redis)](https://bullmq.io/)
[![AWS S3](https://img.shields.io/badge/Storage-AWS_S3_SigV4-yellow?style=flat-square&logo=amazons3)](https://aws.amazon.com/s3/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma_PostgreSQL-indigo?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_v4_Dual_Theme-teal?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)

AetherFlow is an enterprise-grade, cloud-native distributed media processing pipeline and real-time broadcast operations console. Engineered with zero server-bypass direct S3 uploads, Redis-backed BullMQ priority queues (1–10 ranking), automated multi-bitrate HLS adaptive ladder generation, multi-stage dead-letter queue (DLQ) retry backoff, and dual-runtime workers (Node.js 22 LTS & Java 21 Spring Boot).

---

## 📐 High-Level System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Browser Layer"]
        UI["AetherFlow Broadcast Console\n(React 19 + Tailwind CSS v4)"]
        Player["Adaptive HLS Monitor\n(SMPTE Drop-Frame + Scopes)"]
    end

    subgraph Gateway ["Ingress & Control Plane"]
        API["Next.js / Express API Gateway\n(/api/upload/presigned)"]
        SSE["SSE Telemetry Broadcaster\n(/api/jobs/:id/events)"]
        DB[("PostgreSQL Database\n(Prisma ORM)")]
    end

    subgraph Queue ["Message Broker & State Engine"]
        Redis[("Redis Cluster / BullMQ\nPriority Streams (P1 - P10)")]
        DLQ[("Dead Letter Queue (DLQ)\nQuarantine (14-day retention)")]
    end

    subgraph Workers ["Distributed Transcode Workers"]
        NodeWorker["Node.js 22 Worker Pool\n(FFmpeg 6.1 Child Process Transcoder)"]
        JavaWorker["Java 21 Spring Boot Worker\n(Lettuce Redis + AWS SDK v2)"]
    end

    subgraph Storage ["Cloud Storage & Edge Delivery"]
        S3Raw[("AWS S3 / MinIO Raw Bucket\n(SigV4 PUT Direct Upload)")]
        S3Out[("AWS S3 Processed Rendition Vault\n(HLS Chunks, M3U8, WebP Sprites)")]
        CDN["CloudFront / Edge Global Mesh\n(Sub-10ms TTFB Distribution)"]
    end

    %% Flow Steps
    UI -->|"1. Request SigV4 Pre-Signed PUT (Priority P1-10)"| API
    API -->|"2. Create Pending Asset & Job Record"| DB
    API -->|"3. Dispatch Job to BullMQ with Priority"| Redis
    API -->|"4. Return Signed URL & ETag Parameters"| UI
    UI -->|"5. Direct Multi-Part Stream (Zero-Bypass)"| S3Raw

    Redis -->|"6. Consume Prioritized Job (P10 > P1)"| NodeWorker
    Redis -.->|"Alternative Enterprise Consumer"| JavaWorker

    NodeWorker -->|"7. Fetch Master Media"| S3Raw
    NodeWorker -->|"8. Multi-Pass Transcode (1080p, 720p, 480p, Sprites, FFT)"| NodeWorker
    NodeWorker -->|"9. Upload Renditions, Playlists & Assets"| S3Out
    NodeWorker -->|"10. Update DB Status: READY"| DB
    NodeWorker -->|"11. Push Real-Time FPS, Bitrate & Telemetry"| SSE
    NodeWorker -.->|"On 3 Failed Retries"| DLQ

    SSE -->|"12. Live Server-Sent Events Stream"| UI
    S3Out --> CDN
    CDN -->|"13. Adaptive HLS Playback"| Player
```

---

## 🎨 Visual Identity & UI/UX Constitution

AetherFlow delivers a calibrated dual-theme operations deck compliant with professional broadcast standards:

### 1. Dual-Theme Architectural System
* **Obsidian Broadcast Deck (`dark`)**:
  * Background: `#070A0F` ultra-deep carbon.
  * Overlays: `backdrop-blur-md bg-slate-900/60` with precision millimeter tick marks (`+ INGEST_GATEWAY::CH_01`).
  * Signal Accents: Electric Cyan (`#06B6D4`), Neon Amber (`#F59E0B`), Matrix Emerald (`#10B981`).
  * Scopes: High-contrast CRT scanlines (`.crt-overlay`) with polar chrominance targets.
* **Daylight Calibrated Lab (`light`)**:
  * Background: `#FFFFFF` / `#F8FAFC` clean laboratory canvas with technical dot-matrix grid (`.bg-studio-grid`).
  * Overlays: `backdrop-blur-md bg-white/95 border border-slate-200 shadow-xl`.
  * Typography: Deep Slate `#0F172A` headings with `#475569` metadata labels.
* **Instant Mode Switching**:
  * Explicit segmented **`[ 🌙 Dark ]`** and **`[ ☀️ White ]`** theme buttons in the top navigation bar with persistent client state in `localStorage`.

### 2. Multi-Color Accent Theme Palette
The console includes an interactive color swatch selector that updates the entire visual hierarchy:
* ⚡ **Electric Cyan** (`#06B6D4`): Default cyber-industrial signal telemetry.
* 🟢 **Matrix Emerald** (`#10B981`): SMPTE broadcast verification and clean pass-through.
* 🟡 **Broadcast Amber** (`#F59E0B`): Fast-track alert priority and live uplink telemetry.
* 🟣 **Cyber Violet** (`#8B5CF6`): Quantum optics and multi-angle broadcast framing.

### 3. Pipeline Graph: Active Node Pulse & Directional Media Flow
* **Active Node Pulse Animation**:
  * Breathing ambient halo ring (`boxShadow: [0 0 0 1px ..., 0 0 0 4px ..., 0 0 0 1px ...]`).
  * Dual-ring radar ping wave behind the stage hardware icon (`animate-ping` + `animate-pulse`).
  * Live radiating `ACTIVE` beacon indicator badge in the top right.
  * Internal laser scanline sweep moving across active raster stages.
* **Directional Data Packet Streaming Conduit**:
  * High-visibility fiber-optic pipeline track bridging each stage.
  * Flowing luminous photon packets travel continuously from left to right (`x: [-12px, 18px]`) in the exact direction of media movement (`Ingest Gate ➔ Priority Broker ➔ Transcode Matrix ➔ Rendition Vault ➔ Edge Distribution`).
  * Animated directional chevrons (`ChevronRight` on desktop, `ChevronDown` on mobile) pulse in real-time along the active transmitting link.

---

## ⚡ Core Technical Specifications

### 1. Zero-Server-Bypass Direct S3 Client Ingest
* Direct client-to-S3 multi-part streaming utilizing `@aws-sdk/s3-request-presigner` and `@aws-sdk/client-s3`.
* Generates SHA-256 HMAC SigV4 signed URLs with client metadata validation (MIME type check, file size limit, UUID partitioning).
* Server memory and CPU are completely bypassed during master upload.

### 2. BullMQ Priority Queue & DLQ Retry Backoff
* **Priority Calibration (1–10)**:
  * Users adjust a calibrated range slider before upload:
    * `P1 - P3`: Low / Batch Background processing.
    * `P4 - P6`: Standard Ingestion queue.
    * `P7 - P8`: Elevated Fast-Track transcode.
    * `P9 - P10`: VIP Real-Time / Live Stream immediate processing.
  * Mapped internally to BullMQ's ascending rank priority (`priority: 11 - userPriority`).
* **Dead Letter Queue (DLQ)**:
  * Exponential backoff retry policy: $3\text{s} \rightarrow 9\text{s} \rightarrow 27\text{s}$.
  * Automatic quarantine to `media-transcode-dlq` upon 3 consecutive failures.
  * In-console fault injection toggle to verify DLQ recovery flows.

### 3. Adaptive Multi-Bitrate HLS Ladder (FFmpeg 6.1)
The transcode worker automatically extracts metadata via `ffprobe` and executes multi-stream encoding:
| Rendition | Resolution | Video Bitrate | Audio Bitrate | Keyframe Interval (GOP) | Codec |
|---|---|---|---|---|---|
| **1080p Full HD** | 1920 × 1080 | 5,000 kbps | 192 kbps | 2s or 4s (Strict IDR) | H.264 / AAC |
| **720p HD** | 1280 × 720 | 2,800 kbps | 128 kbps | 2s or 4s (Strict IDR) | H.264 / AAC |
| **480p SD** | 854 × 480 | 1,200 kbps | 96 kbps | 2s or 4s (Strict IDR) | H.264 / AAC |

Additional generated assets:
* **HLS Master Manifest (`master.m3u8`)**: Adaptive bitrate switching manifest with `#EXT-X-STREAM-INF` definitions.
* **5×5 WebP Scrubbing Sprite Sheet**: 25-frame preview sheet with VTT timeline coordinates for zero-latency timeline scrubbing.
* **FFT Audio Spectrum Bins**: 64-band normalized frequency waveform JSON for broadcast vector scopes.

### 4. Dual-Runtime Worker Architecture
* **Node.js 22 LTS Worker** (`worker/index.ts`, `worker/ffmpegService.ts`):
  * Asynchronous `child_process.spawn` pipeline wrapper with stdout/stderr frame parser.
  * Real-time progress calculation: current FPS, current bitrate, timecode, and completion percentage.
* **Enterprise Java 21 Worker** (`java-worker/MediaProcessingWorker.java`):
  * High-performance Spring Boot 3.3 microservice.
  * Multi-threaded consumer using **Lettuce Redis Streams** and **AWS SDK for Java v2**.
  * Executes system-level FFmpeg bindings for enterprise deployments requiring OpenJDK compliance.

---

## 🗄️ Relational Database Schema (Prisma ORM)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum AssetStatus {
  UPLOADING
  UPLOADED
  QUEUED
  PROCESSING
  READY
  FAILED
  ARCHIVED
}

enum JobStatus {
  PENDING
  ACTIVE
  COMPLETED
  FAILED
  RETRYING
  DEAD_LETTER
}

model User {
  id           String        @id @default(uuid())
  email        String        @unique
  name         String?
  apiKey       String        @unique @default(uuid())
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  mediaAssets  MediaAsset[]
}

model MediaAsset {
  id              String          @id @default(uuid())
  userId          String
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  title           String
  originalName    String
  mimeType        String
  fileSizeBytes   BigInt
  durationSeconds Float?
  width           Int?
  height          Int?
  frameRate       Float?
  s3SourceBucket  String
  s3SourceKey     String
  status          AssetStatus     @default(UPLOADING)
  masterPlaylist  String?
  thumbnailUrl    String?
  spriteSheetUrl  String?
  waveformJsonUrl String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  renditions      Rendition[]
  processingJobs  ProcessingJob[]
}

model ProcessingJob {
  id              String        @id @default(uuid())
  mediaAssetId    String
  mediaAsset      MediaAsset    @relation(fields: [mediaAssetId], references: [id], onDelete: Cascade)
  bullJobId       String?       @unique
  status          JobStatus     @default(PENDING)
  priority        Int           @default(5)
  progressPercent Float         @default(0.0)
  currentFps      Float?
  currentBitrate  String?
  attempts        Int           @default(0)
  maxAttempts     Int           @default(3)
  errorMessage    String?
  stage           String        @default("IDLE")
  startedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model Rendition {
  id              String        @id @default(uuid())
  mediaAssetId    String
  mediaAsset      MediaAsset    @relation(fields: [mediaAssetId], references: [id], onDelete: Cascade)
  resolution      String
  width           Int
  height          Int
  videoBitrateBps Int
  audioBitrateBps Int
  playlistUrl     String
  s3Prefix        String
  segmentCount    Int           @default(0)
  createdAt       DateTime      @default(now())
}
```

---

## 🔌 API Reference

### 1. Pre-Signed S3 Upload Allocation
`POST /api/upload/presigned`

**Request Headers:** `Content-Type: application/json`

**Request Body:**
```json
{
  "filename": "master_broadcast_4k.mov",
  "fileSizeBytes": 4294967296,
  "mimeType": "video/quicktime",
  "priority": 9
}
```

**Response (`200 OK`):**
```json
{
  "uploadUrl": "https://aetherflow-raw-ingest.s3.us-east-1.amazonaws.com/raw/2026/11/05/uuid_master_broadcast_4k.mov?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
  "s3Key": "raw/2026/11/05/uuid_master_broadcast_4k.mov",
  "mediaAssetId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "jobId": "job_01h7x8...",
  "priority": 9,
  "expiresInSeconds": 3600
}
```

---

### 2. Server-Sent Events (SSE) Real-Time Progress Stream
`GET /api/jobs/:jobId/events`

**Response Headers:**
```http
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
Connection: keep-alive
```

**Stream Payload Format:**
```
data: {"type":"STAGE_CHANGE","stage":"TRANSCODE_1080P","percent":35,"message":"Transcoding 1080p (5000 kbps, libx264)..."}

data: {"type":"PROGRESS","percent":58,"fps":59.4,"bitrate":"4980 kbps"}

data: {"type":"COMPLETE","stage":"COMPLETED","percent":100,"masterPlaylistUrl":"https://cdn.aetherflow.io/renditions/uuid/master.m3u8"}
```

---

## 🎛️ In-Console Professional Diagnostics

### 1. SMPTE Timecode & Framing Monitor
* Precise drop-frame timecode counter format: `01:23:45;12`.
* Multi-aspect ratio framing guides with safe action overlays:
  * **16:9** Television standard
  * **2.39:1** Anamorphic theatrical letterbox
  * **9:16** Vertical mobile format
  * **1:1** Square social framing
* Single-frame jog-shuttle stepping (`-1 frame`, `+1 frame` at 1/30s resolution).

### 2. HLS 24-Chunk Micro-Tile Matrix
* Visualized micro-tile matrix displaying 24 real-time `.ts` transport stream segments.
* Instant Deep-Packet inspection drawer showing:
  * Presentation Timestamp (`PTS 00:01:16.000`)
  * Packet size (KB) & target bitrate (kbps)
  * Frame classification (`IDR I-Frame` keyframe vs. `P-Frame`)
  * Cryptographic integrity SHA-256 checksums

### 3. Optical Signal Scopes
* **Luma Waveform (0–100 IRE)**: Luminance density and black-level clipping detection.
* **RGB Parade**: Discrete Red, Green, and Blue color channel balance comparison.
* **Chrominance Vectorscope**: Polar target alignment with SMPTE color bars (Yellow, Cyan, Green, Magenta, Red, Blue).
* **EBU R128 Loudness Radar**: True Peak (dBTP) and Integrated LUFS broadcast loudness compliance meters.

---

## 🚀 Local Development & Deployment

### Prerequisites
* **Node.js**: v20+ LTS (Node.js 22 recommended)
* **Docker & Docker Compose**: v2.20+
* **FFmpeg**: v6.0+ (installed in local environment or run via Docker)

### 1. Clone & Configure Environment
```bash
git clone https://github.com/your-org/aetherflow.git
cd aetherflow
cp .env.example .env
```

Ensure `.env` contains:
```env
# Application Port
PORT=3000

# PostgreSQL Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aetherflow?schema=public"

# Redis BullMQ Cluster
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# AWS S3 / MinIO Configuration
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="minioadmin"
AWS_SECRET_ACCESS_KEY="minioadmin"
S3_BUCKET_RAW="aetherflow-raw-ingest"
S3_BUCKET_OUTPUT="aetherflow-rendition-vault"
S3_ENDPOINT="http://localhost:9000"
S3_FORCE_PATH_STYLE="true"
CDN_BASE_URL="http://localhost:9000/aetherflow-rendition-vault"
```

### 2. Multi-Container Orchestration (Docker Compose)
To start PostgreSQL, Redis, MinIO S3 emulator, the Next.js App, and the FFmpeg Transcode Worker simultaneously:

```bash
docker compose up -d --build
```

Container topology:
* **App Console**: `http://localhost:3000`
* **MinIO Console**: `http://localhost:9001` (Credentials: `minioadmin` / `minioadmin`)
* **PostgreSQL**: `localhost:5432`
* **Redis**: `localhost:6379`

### 3. Run Standalone Node.js Development Server
```bash
# Install dependencies
npm install

# Run database schema migrations
npx prisma db push

# Start Vite React development server
npm run dev
```

### 4. Run Enterprise Java Worker
```bash
cd java-worker
mvn clean package
java -jar target/media-processing-worker-1.0.0.jar
```

---

## 🔒 Cloudflare Edge CDN & SSL/TLS Configuration Guide

### 1. Local Testing Without Cloudflare Tunnels
When testing the media pipeline locally, **avoid routing requests through external domain links like `cdn.aetherflow.io` over Cloudflare tunnels**. Cloudflare tunnels running without proper origin certificates can trigger **HTTP 520 (Web Server Returned an Unknown Error)** or **HTTP 521 (Web Server Is Down)**.

Instead, AetherFlow is configured to use first-party local relative endpoints:
* **HLS Master & Variant Playlists**: `/api/renditions/renditions/[assetId]/hls/master.m3u8`
* **Local S3 Chunk Sink**: `/api/upload/mock-s3-sink/[bucket]/[key]`
* **Vite Mock Media Plugin**: Built directly into `vite.config.ts` to deliver RFC 8216-compliant `#EXTM3U` manifests and simulated `.ts` chunks locally on port 3000 with zero external dependencies.

---

### 2. Setting Up Cloudflare For Real Production Domains
If you are pointing your production domain or CDN subdomain (e.g. `media.yourdomain.com`) to your origin server via Cloudflare, ensure your SSL/TLS encryption mode and origin listener are configured as follows:

#### A. SSL/TLS Encryption Mode: Full or Full (Strict)
In your **Cloudflare Dashboard** ➔ Navigate to **SSL/TLS** ➔ **Overview**:

| Mode | Security Level | Behavior | Recommendation for Media Streaming |
| :--- | :--- | :--- | :--- |
| **Flexible** | ❌ Insecure | Cloudflare connects to your origin server over plain HTTP on port 80. | **DO NOT USE.** Causes infinite 301/302 redirect loops if origin enforces HTTPS, and modern HLS browsers will block streams due to Mixed Content / CORS errors. |
| **Full** | ⚠️ Encrypted | Cloudflare connects to your origin server over HTTPS on **port 443**, but does not validate certificate authority (accepts self-signed certificates). | **Usable for Staging.** |
| **Full (Strict)** | 🔒 Production Grade | Cloudflare connects to your origin over HTTPS on **port 443** and enforces a valid trusted certificate or Cloudflare Origin CA certificate. | **RECOMMENDED FOR PRODUCTION.** Eliminates Man-In-The-Middle attacks and guarantees zero 521 handshake errors. |

#### B. Origin Server Listener & Certificate (Port 443)
Your origin media server must be actively listening on **port 443** with a valid certificate installed.

1. **Generate Free 15-Year Cloudflare Origin CA Certificate**:
   * In Cloudflare Dashboard ➔ **SSL/TLS** ➔ **Origin Server** ➔ **Create Certificate**.
   * Key type: RSA (2048) or ECDSA.
   * Save Certificate to `/etc/ssl/certs/cloudflare_origin.pem`.
   * Save Private Key to `/etc/ssl/private/cloudflare_origin.key`.

2. **Nginx Origin Configuration (`/etc/nginx/conf.d/media.conf`)**:
```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name media.yourdomain.com;

    # Cloudflare Origin CA Certificate & Private Key
    ssl_certificate /etc/ssl/certs/cloudflare_origin.pem;
    ssl_certificate_key /etc/ssl/private/cloudflare_origin.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Static MPEG-TS Segment Chunks (Aggressively cached at edge)
    location /renditions/ {
        alias /var/media/renditions/;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # HLS Master & Media Playlists (Must bypass cache for live/adaptive updating)
    location ~* \.m3u8$ {
        alias /var/media/renditions/;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        types { application/vnd.apple.mpegurl m3u8; }
    }
}
```

3. **Cloudflare Cache Rules for HLS Delivery**:
   * **Rule 1 (Playlists)**: Match `URI Path contains .m3u8` ➔ Cache Level: **Bypass** (Edge TTL: 0s).
   * **Rule 2 (Segments)**: Match `URI Path contains .ts` ➔ Cache Level: **Cache Everything** (Edge TTL: 1 month).

---

## 📂 Project Directory Structure

```text
├── app/
│   ├── api/
│   │   ├── jobs/[jobId]/events/route.ts  # SSE Real-Time Telemetry Stream
│   │   └── upload/presigned/route.ts     # SigV4 S3 Pre-Signed Upload Endpoint
│   └── page.tsx                          # Primary Unified Broadcast Console
├── components/
│   ├── BroadcastVectorscope.tsx          # Luma Waveform, RGB Parade & EBU Scopes
│   ├── HlsPlayer.tsx                     # Reference Monitor with SMPTE Counter
│   ├── HlsSegmentMatrix.tsx              # 24-Chunk Micro-Tile Inspector
│   ├── LiveTerminalLogs.tsx              # Terminal Log Viewer with Interactive CLI
│   ├── PipelineGraph.tsx                 # Signal Matrix with Pulse & Directional Flow
│   └── UploadZone.tsx                    # Drag-and-Drop Ingest Deck & Priority Slider
├── java-worker/
│   ├── pom.xml                           # Spring Boot 3.3 / Java 21 Dependencies
│   └── MediaProcessingWorker.java        # Enterprise Lettuce Redis + AWS SDK Worker
├── lib/
│   ├── s3.ts                             # AWS S3 SDK v3 SigV4 & Multipart Client
│   └── types.ts                          # Domain Interfaces, Stages & SSE Protocol
├── prisma/
│   └── schema.prisma                     # PostgreSQL Relational Schema
├── worker/
│   ├── ffmpegService.ts                  # Transcoding Engine (HLS, Sprites, FFT)
│   ├── index.ts                          # Worker Loop Orchestrator
│   └── queue.ts                          # BullMQ Redis Producer & DLQ Router
├── Dockerfile                            # Multi-Stage Node.js 22 + FFmpeg 6.1 Build
├── docker-compose.yml                    # App, Worker, Postgres, Redis, MinIO
├── package.json                          # App Dependencies & Scripts
├── tsconfig.json                         # TypeScript Strict Path Configurations
└── README.md                             # Comprehensive Architectural Design Manual
```

---

## 🛡️ License
Licensed under the Apache License, Version 2.0. See `LICENSE` for details.
