-- Apply after backing up the database. Provision devices out of band: insert
-- their unique DeviceCode and SHA256(DeviceKey) into this table. Never ship keys
-- with the mobile application. Existing registered devices are unaffected.
IF OBJECT_ID('dbo.RootDeviceProvisioning','U') IS NULL
BEGIN
 CREATE TABLE dbo.RootDeviceProvisioning (
   DeviceCode NVARCHAR(100) NOT NULL PRIMARY KEY,
   DeviceKeyHash CHAR(64) NOT NULL,
   ClaimedByUserID INT NULL REFERENCES dbo.Users(UserID),
   ClaimedAt DATETIME2 NULL
 );
END;
