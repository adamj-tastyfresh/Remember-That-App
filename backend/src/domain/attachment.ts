export type AttachmentPolicy = {
  maxFileSizeBytes: number;
  allowedMimeTypes: readonly string[];
};

export type AttachmentDescriptor = {
  id: string;
  parentRecordId: string;
  parentRecordType: 'task' | 'inventory';
  originalFilename: string;
  fileType: string;
  fileSize: number;
  uploadedById: string;
  deviceCreatedAt: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(field + ' is required.');
  return value.trim();
}

function safeOriginalFilename(value: unknown): string {
  const filename = requiredString(value, 'originalFilename');
  if (filename.length > 255) throw new Error('Attachment filenames must be 255 characters or fewer.');
  if (filename.includes('/') || filename.includes('\\') || filename.includes('\0') || filename === '.' || filename === '..') throw new Error('The attachment filename is unsafe.');
  return filename;
}

export function validateAttachmentDescriptor(value: unknown, policy: AttachmentPolicy): AttachmentDescriptor {
  if (typeof value !== 'object' || value === null) throw new Error('Attachment metadata is required.');
  const input = value as Record<string, unknown>;
  const id = requiredString(input.id, 'id');
  const parentRecordId = requiredString(input.parentRecordId, 'parentRecordId');
  if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(parentRecordId)) throw new Error('Attachment and parent record IDs must be UUIDs.');
  if (input.parentRecordType !== 'task' && input.parentRecordType !== 'inventory') throw new Error('parentRecordType must be task or inventory.');
  const fileType = requiredString(input.fileType, 'fileType').toLowerCase();
  const fileSize = Number(input.fileSize);
  if (!Number.isInteger(fileSize) || fileSize < 1 || fileSize > policy.maxFileSizeBytes) throw new Error('The attachment file size is not allowed.');
  if (policy.allowedMimeTypes.length > 0 && !policy.allowedMimeTypes.map((type) => type.toLowerCase()).includes(fileType)) throw new Error('The attachment file type is not allowed.');
  const deviceCreatedAt = requiredString(input.deviceCreatedAt, 'deviceCreatedAt');
  if (Number.isNaN(Date.parse(deviceCreatedAt))) throw new Error('deviceCreatedAt must be an ISO date.');
  return { id, parentRecordId, parentRecordType: input.parentRecordType, originalFilename: safeOriginalFilename(input.originalFilename), fileType, fileSize, uploadedById: requiredString(input.uploadedById, 'uploadedById'), deviceCreatedAt };
}

export function createSafeStoredFilename(attachmentId: string, originalFilename: string): string {
  if (!UUID_PATTERN.test(attachmentId)) throw new Error('Attachment IDs must be UUIDs.');
  const safeName = safeOriginalFilename(originalFilename);
  const lastDot = safeName.lastIndexOf('.');
  const extension = lastDot > 0 ? safeName.slice(lastDot + 1).toLowerCase() : '';
  const safeExtension = /^[a-z0-9]{1,10}$/.test(extension) ? '.' + extension : '';
  return attachmentId.toLowerCase() + safeExtension;
}

export function createAttachmentObjectKey(
  parentRecordType: 'task' | 'inventory',
  parentRecordId: string,
  storedFilename: string,
): string {
  if (!UUID_PATTERN.test(parentRecordId)) throw new Error('The attachment parent ID is invalid.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\.[a-z0-9]{1,10})?$/i.test(storedFilename)) {
    throw new Error('The stored attachment filename is invalid.');
  }
  return `attachments/${parentRecordType}/${parentRecordId.toLowerCase()}/${storedFilename.toLowerCase()}`;
}
