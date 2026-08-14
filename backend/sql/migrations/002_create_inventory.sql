SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.InventoryRecords', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.InventoryRecords (
    InventoryId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_InventoryRecords PRIMARY KEY,
    ItemName NVARCHAR(250) NOT NULL,
    ItemLocation NVARCHAR(500) NOT NULL,
    CreatorId NVARCHAR(64) NOT NULL,
    DeviceCreatedAt DATETIME2(3) NOT NULL,
    ServerCreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Inventory_ServerCreatedAt DEFAULT SYSUTCDATETIME(),
    LastModifiedAt DATETIME2(3) NOT NULL,
    Archived BIT NOT NULL CONSTRAINT DF_Inventory_Archived DEFAULT 0,
    ArchivedAt DATETIME2(3) NULL,
    ArchivedBy NVARCHAR(64) NULL,
    ServerVersion INT NOT NULL CONSTRAINT DF_Inventory_ServerVersion DEFAULT 1,
    CONSTRAINT FK_Inventory_Creator FOREIGN KEY (CreatorId) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_Inventory_ArchivedBy FOREIGN KEY (ArchivedBy) REFERENCES dbo.Users(UserId)
  );

  CREATE INDEX IX_Inventory_LastModifiedAt ON dbo.InventoryRecords (LastModifiedAt);
  CREATE INDEX IX_Inventory_Archived ON dbo.InventoryRecords (Archived, LastModifiedAt DESC);
END;

IF OBJECT_ID('dbo.InventorySyncOperations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.InventorySyncOperations (
    OperationId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_InventorySyncOperations PRIMARY KEY,
    InventoryId UNIQUEIDENTIFIER NOT NULL,
    ResultServerVersion INT NOT NULL,
    ProcessedAt DATETIME2(3) NOT NULL CONSTRAINT DF_InventorySync_ProcessedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_InventorySync_Record FOREIGN KEY (InventoryId) REFERENCES dbo.InventoryRecords(InventoryId)
  );
END;

COMMIT TRANSACTION;

/*
Recovery notes:
Back up the database before applying this migration. To roll back an unused
installation, drop InventorySyncOperations first, then InventoryRecords. Do not
use that rollback after production records exist; restore the pre-migration backup.
*/