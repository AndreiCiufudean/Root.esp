-- Run ONLY on existing root_esp databases created before device authentication.
-- New installations already have this column in database.sql.
IF COL_LENGTH('dbo.EspDevices', 'DeviceKeyHash') IS NULL
BEGIN
    ALTER TABLE dbo.EspDevices ADD DeviceKeyHash varchar(64) NULL;
END;
GO
-- Existing devices remain unauthorized until their owner rotates/generates a key.
