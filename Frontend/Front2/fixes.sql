/* SeraSmart - suggested changes to the database script */

/* 1. UserPlants.DeviceID UNIQUE: in SQL Server a UNIQUE constraint allows only ONE NULL,
      so only one plant without a device could exist. Use a filtered unique index instead. */
DECLARE @uq sysname = (
    SELECT kc.name
    FROM sys.key_constraints kc
    JOIN sys.tables t ON t.object_id = kc.parent_object_id
    WHERE t.name = 'UserPlants' AND kc.type = 'UQ'
      AND EXISTS (
        SELECT 1 FROM sys.index_columns ic
        JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE ic.object_id = kc.parent_object_id
          AND ic.index_id = kc.unique_index_id
          AND c.name = 'DeviceID'));
IF @uq IS NOT NULL EXEC('ALTER TABLE UserPlants DROP CONSTRAINT ' + QUOTENAME(@uq));

CREATE UNIQUE INDEX UX_UserPlants_DeviceID
    ON UserPlants(DeviceID) WHERE DeviceID IS NOT NULL;


/* 2. Commands for the ESP32 (needed for the "Water now" button).
      The app/backend inserts a row; the ESP32 polls for Pending commands. */
CREATE TABLE DeviceCommands (
    CommandID BIGINT IDENTITY(1,1) PRIMARY KEY,
    DeviceID INT NOT NULL,
    CommandType NVARCHAR(30) NOT NULL,      -- e.g. 'WaterNow'
    DurationSeconds INT NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT N'Pending',
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    ExecutedAt DATETIME2 NULL,

    CONSTRAINT FK_DeviceCommands_EspDevices
        FOREIGN KEY (DeviceID) REFERENCES EspDevices(DeviceID),
    CONSTRAINT CK_DeviceCommands_Status
        CHECK (Status IN (N'Pending', N'Done', N'Failed'))
);

CREATE INDEX IX_DeviceCommands_DeviceStatus
    ON DeviceCommands(DeviceID, Status);
