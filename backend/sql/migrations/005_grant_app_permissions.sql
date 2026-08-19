/*
Run this migration after 001 through 004 while connected to the target shared
database. Script 000_create_app_login.sql must have been run first.

The application receives no permission on unrelated dbo objects.
*/

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF DB_NAME() IN (N'master', N'model', N'msdb', N'tempdb')
  THROW 51000, 'Run this migration in the Remember That target database, not a system database.', 1;

IF SUSER_ID(N'remme_app') IS NULL
  THROW 51000, 'The remme_app login does not exist. Run the security bootstrap first.', 1;

IF DATABASE_PRINCIPAL_ID(N'remme_app') IS NULL
  THROW 51000, 'The remme_app database user does not exist. Run the security bootstrap first.', 1;

IF DATABASE_PRINCIPAL_ID(N'remme_app_role') IS NULL
  THROW 51000, 'The remme_app_role database role does not exist. Run the security bootstrap first.', 1;

IF OBJECT_ID(N'dbo.remme_Users', N'U') IS NULL
   OR OBJECT_ID(N'dbo.remme_Tasks', N'U') IS NULL
   OR OBJECT_ID(N'dbo.remme_TaskSyncOperations', N'U') IS NULL
   OR OBJECT_ID(N'dbo.remme_InventoryRecords', N'U') IS NULL
   OR OBJECT_ID(N'dbo.remme_InventorySyncOperations', N'U') IS NULL
   OR OBJECT_ID(N'dbo.remme_RecordDeletionLog', N'U') IS NULL
   OR OBJECT_ID(N'dbo.remme_Attachments', N'U') IS NULL
   OR OBJECT_ID(N'dbo.remme_AttachmentSyncOperations', N'U') IS NULL
  THROW 51000, 'One or more remme_ tables are missing. Run migrations 001 through 004 first.', 1;

GRANT SELECT ON OBJECT::dbo.remme_Users TO [remme_app_role];

GRANT SELECT, INSERT, UPDATE, DELETE
  ON OBJECT::dbo.remme_Tasks TO [remme_app_role];
GRANT SELECT, INSERT, DELETE
  ON OBJECT::dbo.remme_TaskSyncOperations TO [remme_app_role];

GRANT SELECT, INSERT, UPDATE, DELETE
  ON OBJECT::dbo.remme_InventoryRecords TO [remme_app_role];
GRANT SELECT, INSERT, DELETE
  ON OBJECT::dbo.remme_InventorySyncOperations TO [remme_app_role];

GRANT SELECT, INSERT
  ON OBJECT::dbo.remme_RecordDeletionLog TO [remme_app_role];

GRANT SELECT, INSERT, DELETE
  ON OBJECT::dbo.remme_Attachments TO [remme_app_role];
GRANT SELECT, INSERT, DELETE
  ON OBJECT::dbo.remme_AttachmentSyncOperations TO [remme_app_role];

COMMIT TRANSACTION;

SELECT
  DB_NAME() AS DatabaseName,
  N'remme_app' AS DatabaseUser,
  N'remme_app_role' AS DatabaseRole,
  N'Object-level permissions granted.' AS Result;

/*
Recovery notes:
To remove application access without deleting data, run:
  ALTER ROLE [remme_app_role] DROP MEMBER [remme_app];
  REVOKE CONNECT FROM [remme_app];

Do not drop the login or user until the application has been stopped and the
approved credential rollback process has been confirmed.
*/
