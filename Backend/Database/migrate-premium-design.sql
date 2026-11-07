-- Run once against your existing Root.esp SQL Server database. Existing plant/device tables are unchanged.
IF OBJECT_ID('dbo.DesignReviewRequests','U') IS NULL
BEGIN
 CREATE TABLE dbo.DesignReviewRequests (
  RequestID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  UserID INT NOT NULL,
  DesignID UNIQUEIDENTIFIER NOT NULL,
  Workflow VARCHAR(16) NOT NULL,
  Material NVARCHAR(80) NOT NULL,
  Dimensions NVARCHAR(80) NULL,
  Notes NVARCHAR(1000) NULL,
  SpecificationsJSON NVARCHAR(3000) NULL,
  ImageBase64 VARCHAR(MAX) NOT NULL,
  Status VARCHAR(32) NOT NULL DEFAULT 'pending_review',
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_DesignReview_User FOREIGN KEY(UserID) REFERENCES dbo.Users(UserID),
  CONSTRAINT CK_DesignReview_Status CHECK (Status IN ('pending_review','approved','rejected','in_production','completed'))
 );
 CREATE INDEX IX_DesignReview_User ON dbo.DesignReviewRequests(UserID,CreatedAt DESC);
END;
