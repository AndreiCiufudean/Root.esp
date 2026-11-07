-- Root.esp v2.3: kids accounts. Run once against an existing database (safe to re-run).
-- A kids account shares its parent's email, has its own password and a display name.
-- Email stays unique for adult accounts; kids accounts with the same email are allowed.
IF COL_LENGTH('dbo.Users','ParentUserID') IS NULL
  ALTER TABLE dbo.Users ADD ParentUserID INT NULL CONSTRAINT FK_Users_Parent REFERENCES dbo.Users(UserID);
IF COL_LENGTH('dbo.Users','IsKid') IS NULL
  ALTER TABLE dbo.Users ADD IsKid BIT NOT NULL CONSTRAINT DF_Users_IsKid DEFAULT 0;
IF COL_LENGTH('dbo.Users','DisplayName') IS NULL
  ALTER TABLE dbo.Users ADD DisplayName NVARCHAR(30) NULL;
GO
-- Replace the table-level UNIQUE(Email) with a filtered unique index on adult accounts only.
DECLARE @name SYSNAME, @sql NVARCHAR(400);
SELECT TOP 1 @name = kc.name
FROM sys.key_constraints kc
JOIN sys.index_columns ic ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE kc.parent_object_id = OBJECT_ID('dbo.Users') AND kc.type = 'UQ' AND c.name = 'Email'
  AND (SELECT COUNT(*) FROM sys.index_columns x WHERE x.object_id = kc.parent_object_id AND x.index_id = kc.unique_index_id) = 1;
IF @name IS NOT NULL
BEGIN
  SET @sql = N'ALTER TABLE dbo.Users DROP CONSTRAINT ' + QUOTENAME(@name);
  EXEC sp_executesql @sql;
END;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Users_AdultEmail' AND object_id = OBJECT_ID('dbo.Users'))
  CREATE UNIQUE INDEX UX_Users_AdultEmail ON dbo.Users(Email) WHERE ParentUserID IS NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_Parent' AND object_id = OBJECT_ID('dbo.Users'))
  CREATE INDEX IX_Users_Parent ON dbo.Users(ParentUserID) WHERE ParentUserID IS NOT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Users_KidParent')
  ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_KidParent CHECK ((IsKid = 1 AND ParentUserID IS NOT NULL) OR (IsKid = 0 AND ParentUserID IS NULL));
GO
