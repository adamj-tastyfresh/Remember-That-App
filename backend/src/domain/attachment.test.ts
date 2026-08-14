import assert from 'node:assert/strict';
import test from 'node:test';
import { createSafeStoredFilename, validateAttachmentDescriptor } from './attachment.ts';

const policy = { maxFileSizeBytes: 1024, allowedMimeTypes: ['image/jpeg', 'application/pdf'] };
const descriptor = {
  id: '123e4567-e89b-42d3-a456-426614174030',
  parentRecordId: '123e4567-e89b-42d3-a456-426614174031',
  parentRecordType: 'task',
  originalFilename: 'Photo.JPG',
  fileType: 'image/jpeg',
  fileSize: 500,
  uploadedById: 'usr-adam',
  deviceCreatedAt: '2026-08-15T01:00:00.000Z',
};

test('validates attachment metadata against configured policy', () => {
  assert.equal(validateAttachmentDescriptor(descriptor, policy).originalFilename, 'Photo.JPG');
});

test('rejects unsafe names, unapproved types, and oversized files', () => {
  assert.throws(() => validateAttachmentDescriptor({ ...descriptor, originalFilename: '../secret.txt' }, policy), /unsafe/);
  assert.throws(() => validateAttachmentDescriptor({ ...descriptor, fileType: 'application/x-msdownload' }, policy), /not allowed/);
  assert.throws(() => validateAttachmentDescriptor({ ...descriptor, fileSize: 1025 }, policy), /size/);
});

test('generates a safe stored filename without trusting the original path', () => {
  assert.equal(createSafeStoredFilename(descriptor.id, descriptor.originalFilename), descriptor.id + '.jpg');
  assert.equal(createSafeStoredFilename(descriptor.id, 'document.bad-extension-too-long'), descriptor.id);
});
