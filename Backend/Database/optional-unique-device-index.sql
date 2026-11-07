-- This database.sql already includes DeviceCommands. Do not recreate the table.
-- A device may be associated with at most one plant (NULLs are permitted).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_UserPlants_DeviceID' AND object_id = OBJECT_ID('dbo.UserPlants'))
BEGIN
    CREATE UNIQUE INDEX UX_UserPlants_DeviceID ON dbo.UserPlants(DeviceID) WHERE DeviceID IS NOT NULL;
END;
