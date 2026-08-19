SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.remme_InventoryRecords', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.remme_InventoryRecords (
    InventoryId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_remme_InventoryRecords PRIMARY KEY,
    ItemName NVARCHAR(250) NOT NULL,
    ItemLocation NVARCHAR(500) NOT NULL,
    CreatorId NVARCHAR(64) NOT NULL,
    DeviceCreatedAt DATETIME2(3) NOT NULL,
    ServerCreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_remme_Inventory_ServerCreatedAt DEFAULT SYSUTCDATETIME(),
    LastModifiedAt DATETIME2(3) NOT NULL,
    Archived BIT NOT NULL CONSTRAINT DF_remme_Inventory_Archived DEFAULT 0,
    ArchivedAt DATETIME2(3) NULL,
    ArchivedBy NVARCHAR(64) NULL,
    ServerVersion INT NOT NULL CONSTRAINT DF_remme_Inventory_ServerVersion DEFAULT 1,
    CONSTRAINT FK_remme_Inventory_Creator FOREIGN KEY (CreatorId) REFERENCES dbo.remme_Users(UserId),
    CONSTRAINT FK_remme_Inventory_ArchivedBy FOREIGN KEY (ArchivedBy) REFERENCES dbo.remme_Users(UserId)
  );

  CREATE INDEX IX_remme_Inventory_LastModifiedAt ON dbo.remme_InventoryRecords (LastModifiedAt);
  CREATE INDEX IX_remme_Inventory_Archived ON dbo.remme_InventoryRecords (Archived, LastModifiedAt DESC);
END;

IF OBJECT_ID('dbo.remme_InventorySyncOperations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.remme_InventorySyncOperations (
    OperationId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_remme_InventorySyncOperations PRIMARY KEY,
    InventoryId UNIQUEIDENTIFIER NOT NULL,
    ResultServerVersion INT NOT NULL,
    ProcessedAt DATETIME2(3) NOT NULL CONSTRAINT DF_remme_InventorySync_ProcessedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_remme_InventorySync_Record FOREIGN KEY (InventoryId) REFERENCES dbo.remme_InventoryRecords(InventoryId)
  );
END;

COMMIT TRANSACTION;

/*
Recovery notes:
Back up the database before applying this migration. To roll back an unused
installation, drop remme_InventorySyncOperations first, then remme_InventoryRecords. Do not
use that rollback after production records exist; restore the pre-migration backup.
*/