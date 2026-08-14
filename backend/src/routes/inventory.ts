import { Router } from 'express';
import sql from 'mssql';
import { getPool } from '../db/pool';
import {
  assertInventorySyncAllowed,
  hasInventoryVersionConflict,
  parseInventorySyncRequest,
  type InventorySyncRequest,
} from '../domain/inventorySync';

type InventoryRow = {
  InventoryId: string;
  ItemName: string;
  ItemLocation: string;
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

function toApiInventory(row: InventoryRow) {
  return {
    id: row.InventoryId,
    itemName: row.ItemName,
    itemLocation: row.ItemLocation,
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

const inventorySelect = [
  'SELECT i.InventoryId, i.ItemName, i.ItemLocation, i.CreatorId, u.DisplayName AS CreatorName,',
  'i.DeviceCreatedAt, i.ServerCreatedAt, i.LastModifiedAt, i.Archived,',
  'i.ArchivedAt, i.ArchivedBy, i.ServerVersion',
  'FROM dbo.InventoryRecords i',
  'INNER JOIN dbo.Users u ON u.UserId = i.CreatorId',
].join(' ');

function bindInputs(request: sql.Request, input: InventorySyncRequest): void {
  request.input('operationId', sql.UniqueIdentifier, input.operationId);
  request.input('inventoryId', sql.UniqueIdentifier, input.inventory.id);
  request.input('actingUserId', sql.NVarChar(64), input.actingUserId);
  request.input('itemName', sql.NVarChar(250), input.inventory.itemName);
  request.input('itemLocation', sql.NVarChar(500), input.inventory.itemLocation);
  request.input('creatorId', sql.NVarChar(64), input.inventory.creatorId);
  request.input('deviceCreatedAt', sql.DateTime2(3), new Date(input.inventory.deviceCreatedAt));
  request.input('archived', sql.Bit, input.inventory.archived);
  request.input('archivedAt', sql.DateTime2(3), input.inventory.archivedAt ? new Date(input.inventory.archivedAt) : null);
  request.input('archivedBy', sql.NVarChar(64), input.inventory.archivedBy);
}

export const inventoryRouter = Router();

inventoryRouter.get('/', async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query<InventoryRow>(inventorySelect + ' ORDER BY i.LastModifiedAt DESC');
    res.json({ data: result.recordset.map(toApiInventory) });
  } catch (error) {
    console.error('Inventory list failed:', error instanceof Error ? error.message : 'Unknown error');
    res.status(503).json({ error: { code: 'SERVER_UNAVAILABLE', message: 'The inventory server is unavailable.' } });
  }
});

inventoryRouter.post('/sync', async (req, res) => {
  let input: InventorySyncRequest;
  try {
    input = parseInventorySyncRequest(req.body);
  } catch (error) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error instanceof Error ? error.message : 'Invalid inventory data.' } });
    return;
  }

  const pool = await getPool().catch(() => null);
  if (!pool) {
    res.status(503).json({ error: { code: 'SERVER_UNAVAILABLE', message: 'The inventory server is unavailable.' } });
    return;
  }

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const request = new sql.Request(transaction);
    bindInputs(request, input);

    const userResult = await request.query<{ UserId: string }>(
      'SELECT UserId FROM dbo.Users WHERE UserId = @actingUserId AND IsActive = 1',
    );
    if (userResult.recordset.length === 0) {
      await transaction.rollback();
      res.status(403).json({ error: { code: 'UNKNOWN_USER', message: 'The selected user is not active.' } });
      return;
    }

    const duplicate = await request.query<{ OperationId: string; InventoryId: string }>(
      'SELECT OperationId, InventoryId FROM dbo.InventorySyncOperations WHERE OperationId = @operationId',
    );
    if (duplicate.recordset.length > 0) {
      if (duplicate.recordset[0].InventoryId.toLowerCase() !== input.inventory.id.toLowerCase()) {
        await transaction.rollback();
        res.status(409).json({ error: { code: 'OPERATION_MISMATCH', message: 'This operation ID belongs to another inventory record.' } });
        return;
      }
      const result = await request.query<InventoryRow>(inventorySelect + ' WHERE i.InventoryId = @inventoryId');
      await transaction.commit();
      if (!result.recordset[0]) {
        res.status(409).json({ error: { code: 'MISSING_RECORD', message: 'The previously synced inventory record no longer exists.' } });
        return;
      }
      res.json({ data: toApiInventory(result.recordset[0]), meta: { duplicate: true } });
      return;
    }

    const existing = await request.query<{ CreatorId: string; ServerVersion: number }>(
      'SELECT CreatorId, ServerVersion FROM dbo.InventoryRecords WITH (UPDLOCK, HOLDLOCK) WHERE InventoryId = @inventoryId',
    );
    const current = existing.recordset[0];

    try {
      assertInventorySyncAllowed(
        input,
        current ? { creatorId: current.CreatorId, serverVersion: current.ServerVersion } : null,
      );
    } catch (error) {
      await transaction.rollback();
      res.status(403).json({ error: { code: 'OWNERSHIP_ERROR', message: error instanceof Error ? error.message : 'Inventory ownership is invalid.' } });
      return;
    }

    if (!current) {
      await request.query([
        'INSERT dbo.InventoryRecords (InventoryId, ItemName, ItemLocation, CreatorId, DeviceCreatedAt, LastModifiedAt, Archived, ArchivedAt, ArchivedBy)',
        'VALUES (@inventoryId, @itemName, @itemLocation, @creatorId, @deviceCreatedAt, SYSUTCDATETIME(), @archived, @archivedAt, @archivedBy)',
      ].join(' '));
    } else {
      if (hasInventoryVersionConflict(input, current.ServerVersion)) {
        const conflict = await request.query<InventoryRow>(inventorySelect + ' WHERE i.InventoryId = @inventoryId');
        await transaction.rollback();
        res.status(409).json({
          error: { code: 'CONFLICT', message: 'The server inventory record changed after this device last synchronised.' },
          data: { serverRecord: toApiInventory(conflict.recordset[0]) },
        });
        return;
      }
      await request.query([
        'UPDATE dbo.InventoryRecords SET ItemName = @itemName, ItemLocation = @itemLocation,',
        'LastModifiedAt = SYSUTCDATETIME(), Archived = @archived, ArchivedAt = @archivedAt,',
        'ArchivedBy = @archivedBy, ServerVersion = ServerVersion + 1 WHERE InventoryId = @inventoryId',
      ].join(' '));
    }

    const saved = await request.query<InventoryRow>(inventorySelect + ' WHERE i.InventoryId = @inventoryId');
    const savedRecord = saved.recordset[0];
    request.input('resultServerVersion', sql.Int, savedRecord.ServerVersion);
    await request.query([
      'INSERT dbo.InventorySyncOperations (OperationId, InventoryId, ResultServerVersion)',
      'VALUES (@operationId, @inventoryId, @resultServerVersion)',
    ].join(' '));
    await transaction.commit();
    res.json({ data: toApiInventory(savedRecord), meta: { duplicate: false } });
  } catch (error) {
    await transaction.rollback().catch(() => undefined);
    console.error('Inventory sync failed:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: { code: 'SYNC_FAILURE', message: 'The inventory record could not be synchronised.' } });
  }
});