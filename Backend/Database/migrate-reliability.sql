-- Back up your existing database first. New installations already use UTC defaults.
-- IMPORTANT: old datetime2 timestamps have no timezone. Convert historical rows
-- from their known original timezone to UTC BEFORE mixing with the updated API.
-- Do not guess the original timezone or blindly subtract a fixed UTC offset (DST).
-- Example ONLY after confirming the data was Romanian local time:
-- UPDATE dbo.EspDevices SET LastSeenAt=CAST(LastSeenAt AT TIME ZONE 'GTB Standard Time' AT TIME ZONE 'UTC' AS datetime2);
-- Apply the equivalent conversion to all historical timestamp columns in use.
-- This migration does not rewrite historical records automatically.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
DECLARE @sql nvarchar(max)=N'';
SELECT @sql=@sql+N'ALTER TABLE '+QUOTENAME(OBJECT_SCHEMA_NAME(d.parent_object_id))+N'.'+QUOTENAME(OBJECT_NAME(d.parent_object_id))+N' DROP CONSTRAINT '+QUOTENAME(d.name)+N'; ALTER TABLE '+QUOTENAME(OBJECT_SCHEMA_NAME(d.parent_object_id))+N'.'+QUOTENAME(OBJECT_NAME(d.parent_object_id))+N' ADD DEFAULT SYSUTCDATETIME() FOR '+QUOTENAME(c.name)+N';'
FROM sys.default_constraints d JOIN sys.columns c ON c.object_id=d.parent_object_id AND c.column_id=d.parent_column_id
WHERE OBJECT_SCHEMA_NAME(d.parent_object_id)='dbo' AND LOWER(d.definition) LIKE '%sysdatetime()%';
EXEC sp_executesql @sql;
-- Inspect duplicates; resolve physically uncertain watering before enabling uniqueness.
IF EXISTS(SELECT DeviceID FROM dbo.DeviceCommands WHERE Status IN ('Pending','Processing') GROUP BY DeviceID HAVING COUNT(*)>1)
BEGIN
 ROLLBACK;
 THROW 50001,'Reconcile existing duplicate active commands before running this migration.',1;
END;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_DeviceCommands_ActiveDevice' AND object_id=OBJECT_ID('dbo.DeviceCommands'))
 CREATE UNIQUE INDEX UX_DeviceCommands_ActiveDevice ON dbo.DeviceCommands(DeviceID) WHERE Status IN ('Pending','Processing');
COMMIT;
