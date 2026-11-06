/**
 * Core Domain Interfaces & Type Definitions
 * Cloud-Native Media Processing Pipeline
 */

export type AssetStatus = 
  | 'UPLOADING'
  | 'UPLOADED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED'
  | 'ARCHIVED';

export type JobStatus = 
  | 'PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRYING'
  | 'DEAD_LETTER';

export type PipelineStage = 
  | 'IDLE'
  | 'CLIENT_UPLOAD'
  | 'S3_INGEST'
  | 'BULLMQ_DISPATCH'
  | 'PROBE_METADATA'
  | 'TRANSCODE_480P'
  | 'TRANSCODE_720P'
  | 'TRANSCODE_1080P'
  | 'GENERATE_HLS_MASTER'
  | 'SPRITE_SHEET_GEN'
  | 'AUDIO_SPECTRUM_EXTRACT'
  | 'S3_CDN_SYNC'
  | 'COMPLETED'
  | 'FAILED_DLQ';

export type LogSeverity = 'INFO' | 'WARN' | 'ERROR' | 'PROGRESS' | 'FFMPEG_RAW' | 'SUCCESS';

export interface LogEntry {
  id: string;
  timestamp: string;
  severity: LogSeverity;
  message: string;
  stage?: PipelineStage;
  metadata?: Record<string, unknown>;
}

export interface FfmpegProgressData {
  frame: number;
  fps: number;
  q: number;
  sizeKb: number;
  timeSeconds: number;
  bitrateKbps: number;
  speedMultiplier: number;
  percent: number;
}

export interface RenditionProfile {
  resolutionLabel: '1080p' | '720p' | '480p' | '360p';
  width: number;
  height: number;
  videoBitrateKbps: number;
  audioBitrateKbps: number;
  maxrateKbps: number;
  bufsizeKbps: number;
  profile: 'high' | 'main' | 'baseline';
  level: string;
  segmentDurationSeconds: number;
}

export interface MediaProbeMetadata {
  formatName: string;
  durationSeconds: number;
  fileSizeBytes: number;
  overallBitRate: number;
  videoCodec: string;
  width: number;
  height: number;
  frameRate: number;
  aspectRatio: string;
  pixelFormat: string;
  audioCodec?: string;
  audioChannels?: number;
  audioSampleRate?: number;
}

export interface MediaAssetRecord {
  id: string;
  userId: string;
  title: string;
  originalName: string;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds: number;
  width: number;
  height: number;
  frameRate: number;
  aspectRatio: string;
  s3SourceBucket: string;
  s3SourceKey: string;
  status: AssetStatus;
  masterPlaylistUrl?: string;
  thumbnailUrl?: string;
  spriteSheetUrl?: string;
  waveformJsonUrl?: string;
  metadata?: MediaProbeMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface RenditionRecord {
  id: string;
  mediaAssetId: string;
  resolution: '1080p' | '720p' | '480p' | '360p';
  width: number;
  height: number;
  videoBitrateBps: number;
  audioBitrateBps: number;
  codec: string;
  container: string;
  playlistUrl: string;
  segmentCount: number;
  totalSizeBytes: number;
  createdAt: string;
}

export interface ProcessingJobRecord {
  id: string;
  mediaAssetId: string;
  bullQueueJobId?: string;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxRetries: number;
  progressPercent: number;
  currentFps: number;
  currentBitrate: string;
  currentStage: PipelineStage;
  errorMessage?: string;
  workerId?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface TranscodeJobPayload {
  jobId: string;
  mediaAssetId: string;
  sourceBucket: string;
  sourceKey: string;
  destBucket: string;
  destPrefix: string;
  renditions: RenditionProfile[];
  generateSpriteSheet: boolean;
  extractAudioSpectrum: boolean;
  priority: number;
}

export interface SSEPipelineEvent {
  type: 'PROGRESS' | 'LOG' | 'STAGE_CHANGE' | 'HEARTBEAT' | 'COMPLETE' | 'ERROR';
  jobId: string;
  stage: PipelineStage;
  percent: number;
  fps?: number;
  bitrate?: string;
  etaSeconds?: number;
  log?: LogEntry;
  renditions?: RenditionRecord[];
  masterPlaylistUrl?: string;
  error?: string;
  timestamp: string;
}

export interface PresignedUploadRequest {
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  userId?: string;
  title?: string;
  priority?: number; // Job priority from 1 (lowest) to 10 (highest/VIP)
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  s3Bucket: string;
  s3Key: string;
  mediaAssetId: string;
  jobId: string;
  priority: number;
  expiresInSeconds: number;
  headers: Record<string, string>;
}
