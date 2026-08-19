SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.remme_Attachments', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.remme_Attachments (
    AttachmentId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_remme_Attachments PRIMARY KEY,
    ParentRecordId UNIQUEIDENTIFIER NOT NULL,
    ParentRecordType NVARCHAR(20) NOT NULL,
    OriginalFilename NVARCHAR(255) NOT NULL,
    StoredFilename NVARCHAR(255) NOT NULL,
    FileType NVARCHAR(150) NOT NULL,
    FileSize BIGINT NOT NULL,
    UploadedById NVARCHAR(64) NOT NULL,
    DeviceCreatedAt DATETIME2(3) NOT NULL,
    ServerCreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_remme_Attachments_ServerCreatedAt DEFAULT SYSUTCDATETIME(),
    StorageReference NVARCHAR(1000) NOT NULL,
    CONSTRAINT CK_remme_Attachments_ParentType CHECK (ParentRecordType IN ('task', 'inventory')),
    CONSTRAINT CK_remme_Attachments_FileSize CHECK (FileSize > 0),
    CONSTRAINT FK_remme_Attachments_UploadedBy FOREIGN KEY (UploadedById) REFERENCES dbo.remme_Users(UserId)
  );

  CREATE INDEX IX_remme_Attachments_Parent ON dbo.remme_Attachments (ParentRecordType, ParentRecordId, ServerCreatedAt);
END;

IF OBJECT_ID('dbo.remme_AttachmentSyncOperations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.remme_AttachmentSyncOperations (
    OperationId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_remme_AttachmentSyncOperations PRIMARY KEY,
    AttachmentId UNIQUEIDENTIFIER NOT NULL,
    ProcessedAt DATETIME2(3) NOT NULL CONSTRAINT DF_remme_AttachmentSyncOperations_ProcessedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_remme_AttachmentSyncOperations_Attachment FOREIGN KEY (AttachmentId) REFERENCES dbo.remme_Attachments(AttachmentId)
  );
END;

COMMIT TRANSACTION;

/*
Recovery notes:
Back up the database before applying this migration. This script creates metadata
only; actual files remain in the approved internal file store. For an unused
installation, drop remme_AttachmentSyncOperations first, then remme_Attachments. Do not use
that rollback after attachment uploads exist without also following the approved
file-store recovery procedure.
*/
