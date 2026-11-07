import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Local Media & Mock S3 Plugin for Vite
 * Allows full local testing without external Cloudflare tunnels or third-party DNS.
 * Intercepts /api/renditions/... and /api/upload/... requests and returns valid HLS responses.
 */
function localMediaMockPlugin(): Plugin {
  return {
    name: 'local-media-mock-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';

        // 1. Handle local HLS Playlists and MPEG-TS Video Chunks
        if (url.startsWith('/api/renditions')) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          // Master multivariant playlist
          if (url.includes('master.m3u8')) {
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            res.statusCode = 200;
            res.end(`#EXTM3U
#EXT-X-VERSION:6
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio-aac",NAME="English",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="en",URI="audio/aac_128k.m3u8"

# 1080p Full HD Rendition (High Profile 4.2 @ 6.0 Mbps)
#EXT-X-STREAM-INF:BANDWIDTH=6000000,AVERAGE-BANDWIDTH=5500000,RESOLUTION=1920x1080,FRAME-RATE=60.000,CODECS="avc1.64002a,mp4a.40.2",AUDIO="audio-aac"
1080p/index.m3u8

# 720p HD Rendition (Main Profile 3.1 @ 3.0 Mbps)
#EXT-X-STREAM-INF:BANDWIDTH=3000000,AVERAGE-BANDWIDTH=2800000,RESOLUTION=1280x720,FRAME-RATE=60.000,CODECS="avc1.4d401f,mp4a.40.2",AUDIO="audio-aac"
720p/index.m3u8

# 480p SD Mobile Rendition (Main Profile 3.0 @ 1.2 Mbps)
#EXT-X-STREAM-INF:BANDWIDTH=1200000,AVERAGE-BANDWIDTH=1100000,RESOLUTION=854x480,FRAME-RATE=30.000,CODECS="avc1.4d401e,mp4a.40.2",AUDIO="audio-aac"
480p/index.m3u8
`);
            return;
          }

          // Individual rendition media playlist
          if (url.endsWith('.m3u8')) {
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            res.statusCode = 200;
            res.end(`#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:4
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:4.000000,
segment000.ts
#EXTINF:4.000000,
segment001.ts
#EXTINF:4.000000,
segment002.ts
#EXT-X-ENDLIST
`);
            return;
          }

          // Video chunk segments (.ts)
          if (url.endsWith('.ts')) {
            res.setHeader('Content-Type', 'video/mp2t');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.statusCode = 200;
            res.end(Buffer.alloc(188));
            return;
          }

          // Generic rendition metadata query
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({
            status: 'ONLINE',
            origin: 'AetherFlow Local Origin Server',
            streamPath: url,
            protocol: 'HLS v6',
            sslMode: 'Local Direct (Bypasses Cloudflare Tunnels)',
          }));
          return;
        }

        // 2. Handle /api/upload/presigned for local client testing
        if (url.startsWith('/api/upload/presigned')) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const assetId = `asset-${Date.now()}`;
                const jobId = `job-${Date.now()}`;
                const s3Key = `raw-inputs/usr_local/${assetId}/${parsed.filename || 'source.mp4'}`;
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 201;
                res.end(JSON.stringify({
                  uploadUrl: `/api/upload/mock-s3-sink/aetherflow-media-vault/${s3Key}`,
                  s3Bucket: 'aetherflow-media-vault',
                  s3Key,
                  mediaAssetId: assetId,
                  jobId,
                  priority: parsed.priority || 5,
                  expiresInSeconds: 900,
                  headers: {
                    'Content-Type': parsed.mimeType || 'video/mp4',
                    'Content-Length': String(parsed.fileSizeBytes || 0),
                  }
                }));
              } catch {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
              }
            });
            return;
          }
        }

        // 3. Handle /api/upload/mock-s3-sink for PUT direct upload simulation
        if (url.startsWith('/api/upload/mock-s3-sink')) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.setHeader('ETag', '"8d9a24fe1b34cd5678"');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ status: 'SUCCESS', message: 'Local S3 mock chunk saved' }));
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), localMediaMockPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
