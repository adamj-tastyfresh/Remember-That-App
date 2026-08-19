import { Router } from 'express';
import sql from 'mssql';
import { getPool } from '../db/pool';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AttachmentRow = {
  AttachmentId: string;
  ParentRecordId: string;
  ParentRecordType: 'task' | 'inventory';
  OriginalFilename: string;
  StoredFilename: string;
  FileType: string;
  FileSize: number;
  UploadedById: string;
  UploadedByName: string;
  DeviceCreatedAt: Date;
  ServerCreatedAt: Date;
  StorageReference: string;
};

function toApiAttachment(row: AttachmentRow) {
  return { id: row.AttachmentId, parentRecordId: row.ParentRecordId, parentRecordType: row.ParentRecordType, originalFilename: row.OriginalFilename, fileType: row.FileType, fileSize: Number(row.FileSize), uploadedById: row.UploadedById, uploadedByName: row.UploadedByName, deviceCreatedAt: row.DeviceCreatedAt.toISOString(), serverCreatedAt: row.ServerCreatedAt.toISOString() };
}

export const attachmentsRouter = Router();

attachmentsRouter.get('/', async (req, res) => {
  const parentRecordType = req.query.parentRecordType;
  const parentRecordId = req.query.parentRecordId;
  if ((parentRecordType === undefined) !== (parentRecordId === undefined)) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Provide both parentRecordType and parentRecordId.' } });
    return;
  }
  if (parentRecordType !== undefined && (parentRecordType !== 'task' && parentRecordType !== 'inventory')) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'parentRecordType must be task or inventory.' } });
    return;
  }
  if (typeof parentRecordId !== 'undefined' && (typeof parentRecordId !== 'string' || !UUID_PATTERN.test(parentRecordId))) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'parentRecordId must be a UUID.' } });
    return;
  }
  try {
    const pool = await getPool();
    const request = pool.request();
    let where = '';
    if (typeof parentRecordId === 'string' && (parentRecordType === 'task' || parentRecordType === 'inventory')) {
      request.input('parentRecordId', sql.UniqueIdentifier, parentRecordId);
      request.input('parentRecordType', sql.NVarChar(20), parentRecordType);
      where = ' WHERE a.ParentRecordId = @parentRecordId AND a.ParentRecordType = @parentRecordType';
    }
    const result = await request.query<AttachmentRow>([
      'SELECT a.AttachmentId, a.ParentRecordId, a.ParentRecordType, a.OriginalFilename, a.StoredFilename,',
      'a.FileType, a.FileSize, a.UploadedById, u.DisplayName AS UploadedByName,',
      'a.DeviceCreatedAt, a.ServerCreatedAt FROM dbo.remme_Attachments a',
      'INNER JOIN dbo.remme_Users u ON u.UserId = a.UploadedById' + where + ' ORDER BY a.ServerCreatedAt DESC',
    ].join(' '));
    res.json({ data: result.recordset.map(toApiAttachment) });
  } catch (error) {
    console.error('Attachment list failed:', error instanceof Error ? error.message : 'Unknown error');
    res.status(503).json({ error: { code: 'SERVER_UNAVAILABLE', message: 'Attachment metadata is unavailable.' } });
  }
});
