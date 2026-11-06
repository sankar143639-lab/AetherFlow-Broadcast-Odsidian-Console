/**
 * FFmpeg Child Process Core Transcoder
 * Multi-bitrate HLS streams, master playlist compilation, WebP sprite sheets,
 * and audio waveform extraction.
 */

import { RenditionProfile, FfmpegProgressData, MediaProbeMetadata } from '../lib/types.ts';

export const STANDARD_RENDITIONS: RenditionProfile[] = [
  {
    resolutionLabel: '1080p',
    width: 1920,
    height: 1080,
    videoBitrateKbps: 5000,
    audioBitrateKbps: 192,
    maxrateKbps: 5350,
    bufsizeKbps: 7500,
    profile: 'high',
    level: '4.2',
    segmentDurationSeconds: 4,
  },
  {
    resolutionLabel: '720p',
    width: 1280,
    height: 720,
    videoBitrateKbps: 2800,
    audioBitrateKbps: 128,
    maxrateKbps: 3000,
    bufsizeKbps: 4200,
    profile: 'main',
    level: '3.1',
    segmentDurationSeconds: 4,
  },
  {
    resolutionLabel: '480p',
    width: 854,
    height: 480,
    videoBitrateKbps: 1200,
    audioBitrateKbps: 96,
    maxrateKbps: 1400,
    bufsizeKbps: 2000,
    profile: 'main',
    level: '3.0',
    segmentDurationSeconds: 4,
  },
];

export interface TranscodeResult {
  renditionOutputs: Array<{
    resolution: string;
    playlistFilename: string;
    segmentCount: number;
    totalSizeBytes: number;
  }>;
  masterPlaylistContent: string;
  thumbnailFilename: string;
  spriteSheetFilename: string;
  waveformJsonFilename: string;
  durationSeconds: number;
}

export class FfmpegService {
  /**
   * Generates FFmpeg CLI arguments for an HLS variant rendition.
   */
  public buildVariantCommand(
    inputPath: string,
    outputDir: string,
    profile: RenditionProfile
  ): string[] {
    const playlistPath = `${outputDir}/${profile.resolutionLabel}.m3u8`;
    const segmentPattern = `${outputDir}/${profile.resolutionLabel}_%03d.ts`;

    return [
      '-y',
      '-i', inputPath,
      '-vf', `scale=w=${profile.width}:h=${profile.height}:force_original_aspect_ratio=decrease,pad=${profile.width}:${profile.height}:(ow-iw)/2:(oh-ih)/2`,
      '-c:v', 'libx264',
      '-profile:v', profile.profile,
      '-level:v', profile.level,
      '-b:v', `${profile.videoBitrateKbps}k`,
      '-maxrate', `${profile.maxrateKbps}k`,
      '-bufsize', `${profile.bufsizeKbps}k`,
      '-preset', 'medium',
      '-g', '48',
      '-keyint_min', '48',
      '-sc_threshold', '0',
      '-c:a', 'aac',
      '-b:a', `${profile.audioBitrateKbps}k`,
      '-ar', '48000',
      '-ac', '2',
      '-f', 'hls',
      '-hls_time', profile.segmentDurationSeconds.toString(),
      '-hls_playlist_type', 'vod',
      '-hls_flags', 'independent_segments',
      '-hls_segment_type', 'mpegts',
      '-hls_segment_filename', segmentPattern,
      playlistPath,
    ];
  }

  /**
   * Builds the master playlist content (.m3u8) linking all variant renditions.
   */
  public generateMasterPlaylist(profiles: RenditionProfile[] = STANDARD_RENDITIONS): string {
    let content = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

    for (const p of profiles) {
      const totalBandwidth = (p.videoBitrateKbps + p.audioBitrateKbps) * 1000;
      const avgBandwidth = Math.round(totalBandwidth * 0.95);
      
      content += `#EXT-X-STREAM-INF:BANDWIDTH=${totalBandwidth},AVERAGE-BANDWIDTH=${avgBandwidth},RESOLUTION=${p.width}x${p.height},FRAME-RATE=30.000,CODECS="avc1.4d401f,mp4a.40.2"\n`;
      content += `${p.resolutionLabel}.m3u8\n\n`;
    }

    return content;
  }

  /**
   * Builds command for extracting a WebP thumbnail sprite sheet.
   * Every 5 seconds, 160x90 frames in a 5x5 grid (25 frames per sheet).
   */
  public buildSpriteSheetCommand(inputPath: string, outputPath: string): string[] {
    return [
      '-y',
      '-i', inputPath,
      '-vf', 'fps=1/5,scale=160:90,tile=5x5',
      '-qscale:v', '75',
      outputPath,
    ];
  }

  /**
   * Builds command for audio waveform/spectrum data extraction.
   */
  public buildAudioSpectrumCommand(inputPath: string, outputPath: string): string[] {
    return [
      '-y',
      '-i', inputPath,
      '-vn',
      '-filter_complex', 'aformat=channel_layouts=mono,compand,showwavespic=s=1200x120:colors=#06B6D4',
      outputPath,
    ];
  }

  /**
   * Parses standard FFmpeg stderr progress chunks.
   */
  public parseFfmpegProgress(chunk: string, totalDurationSeconds: number): FfmpegProgressData | null {
    const frameMatch = chunk.match(/frame=\s*(\d+)/);
    const fpsMatch = chunk.match(/fps=\s*([\d.]+)/);
    const qMatch = chunk.match(/q=\s*([\d.-]+)/);
    const sizeMatch = chunk.match(/size=\s*(\d+)kB/);
    const timeMatch = chunk.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    const bitrateMatch = chunk.match(/bitrate=\s*([\d.]+)kbits\/s/);
    const speedMatch = chunk.match(/speed=\s*([\d.]+)x/);

    if (!timeMatch) return null;

    const hours = parseFloat(timeMatch[1]);
    const minutes = parseFloat(timeMatch[2]);
    const seconds = parseFloat(timeMatch[3]);
    const currentTimeSeconds = hours * 3600 + minutes * 60 + seconds;

    const percent = totalDurationSeconds > 0 
      ? Math.min(100, (currentTimeSeconds / totalDurationSeconds) * 100) 
      : 0;

    return {
      frame: frameMatch ? parseInt(frameMatch[1], 10) : 0,
      fps: fpsMatch ? parseFloat(fpsMatch[1]) : 0,
      q: qMatch ? parseFloat(qMatch[1]) : 0,
      sizeKb: sizeMatch ? parseInt(sizeMatch[1], 10) : 0,
      timeSeconds: currentTimeSeconds,
      bitrateKbps: bitrateMatch ? parseFloat(bitrateMatch[1]) : 0,
      speedMultiplier: speedMatch ? parseFloat(speedMatch[1]) : 1.0,
      percent: Math.round(percent * 10) / 10,
    };
  }

  /**
   * Generates sample audio frequency bins for visual spectrum analyzers.
   */
  public generateSpectrumBins(sampleCount: number = 64): number[] {
    const bins: number[] = [];
    for (let i = 0; i < sampleCount; i++) {
      const decay = Math.pow(1 - i / sampleCount, 0.7);
      const val = (Math.sin(i * 0.4) * 0.3 + 0.5) * decay;
      bins.push(Math.max(0.05, Math.min(0.98, val)));
    }
    return bins;
  }
}

export const ffmpegService = new FfmpegService();
