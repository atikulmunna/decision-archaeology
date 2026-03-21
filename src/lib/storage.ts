import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function getR2Config() {
  if (
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY ||
    !process.env.R2_ENDPOINT_URL ||
    !process.env.R2_BUCKET_NAME
  ) {
    throw new Error('Missing Cloudflare R2 environment variables')
  }

  return {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    endpoint: process.env.R2_ENDPOINT_URL,
    bucket: process.env.R2_BUCKET_NAME,
  }
}

function getR2Client() {
  const config = getR2Config()

  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

/**
 * Upload a file to Cloudflare R2.
 * @returns The object key stored in R2
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const config = getR2Config()
  const r2 = getR2Client()

  await r2.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
  return key
}

/**
 * Generate a signed URL for private file access (1 hour expiry by default).
 */
export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const config = getR2Config()
  const r2 = getR2Client()
  const command = new GetObjectCommand({ Bucket: config.bucket, Key: key })
  return getSignedUrl(r2, command, { expiresIn })
}

/**
 * Delete a file from R2.
 */
export async function deleteFile(key: string): Promise<void> {
  const config = getR2Config()
  const r2 = getR2Client()
  await r2.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))
}
