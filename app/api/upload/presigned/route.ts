/**
 * Next.js App Router API Route
 * POST /api/upload/presigned
 * Generates an authenticated AWS S3 pre-signed PUT URL for direct client media upload
 * and initializes a pending MediaAsset record.
 */

import { PresignedUploadRequest, PresignedUploadResponse } from '@/lib/types.ts';
import { s3Service } from '@/lib/s3.ts';

export async function POST(request: Request): Promise<Response> {
  try {
    const body: PresignedUploadRequest = await request.json();

    // 1. Input Validation
    if (!body.filename || typeof body.filename !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Field "filename" is required and must be a valid string' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!body.fileSizeBytes || typeof body.fileSizeBytes !== 'number' || body.fileSizeBytes <= 0) {
      return new Response(
        JSON.stringify({ error: 'Field "fileSizeBytes" must be a positive integer' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Max 10 GB file size limit check
    const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 * 1024;
    if (body.fileSizeBytes > MAX_UPLOAD_BYTES) {
      return new Response(
        JSON.stringify({ error: 'File size exceeds maximum permitted limit (10 GB)' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ALLOWED_MIME_TYPES = [
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/x-matroska',
      'audio/mpeg',
      'audio/wav',
      'audio/aac',
      'audio/flac',
      'audio/ogg'
    ];

    if (!ALLOWED_MIME_TYPES.includes(body.mimeType)) {
      return new Response(
        JSON.stringify({
          error: `Unsupported MIME type: ${body.mimeType}. Allowed formats: MP4, MOV, WebM, MKV, MP3, WAV, AAC, FLAC.`
        }),
        { status: 415, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validate & Normalize Job Priority (1 - 10)
    const priority = typeof body.priority === 'number' 
      ? Math.max(1, Math.min(10, Math.floor(body.priority))) 
      : 5;

    // 3. Generate Unique Asset & Job Identifiers
    const mediaAssetId = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const userId = body.userId || 'usr_anonymous_demo';

    // 4. Construct S3 Key Partitioning
    const s3Key = s3Service.generateSourceKey(userId, mediaAssetId, body.filename);

    // 5. Generate Pre-Signed S3 Upload URL (15 min expiration)
    const { uploadUrl, headers } = await s3Service.getPresignedUploadUrl(
      s3Key,
      body.mimeType,
      body.fileSizeBytes,
      900,
      {
        assetId: mediaAssetId,
        uploadedBy: userId,
        originalName: body.filename,
        priority: priority.toString(),
      }
    );

    const responsePayload: PresignedUploadResponse = {
      uploadUrl,
      s3Bucket: process.env.AWS_S3_BUCKET || 'aetherflow-media-vault',
      s3Key,
      mediaAssetId,
      jobId,
      priority,
      expiresInSeconds: 900,
      headers,
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return new Response(
      JSON.stringify({ error: 'Failed to generate pre-signed upload URL', details: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
