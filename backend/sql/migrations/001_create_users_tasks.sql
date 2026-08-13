SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Users (
    UserId NVARCHAR(64) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
    DisplayName NVARCHAR(100) NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserId = 'usr-doug')
  INSERT dbo.Users (UserId, DisplayName) VALUES ('usr-doug', 'Doug');
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserId = 'usr-daniel')
  INSERT dbo.Users (UserId, DisplayName) VALUES ('usr-daniel', 'Daniel');
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserId = 'usr-mary')
  INSERT dbo.Users (UserId, DisplayName) VALUES ('usr-mary', 'Mary');
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserId = 'usr-adam')
  INSERT dbo.Users (UserId, DisplayName) VALUES ('usr-adam', 'Adam');
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserId = 'usr-jabbar')
  INSERT dbo.Users (UserId, DisplayName) VALUES ('usr-jabbar', 'Jabbar');

IF OBJECT_ID('dbo.Tasks', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Tasks (
    TaskId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Tasks PRIMARY KEY,
    Title NVARCHAR(250) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    CreatorId NVARCHAR(64) NOT NULL,
    DeviceCreatedAt DATETIME2(3) NOT NULL,
    ServerCreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Tasks_ServerCreatedAt DEFAULT SYSUTCDATETIME(),
    LastModifiedAt DATETIME2(3) NOT NULL,
    Archived BIT NOT NULL CONSTRAINT DF_Tasks_Archived DEFAULT 0,
    ArchivedAt DATETIME2(3) NULL,
    ArchivedBy NVARCHAR(64) NULL,
    ServerVersion INT NOT NULL CONSTRAINT DF_Tasks_ServerVersion DEFAULT 1,
    CONSTRAINT FK_Tasks_Creator FOREIGN KEY (CreatorId) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_Tasks_ArchivedBy FOREIGN KEY (ArchivedBy) REFERENCES dbo.Users(UserId)
  );

  CREATE INDEX IX_Tasks_LastModifiedAt ON dbo.Tasks (LastModifiedAt);
  CREATE INDEX IX_Tasks_Archived ON dbo.Tasks (Archived, LastModifiedAt DESC);
END;

IF OBJECT_ID('dbo.TaskSyncOperations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.TaskSyncOperations (
    OperationId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TaskSyncOperations PRIMARY KEY,
    TaskId UNIQUEIDENTIFIER NOT NULL,
    ResultServerVersion INT NOT NULL,
    ProcessedAt DATETIME2(3) NOT NULL CONSTRAINT DF_TaskSyncOperations_ProcessedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_TaskSyncOperations_Task FOREIGN KEY (TaskId) REFERENCES dbo.Tasks(TaskId)
  );
END;

COMMIT TRANSACTION;

/*
Recovery notes:
Back up the database before applying this migration. To roll back an unused
installation, drop TaskSyncOperations first, then Tasks, then Users. Do not use
that rollback after production records exist; restore the pre-migration backup.
*/