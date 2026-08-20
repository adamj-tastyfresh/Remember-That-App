import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { env } from '../config/env';

export { createAttachmentObjectKey } from '../domain/attachment';
let client: S3Client | null = null;

export class AttachmentStorageNotConfiguredError extends Error {
  constructor() {
    super('S3 attachment storage is not configured.');
  }
}

export function isAttachmentStorageConfigured(): boolean {
  return Boolean(
    env.s3.endpoint
    && env.s3.accessKey
    && env.s3.secretKey
    && env.s3.bucket
    && env.s3.region,
  );
}

function getClient(): S3Client {
  if (!isAttachmentStorageConfigured()) throw new AttachmentStorageNotConfiguredError();
  if (!client) {
    client = new S3Client({
      endpoint: env.s3.endpoint,
      region: env.s3.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.s3.accessKey,
        secretAccessKey: env.s3.secretKey,
      },
    });
  }
  return client;
}

export async function putAttachmentObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  await getClient().send(new PutObjectCommand({
    Bucket: env.s3.bucket,
    Key: key,
    Body: body,
    ContentLength: body.byteLength,
    ContentType: contentType,
  }));
}

export async function getAttachmentObject(key: string): Promise<GetObjectCommandOutput> {
  return getClient().send(new GetObjectCommand({ Bucket: env.s3.bucket, Key: key }));
}

export async function deleteAttachmentObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: env.s3.bucket, Key: key }));
}
