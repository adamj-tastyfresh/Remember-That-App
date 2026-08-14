SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.Attachments', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Attachments (
    AttachmentId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Attachments PRIMARY KEY,
    ParentRecordId UNIQUEIDENTIFIER NOT NULL,
    ParentRecordType NVARCHAR(20) NOT NULL,
    OriginalFilename NVARCHAR(255) NOT NULL,
    StoredFilename NVARCHAR(255) NOT NULL,
    FileType NVARCHAR(150) NOT NULL,
    FileSize BIGINT NOT NULL,
    UploadedById NVARCHAR(64) NOT NULL,
    DeviceCreatedAt DATETIME2(3) NOT NULL,
    ServerCreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Attachments_ServerCreatedAt DEFAULT SYSUTCDATETIME(),
    StorageReference NVARCHAR(1000) NOT NULL,
    CONSTRAINT CK_Attachments_ParentType CHECK (ParentRecordType IN ('task', 'inventory')),
    CONSTRAINT CK_Attachments_FileSize CHECK (FileSize > 0),
    CONSTRAINT FK_Attachments_UploadedBy FOREIGN KEY (UploadedById) REFERENCES dbo.Users(UserId)
  );

  CREATE INDEX IX_Attachments_Parent ON dbo.Attachments (ParentRecordType, ParentRecordId, ServerCreatedAt);
END;

IF OBJECT_ID('dbo.AttachmentSyncOperations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.AttachmentSyncOperations (
    OperationId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_AttachmentSyncOperations PRIMARY KEY,
    AttachmentId UNIQUEIDENTIFIER NOT NULL,
    ProcessedAt DATETIME2(3) NOT NULL CONSTRAINT DF_AttachmentSyncOperations_ProcessedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_AttachmentSyncOperations_Attachment FOREIGN KEY (AttachmentId) REFERENCES dbo.Attachments(AttachmentId)
  );
END;

COMMIT TRANSACTION;

/*
Recovery notes:
Back up the database before applying this migration. This script creates metadata
only; actual files remain in the approved internal file store. For an unused
installation, drop AttachmentSyncOperations first, then Attachments. Do not use
that rollback after attachment uploads exist without also following the approved
file-store recovery procedure.
*/
