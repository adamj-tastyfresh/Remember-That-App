import { Router } from 'express';
import sql from 'mssql';
import { getPool } from '../db/pool';
import { assertTaskSyncAllowed, hasTaskVersionConflict, parseTaskSyncRequest, type TaskSyncRequest } from '../domain/taskSync';
import { assertPermanentDeletionAllowed, hasDeletionVersionConflict, parseRecordDeletionRequest, type RecordDeletionRequest } from '../domain/recordDeletion';

type TaskRow = {
  TaskId: string;
  Title: string;
  Description: string;
  CreatorId: string;
  CreatorName: string;
  DeviceCreatedAt: Date;
  ServerCreatedAt: Date;
  LastModifiedAt: Date;
  Archived: boolean;
  ArchivedAt: Date | null;
  ArchivedBy: string | null;
  ServerVersion: number;
};

function toApiTask(row: TaskRow) {
  return {
    id: row.TaskId,
    title: row.Title,
    description: row.Description,
    creatorId: row.CreatorId,
    creatorName: row.CreatorName,
    deviceCreatedAt: row.DeviceCreatedAt.toISOString(),
    serverCreatedAt: row.ServerCreatedAt.toISOString(),
    lastModifiedAt: row.LastModifiedAt.toISOString(),
    archived: row.Archived,
    archivedAt: row.ArchivedAt?.toISOString() ?? null,
    archivedBy: row.ArchivedBy,
    serverVersion: row.ServerVersion,
  };
}

const taskSelect = [
  'SELECT t.TaskId, t.Title, t.Description, t.CreatorId, u.DisplayName AS CreatorName,',
  't.DeviceCreatedAt, t.ServerCreatedAt, t.LastModifiedAt, t.Archived,',
  't.ArchivedAt, t.ArchivedBy, t.ServerVersion',
  'FROM dbo.Tasks t',
  'INNER JOIN dbo.Users u ON u.UserId = t.CreatorId',
].join(' ');

function bindSyncInputs(request: sql.Request, input: TaskSyncRequest): void {
  request.input('operationId', sql.UniqueIdentifier, input.operationId);
  request.input('taskId', sql.UniqueIdentifier, input.task.id);
  request.input('actingUserId', sql.NVarChar(64), input.actingUserId);
  request.input('title', sql.NVarChar(250), input.task.title);
  request.input('description', sql.NVarChar(sql.MAX), input.task.description);
  request.input('creatorId', sql.NVarChar(64), input.task.creatorId);
  request.input('deviceCreatedAt', sql.DateTime2(3), new Date(input.task.deviceCreatedAt));
  request.input('archived', sql.Bit, input.task.archived);
  request.input('archivedAt', sql.DateTime2(3), input.task.archivedAt ? new Date(input.task.archivedAt) : null);
  request.input('archivedBy', sql.NVarChar(64), input.task.archivedBy);
}

export const tasksRouter = Router();

tasksRouter.get('/', async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query<TaskRow>(taskSelect + ' ORDER BY t.LastModifiedAt DESC');
    res.json({ data: result.recordset.map(toApiTask) });
  } catch (error) {
    console.error('Task list failed:', error instanceof Error ? error.message : 'Unknown error');
    res.status(503).json({ error: { code: 'SERVER_UNAVAILABLE', message: 'The task server is unavailable.' } });
  }
});

