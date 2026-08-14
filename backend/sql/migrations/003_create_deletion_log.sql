SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.RecordDeletionLog', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.RecordDeletionLog (
    OperationId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_RecordDeletionLog PRIMARY KEY,
    RecordType NVARCHAR(20) NOT NULL,
    RecordId UNIQUEIDENTIFIER NOT NULL,
    CreatorId NVARCHAR(64) NOT NULL,
    DeletedBy NVARCHAR(64) NOT NULL,
    DeletedAt DATETIME2(3) NOT NULL CONSTRAINT DF_RecordDeletionLog_DeletedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_RecordDeletionLog_Record UNIQUE (RecordType, RecordId),
    CONSTRAINT CK_RecordDeletionLog_Type CHECK (RecordType IN ('task', 'inventory')),
    CONSTRAINT FK_RecordDeletionLog_Creator FOREIGN KEY (CreatorId) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_RecordDeletionLog_DeletedBy FOREIGN KEY (DeletedBy) REFERENCES dbo.Users(UserId)
  );

  CREATE INDEX IX_RecordDeletionLog_DeletedAt ON dbo.RecordDeletionLog (DeletedAt);
END;

COMMIT TRANSACTION;

/*
Recovery notes:
Back up the database before applying this migration. The deletion log is required
to prevent permanently deleted records from reappearing on other devices. Do not
drop it after permanent deletion has been used. For an unused installation only,
drop RecordDeletionLog to roll back this migration.
*/
