SET XACT_ABORT ON;

IF DB_NAME() IN (N'master', N'model', N'msdb', N'tempdb')
  THROW 51000, 'Run this migration in the approved shared target database, not a system database.', 1;

BEGIN TRANSACTION;

IF OBJECT_ID('dbo.remme_RecordDeletionLog', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.remme_RecordDeletionLog (
    OperationId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_remme_RecordDeletionLog PRIMARY KEY,
    RecordType NVARCHAR(20) NOT NULL,
    RecordId UNIQUEIDENTIFIER NOT NULL,
    CreatorId NVARCHAR(64) NOT NULL,
    DeletedBy NVARCHAR(64) NOT NULL,
    DeletedAt DATETIME2(3) NOT NULL CONSTRAINT DF_remme_RecordDeletionLog_DeletedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_remme_RecordDeletionLog_Record UNIQUE (RecordType, RecordId),
    CONSTRAINT CK_remme_RecordDeletionLog_Type CHECK (RecordType IN ('task', 'inventory')),
    CONSTRAINT FK_remme_RecordDeletionLog_Creator FOREIGN KEY (CreatorId) REFERENCES dbo.remme_Users(UserId),
    CONSTRAINT FK_remme_RecordDeletionLog_DeletedBy FOREIGN KEY (DeletedBy) REFERENCES dbo.remme_Users(UserId)
  );

  CREATE INDEX IX_remme_RecordDeletionLog_DeletedAt ON dbo.remme_RecordDeletionLog (DeletedAt);
END;

COMMIT TRANSACTION;

/*
Recovery notes:
Back up the database before applying this migration. The deletion log is required
to prevent permanently deleted records from reappearing on other devices. Do not
drop it after permanent deletion has been used. For an unused installation only,
drop remme_RecordDeletionLog to roll back this migration.
*/
