import assert from 'node:assert/strict'
import test from 'node:test'
import type { User } from '../data/users.ts'
import { createLocalAttachment, type AttachmentPolicy } from './attachment.ts'

const adam: User = { id: 'usr-adam', name: 'Adam' }
const policy: AttachmentPolicy = { maxFileSizeBytes: 1024, allowedMimeTypes: ['image/jpeg', 'application/pdf'] }

function input(overrides: Partial<Parameters<typeof createLocalAttachment>[0]> = {}) {
  return {
    parentRecordId: 'record-1',
    parentRecordType: 'task' as const,
    originalFilename: 'photo.jpg',
    fileType: 'image/jpeg',
    localBlob: new Blob(['photo'], { type: 'image/jpeg' }),
    ...overrides,
  }
}

test('creates an offline attachment with immutable ownership and queued state', () => {
  const attachment = createLocalAttachment(input(), adam, policy, 'attachment-1', '2026-08-15T01:00:00.000Z')
  assert.equal(attachment.originalFilename, 'photo.jpg')
  assert.equal(attachment.fileSize, 5)
  assert.equal(attachment.uploadedById, adam.id)
  assert.equal(attachment.syncStatus, 'Waiting to Sync')
  assert.equal(attachment.storageReference, null)
})

test('rejects unsafe filenames and path traversal', () => {
  assert.throws(() => createLocalAttachment(input({ originalFilename: '../secret.txt' }), adam, policy), /unsafe/)
  assert.throws(() => createLocalAttachment(input({ originalFilename: 'folder\\secret.txt' }), adam, policy), /unsafe/)
})

test('enforces configured size and file-type policy', () => {
  assert.throws(() => createLocalAttachment(input({ localBlob: new Blob(['']) }), adam, policy), /Empty/)
  assert.throws(() => createLocalAttachment(input({ localBlob: new Blob(['x'.repeat(1025)]) }), adam, policy), /size limit/)
  assert.throws(() => createLocalAttachment(input({ fileType: 'application/x-msdownload' }), adam, policy), /not approved/)
})
