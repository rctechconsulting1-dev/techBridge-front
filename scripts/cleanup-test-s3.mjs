#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';

const cwd = process.cwd();

function parseArgs(argv) {
  const args = {
    execute: false,
    confirm: '',
    olderThanDays: null,
    prefixes: null,
    includeAssets: false,
    includePages: false,
  };

  for (const arg of argv) {
    if (arg === '--execute') {
      args.execute = true;
      continue;
    }
    if (arg === '--include-assets') {
      args.includeAssets = true;
      continue;
    }
    if (arg === '--include-pages') {
      args.includePages = true;
      continue;
    }
    if (arg.startsWith('--confirm=')) {
      args.confirm = arg.split('=')[1] || '';
      continue;
    }
    if (arg.startsWith('--older-than-days=')) {
      const raw = arg.split('=')[1];
      const value = Number(raw);
      if (!Number.isNaN(value) && value >= 0) {
        args.olderThanDays = value;
      }
      continue;
    }
    if (arg.startsWith('--prefixes=')) {
      const value = arg.split('=')[1] || '';
      args.prefixes = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      continue;
    }
  }

  return args;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function formatBytes(bytes) {
  if (!bytes) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function listByPrefix(client, bucket, prefix) {
  const objects = [];
  let continuationToken;

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    if (res.Contents?.length) {
      objects.push(...res.Contents);
    }

    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  loadEnvFile(path.join(cwd, '.env.local'));
  loadEnvFile(path.join(cwd, '.env.production'));

  const accessKeyId = process.env.S3_UPLOAD_KEY;
  const secretAccessKey = process.env.S3_UPLOAD_SECRET;
  const bucket = process.env.S3_UPLOAD_BUCKET;
  const region = process.env.S3_UPLOAD_REGION;

  if (!accessKeyId || !secretAccessKey || !bucket || !region) {
    console.error('Missing required S3 env vars (S3_UPLOAD_KEY, S3_UPLOAD_SECRET, S3_UPLOAD_BUCKET, S3_UPLOAD_REGION).');
    process.exit(1);
  }

  const defaultPrefixes = ['next-s3-uploads/', 'uploads/'];
  const autoPrefixes = [
    ...(args.includeAssets ? ['assets/'] : []),
    ...(args.includePages ? ['pages/'] : []),
  ];

  const prefixes = args.prefixes && args.prefixes.length > 0
    ? args.prefixes
    : [...defaultPrefixes, ...autoPrefixes];

  if (prefixes.length === 0) {
    console.error('No prefixes configured. Use --prefixes=... or --include-assets/--include-pages.');
    process.exit(1);
  }

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  const cutoffDate = args.olderThanDays === null
    ? null
    : new Date(Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000);

  const allObjects = [];

  for (const prefix of prefixes) {
    const items = await listByPrefix(client, bucket, prefix);
    for (const item of items) {
      if (!item.Key) {
        continue;
      }

      if (cutoffDate && item.LastModified && item.LastModified > cutoffDate) {
        continue;
      }

      allObjects.push(item);
    }
  }

  const uniqueByKey = new Map();
  for (const obj of allObjects) {
    if (obj.Key) {
      uniqueByKey.set(obj.Key, obj);
    }
  }

  const targets = Array.from(uniqueByKey.values());
  const totalSize = targets.reduce((sum, obj) => sum + (obj.Size || 0), 0);

  console.log('S3 cleanup candidate summary');
  console.log(`Bucket: ${bucket}`);
  console.log(`Region: ${region}`);
  console.log(`Prefixes: ${prefixes.join(', ')}`);
  console.log(`Older-than-days filter: ${args.olderThanDays === null ? 'none' : args.olderThanDays}`);
  console.log(`Matched objects: ${targets.length}`);
  console.log(`Matched size: ${formatBytes(totalSize)}`);

  const preview = targets.slice(0, 30);
  if (preview.length > 0) {
    console.log('\nPreview (first 30 keys):');
    for (const item of preview) {
      console.log(`- ${item.Key} (${formatBytes(item.Size || 0)})`);
    }
  }

  if (!args.execute) {
    console.log('\nDry run only. No objects deleted.');
    console.log('Run with --execute --confirm=DELETE_TEST_IMAGES to delete matched objects.');
    process.exit(0);
  }

  if (args.confirm !== 'DELETE_TEST_IMAGES') {
    console.error('Refusing to delete without --confirm=DELETE_TEST_IMAGES');
    process.exit(1);
  }

  if (targets.length === 0) {
    console.log('Nothing to delete.');
    process.exit(0);
  }

  const batches = chunk(
    targets
      .map((item) => item.Key)
      .filter(Boolean)
      .map((Key) => ({ Key })),
    1000,
  );

  let deletedCount = 0;

  for (const batch of batches) {
    const result = await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: batch,
          Quiet: false,
        },
      }),
    );

    deletedCount += result.Deleted?.length || 0;

    if (result.Errors?.length) {
      for (const err of result.Errors) {
        console.error(`Delete error for ${err.Key || 'unknown-key'}: ${err.Code || 'UnknownCode'} ${err.Message || ''}`);
      }
    }
  }

  console.log(`\nDelete completed. Removed ${deletedCount} object(s).`);
}

main().catch((error) => {
  console.error('Cleanup failed:', error?.message || error);
  process.exit(1);
});
