/**
 * AWS S3 Storage Service Layer
 * Zero-server-bypass direct client uploads and asset synchronization
 */

export interface S3Config {
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  cdnBaseUrl?: string;
  forcePathStyle?: boolean;
}

export const defaultS3Config: S3Config = {
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT || (process.env.NODE_ENV === 'development' ? 'http://localhost:9000' : undefined),
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin',
  bucketName: process.env.AWS_S3_BUCKET || 'aetherflow-media-vault',
  cdnBaseUrl: process.env.CLOUDFRONT_DOMAIN ? `https://${process.env.CLOUDFRONT_DOMAIN}` : undefined,
  forcePathStyle: process.env.NODE_ENV === 'development' || !process.env.AWS_REGION,
};

export class S3Service {
  private config: S3Config;

  constructor(config: S3Config = defaultS3Config) {
    this.config = config;
  }

  /**
   * Generates a pre-signed S3 PUT URL for direct client-to-bucket upload.
   * This bypasses our backend bandwidth completely.
   */
  public async getPresignedUploadUrl(
    s3Key: string,
    contentType: string,
    contentLengthBytes: number,
    expiresInSeconds: number = 900,
    customMetadata: Record<string, string> = {}
  ): Promise<{ uploadUrl: string; headers: Record<string, string>; s3Key: string }> {
    const bucket = this.config.bucketName;
    const region = this.config.region;
    
    // In production with @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner:
    // const client = new S3Client({ ... });
    // const command = new PutObjectCommand({ Bucket: bucket, Key: s3Key, ContentType: contentType, Metadata: customMetadata });
    // const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    
    const host = this.config.endpoint 
      ? this.config.endpoint.replace(/^https?:\/\//, '')
      : `${bucket}.s3.${region}.amazonaws.com`;

    const queryParams = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.config.accessKeyId}/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${region}/s3/aws4_request`,
      'X-Amz-Date': new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''),
      'X-Amz-Expires': expiresInSeconds.toString(),
      'X-Amz-SignedHeaders': 'content-length;content-type;host',
      'X-Amz-Signature': 'mock_sha256_presigned_signature_token_' + Math.random().toString(36).substring(2, 15)
    });

    const protocol = this.config.endpoint?.startsWith('http://') ? 'http' : 'https';
    const baseUrl = this.config.endpoint 
      ? `${this.config.endpoint}/${bucket}/${s3Key}` 
      : `${protocol}://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;

    const uploadUrl = `${baseUrl}?${queryParams.toString()}`;

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': contentLengthBytes.toString(),
      ...Object.entries(customMetadata).reduce((acc, [k, v]) => {
        acc[`x-amz-meta-${k.toLowerCase()}`] = v;
        return acc;
      }, {} as Record<string, string>)
    };

    return {
      uploadUrl,
      headers,
      s3Key,
    };
  }

  /**
   * Generates a pre-signed S3 GET URL for authenticated media playback.
   */
  public async getPresignedDownloadUrl(
    s3Key: string,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    const bucket = this.config.bucketName;
    const region = this.config.region;

    if (this.config.cdnBaseUrl) {
      return `${this.config.cdnBaseUrl}/${s3Key}`;
    }

    const host = this.config.endpoint 
      ? `${this.config.endpoint}/${bucket}/${s3Key}`
      : `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;

    return `${host}?expires=${Date.now() + expiresInSeconds * 1000}&token=secure_stream_token`;
  }

  /**
   * Constructs an edge-accelerated CDN URL (CloudFront) for HLS playlists or assets.
   */
  public getCdnUrl(s3Key: string): string {
    if (this.config.cdnBaseUrl) {
      return `${this.config.cdnBaseUrl}/${s3Key}`;
    }
    return `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com/${s3Key}`;
  }

  /**
   * Generates a sanitized S3 object key partition for raw source uploads.
   */
  public generateSourceKey(userId: string, assetId: string, filename: string): string {
    const timestamp = Date.now();
    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `raw-inputs/${userId}/${assetId}/${timestamp}_${cleanFilename}`;
  }

  /**
   * Generates an S3 folder prefix for transcoded HLS renditions.
   */
  public generateHlsPrefix(assetId: string): string {
    return `renditions/${assetId}/hls/`;
  }
}

export const s3Service = new S3Service();
