/*
Run this script as a SQL Server administrator before the application migrations.

Before running:
1. Replace CHANGE_ME_SHARED_DATABASE with the existing shared database name.
2. Replace CHANGE_ME_STRONG_PASSWORD with a unique generated password.
3. Keep the populated script outside source control and store the password in the
   approved secret store.

The script is idempotent. It does not change the password of an existing login.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @TargetDatabase sysname = N'CHANGE_ME_SHARED_DATABASE';
DECLARE @AppPassword nvarchar(128) = N'CHANGE_ME_STRONG_PASSWORD';

IF @TargetDatabase = N'CHANGE_ME_SHARED_DATABASE'
  THROW 51000, 'Set @TargetDatabase before running this script.', 1;

IF @AppPassword = N'CHANGE_ME_STRONG_PASSWORD' OR LEN(@AppPassword) < 16
  THROW 51000, 'Set @AppPassword to a unique password of at least 16 characters.', 1;

IF DB_ID(@TargetDatabase) IS NULL
  THROW 51000, 'The target shared database does not exist.', 1;

USE master;

IF SUSER_ID(N'remme_app') IS NULL
BEGIN
  DECLARE @CreateLoginSql nvarchar(max) =
    N'CREATE LOGIN [remme_app] WITH PASSWORD = '
    + QUOTENAME(@AppPassword, '''')
    + N', CHECK_POLICY = ON, CHECK_EXPIRATION = OFF;';
  EXEC sys.sp_executesql @CreateLoginSql;
END;

DECLARE @SetDefaultDatabaseSql nvarchar(max) =
  N'ALTER LOGIN [remme_app] WITH DEFAULT_DATABASE = '
  + QUOTENAME(@TargetDatabase)
  + N';';
EXEC sys.sp_executesql @SetDefaultDatabaseSql;

DECLARE @ConfigureDatabaseSql nvarchar(max) =
  N'USE ' + QUOTENAME(@TargetDatabase) + N';
    IF DATABASE_PRINCIPAL_ID(N''remme_app'') IS NULL
      CREATE USER [remme_app] FOR LOGIN [remme_app] WITH DEFAULT_SCHEMA = [dbo];

    IF DATABASE_PRINCIPAL_ID(N''remme_app_role'') IS NULL
      CREATE ROLE [remme_app_role] AUTHORIZATION [dbo];

    IF NOT EXISTS (
      SELECT 1
      FROM sys.database_role_members drm
      INNER JOIN sys.database_principals role_principal
        ON role_principal.principal_id = drm.role_principal_id
      INNER JOIN sys.database_principals member_principal
        ON member_principal.principal_id = drm.member_principal_id
      WHERE role_principal.name = N''remme_app_role''
        AND member_principal.name = N''remme_app''
    )
      ALTER ROLE [remme_app_role] ADD MEMBER [remme_app];

    GRANT CONNECT TO [remme_app];';
EXEC sys.sp_executesql @ConfigureDatabaseSql;

SELECT
  N'remme_app' AS LoginName,
  @TargetDatabase AS DatabaseName,
  N'remme_app_role' AS DatabaseRole,
  N'Bootstrap complete; run migrations 001 through 005 next.' AS NextStep;
