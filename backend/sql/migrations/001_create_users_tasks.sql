SET XACT_ABORT ON;

IF DB_NAME() IN (N'master', N'model', N'msdb', N'tempdb')
  THROW 51000, 'Run this migration in the approved shared target database, not a system database.', 1;

BEGIN TRANSACTION;

IF OBJECT_ID('dbo.remme_Users', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.remme_Users (
    UserId NVARCHAR(64) NOT NULL CONSTRAINT PK_remme_Users PRIMARY KEY,
    DisplayName NVARCHAR(100) NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_remme_Users_IsActive DEFAULT 1
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.remme_Users WHERE UserId = 'usr-doug')
  INSERT dbo.remme_Users (UserId, DisplayName) VALUES ('usr-doug', 'Doug');
IF NOT EXISTS (SELECT 1 FROM dbo.remme_Users WHERE UserId = 'usr-daniel')
  INSERT dbo.remme_Users (UserId, DisplayName) VALUES ('usr-daniel', 'Daniel');
IF NOT EXISTS (SELECT 1 FROM dbo.remme_Users WHERE UserId = 'usr-mary')
  INSERT dbo.remme_Users (UserId, DisplayName) VALUES ('usr-mary', 'Mary');
IF NOT EXISTS (SELECT 1 FROM dbo.remme_Users WHERE UserId = 'usr-adam')
  INSERT dbo.remme_Users (UserId, DisplayName) VALUES ('usr-adam', 'Adam');
IF NOT EXISTS (SELECT 1 FROM dbo.remme_Users WHERE UserId = 'usr-jabbar')
  INSERT dbo.remme_Users (UserId, DisplayName) VALUES ('usr-jabbar', 'Jabbar');

IF OBJECT_ID('dbo.remme_Tasks', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.remme_Tasks (
    TaskId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_remme_Tasks PRIMARY KEY,
    Title NVARCHAR(250) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    CreatorId NVARCHAR(64) NOT NULL,
    DeviceCreatedAt DATETIME2(3) NOT NULL,
    ServerCreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_remme_Tasks_ServerCreatedAt DEFAULT SYSUTCDATETIME(),
    LastModifiedAt DATETIME2(3) NOT NULL,
    Archived BIT NOT NULL CONSTRAINT DF_remme_Tasks_Archived DEFAULT 0,
    ArchivedAt DATETIME2(3) NULL,
    ArchivedBy NVARCHAR(64) NULL,
    ServerVersion INT NOT NULL CONSTRAINT DF_remme_Tasks_ServerVersion DEFAULT 1,
    CONSTRAINT FK_remme_Tasks_Creator FOREIGN KEY (CreatorId) REFERENCES dbo.remme_Users(UserId),
    CONSTRAINT FK_remme_Tasks_ArchivedBy FOREIGN KEY (ArchivedBy) REFERENCES dbo.remme_Users(UserId)
  );

  CREATE INDEX IX_remme_Tasks_LastModifiedAt ON dbo.remme_Tasks (LastModifiedAt);
  CREATE INDEX IX_remme_Tasks_Archived ON dbo.remme_Tasks (Archived, LastModifiedAt DESC);
END;

IF OBJECT_ID('dbo.remme_TaskSyncOperations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.remme_TaskSyncOperations (
    OperationId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_remme_TaskSyncOperations PRIMARY KEY,
    TaskId UNIQUEIDENTIFIER NOT NULL,
    ResultServerVersion INT NOT NULL,
    ProcessedAt DATETIME2(3) NOT NULL CONSTRAINT DF_remme_TaskSyncOperations_ProcessedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_remme_TaskSyncOperations_Task FOREIGN KEY (TaskId) REFERENCES dbo.remme_Tasks(TaskId)
  );
END;

COMMIT TRANSACTION;

/*
Recovery notes:
Back up the database before applying this migration. To roll back an unused
installation, drop remme_TaskSyncOperations first, then remme_Tasks, then remme_Users. Do not use
that rollback after production records exist; restore the pre-migration backup.
*/