tasksRouter.post('/sync', async (req, res) => {
  let input: TaskSyncRequest;
  try {
    input = parseTaskSyncRequest(req.body);
  } catch (error) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error instanceof Error ? error.message : 'Invalid task data.' } });
    return;
  }


  const pool = await getPool().catch(() => null);
  if (!pool) {
    res.status(503).json({ error: { code: 'SERVER_UNAVAILABLE', message: 'The task server is unavailable.' } });
    return;
  }

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const request = new sql.Request(transaction);
    bindSyncInputs(request, input);

    const userResult = await request.query<{ UserId: string }>(
      'SELECT UserId FROM dbo.Users WHERE UserId = @actingUserId AND IsActive = 1',
    );
    if (userResult.recordset.length === 0) {
      await transaction.rollback();
      res.status(403).json({ error: { code: 'UNKNOWN_USER', message: 'The selected user is not active.' } });
      return;
    }

    const duplicate = await request.query<{ OperationId: string; TaskId: string }>(
      'SELECT OperationId, TaskId FROM dbo.TaskSyncOperations WHERE OperationId = @operationId',
    );
    if (duplicate.recordset.length > 0) {
      if (duplicate.recordset[0].TaskId.toLowerCase() !== input.task.id.toLowerCase()) {
        await transaction.rollback();
        res.status(409).json({ error: { code: 'OPERATION_MISMATCH', message: 'This operation ID belongs to another task.' } });
        return;
      }
      const result = await request.query<TaskRow>(taskSelect + ' WHERE t.TaskId = @taskId');
      await transaction.commit();
      if (!result.recordset[0]) {
        res.status(409).json({ error: { code: 'MISSING_TASK', message: 'The previously synced task no longer exists.' } });
        return;
      }
      res.json({ data: result.recordset[0] ? toApiTask(result.recordset[0]) : null, meta: { duplicate: true } });
      return;
    }

    const tombstone = await request.query<{ RecordId: string }>(
      "SELECT RecordId FROM dbo.RecordDeletionLog WHERE RecordType = 'task' AND RecordId = @taskId",
    );
    if (tombstone.recordset.length > 0) {
      await transaction.rollback();
      res.status(410).json({ error: { code: 'RECORD_DELETED', message: 'This task was permanently deleted.' } });
      return;
    }
    const existing = await request.query<{ CreatorId: string; ServerVersion: number }>(
      'SELECT CreatorId, ServerVersion FROM dbo.Tasks WITH (UPDLOCK, HOLDLOCK) WHERE TaskId = @taskId',
    );
    const current = existing.recordset[0];

    if (!current) {
      try {
        assertTaskSyncAllowed(input, null);
      } catch (error) {
        await transaction.rollback();
        res.status(403).json({ error: { code: 'OWNERSHIP_ERROR', message: error instanceof Error ? error.message : 'Task ownership is invalid.' } });
        return;
      }

      await request.query([
        'INSERT dbo.Tasks (TaskId, Title, Description, CreatorId, DeviceCreatedAt, LastModifiedAt, Archived, ArchivedAt, ArchivedBy)',
        'VALUES (@taskId, @title, @description, @creatorId, @deviceCreatedAt, SYSUTCDATETIME(), @archived, @archivedAt, @archivedBy)',
      ].join(' '));
    } else {
      try {
        assertTaskSyncAllowed(input, { creatorId: current.CreatorId, serverVersion: current.ServerVersion });
      } catch (error) {
        await transaction.rollback();
        res.status(403).json({ error: { code: 'OWNERSHIP_ERROR', message: error instanceof Error ? error.message : 'Task ownership is invalid.' } });
        return;
      }

      if (hasTaskVersionConflict(input, current.ServerVersion)) {
        const conflict = await request.query<TaskRow>(taskSelect + ' WHERE t.TaskId = @taskId');
        await transaction.rollback();
        res.status(409).json({
          error: { code: 'CONFLICT', message: 'The server task changed after this device last synchronised.' },
          data: { serverTask: toApiTask(conflict.recordset[0]) },
        });
        return;
      }

      await request.query([
        'UPDATE dbo.Tasks SET Title = @title, Description = @description,',
        'LastModifiedAt = SYSUTCDATETIME(), Archived = @archived, ArchivedAt = @archivedAt,',
        'ArchivedBy = @archivedBy, ServerVersion = ServerVersion + 1 WHERE TaskId = @taskId',
      ].join(' '));
    }

    const saved = await request.query<TaskRow>(taskSelect + ' WHERE t.TaskId = @taskId');
    const savedTask = saved.recordset[0];
    request.input('resultServerVersion', sql.Int, savedTask.ServerVersion);
    await request.query([
      'INSERT dbo.TaskSyncOperations (OperationId, TaskId, ResultServerVersion)',
      'VALUES (@operationId, @taskId, @resultServerVersion)',
    ].join(' '));
    await transaction.commit();
    res.json({ data: toApiTask(savedTask), meta: { duplicate: false } });
  } catch (error) {
    await transaction.rollback().catch(() => undefined);
    console.error('Task sync failed:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: { code: 'SYNC_FAILURE', message: 'The task could not be synchronised.' } });
  }
});
tasksRouter.post('/delete', async (req, res) => {
  let input: RecordDeletionRequest;
  try {
    input = parseRecordDeletionRequest(req.body);
  } catch (error) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error instanceof Error ? error.message : 'Invalid deletion data.' } });
    return;
  }

  const pool = await getPool().catch(() => null);
  if (!pool) {
    res.status(503).json({ error: { code: 'SERVER_UNAVAILABLE', message: 'The task server is unavailable.' } });
    return;
  }

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const request = new sql.Request(transaction);
    request.input('operationId', sql.UniqueIdentifier, input.operationId);
    request.input('recordId', sql.UniqueIdentifier, input.recordId);
    request.input('actingUserId', sql.NVarChar(64), input.actingUserId);
    request.input('creatorId', sql.NVarChar(64), input.creatorId);

    const user = await request.query<{ UserId: string }>('SELECT UserId FROM dbo.Users WHERE UserId = @actingUserId AND IsActive = 1');
    if (!user.recordset[0]) {
      await transaction.rollback();
      res.status(403).json({ error: { code: 'UNKNOWN_USER', message: 'The selected user is not active.' } });
      return;
    }

    const operation = await request.query<{ RecordType: string; RecordId: string }>('SELECT RecordType, RecordId FROM dbo.RecordDeletionLog WHERE OperationId = @operationId');
    if (operation.recordset[0]) {
      const matches = operation.recordset[0].RecordType === 'task' && operation.recordset[0].RecordId.toLowerCase() === input.recordId.toLowerCase();
      await transaction.commit();
      if (!matches) {
        res.status(409).json({ error: { code: 'OPERATION_MISMATCH', message: 'This deletion operation belongs to another record.' } });
        return;
      }
      res.json({ data: { id: input.recordId }, meta: { duplicate: true } });
      return;
    }

    const priorDeletion = await request.query<{ CreatorId: string }>("SELECT CreatorId FROM dbo.RecordDeletionLog WHERE RecordType = 'task' AND RecordId = @recordId");
    if (priorDeletion.recordset[0]) {
      const allowed = priorDeletion.recordset[0].CreatorId === input.actingUserId && input.creatorId === input.actingUserId;
      await transaction.commit();
      if (!allowed) {
        res.status(403).json({ error: { code: 'OWNERSHIP_ERROR', message: 'Only the task creator can permanently delete it.' } });
        return;
      }
      res.json({ data: { id: input.recordId }, meta: { duplicate: true } });
      return;
    }

    const existing = await request.query<{ CreatorId: string; Archived: boolean; ServerVersion: number }>('SELECT CreatorId, Archived, ServerVersion FROM dbo.Tasks WITH (UPDLOCK, HOLDLOCK) WHERE TaskId = @recordId');
    const current = existing.recordset[0] ? { creatorId: existing.recordset[0].CreatorId, archived: existing.recordset[0].Archived, serverVersion: existing.recordset[0].ServerVersion } : null;
    try {
      assertPermanentDeletionAllowed(input, current);
    } catch (error) {
      await transaction.rollback();
      res.status(403).json({ error: { code: 'OWNERSHIP_ERROR', message: error instanceof Error ? error.message : 'Permanent deletion is not allowed.' } });
      return;
    }
    if (current && hasDeletionVersionConflict(input, current.serverVersion)) {
      const conflict = await request.query<TaskRow>(taskSelect + ' WHERE t.TaskId = @recordId');
      await transaction.rollback();
      res.status(409).json({ error: { code: 'CONFLICT', message: 'The server task changed before it could be deleted.' }, data: { serverTask: toApiTask(conflict.recordset[0]) } });
      return;
    }

    await request.query("INSERT dbo.RecordDeletionLog (OperationId, RecordType, RecordId, CreatorId, DeletedBy) VALUES (@operationId, 'task', @recordId, @creatorId, @actingUserId)");
    if (current) {
      await request.query("DELETE operations FROM dbo.AttachmentSyncOperations operations INNER JOIN dbo.Attachments attachments ON attachments.AttachmentId = operations.AttachmentId WHERE attachments.ParentRecordType = 'task' AND attachments.ParentRecordId = @recordId");
      await request.query("DELETE dbo.Attachments WHERE ParentRecordType = 'task' AND ParentRecordId = @recordId");
      await request.query('DELETE dbo.TaskSyncOperations WHERE TaskId = @recordId');
      await request.query('DELETE dbo.Tasks WHERE TaskId = @recordId');
    }
    await transaction.commit();
    res.json({ data: { id: input.recordId }, meta: { duplicate: false } });
  } catch (error) {
    await transaction.rollback().catch(() => undefined);
    console.error('Task deletion failed:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: { code: 'DELETE_FAILURE', message: 'The task could not be permanently deleted.' } });
  }
});
