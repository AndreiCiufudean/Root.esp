-- Run AFTER database.sql. Safe to re-run. Existing community tables/data are retained
-- for export or deletion on request; no destructive migration is performed.
IF OBJECT_ID('dbo.NatureSpecies','U') IS NULL
CREATE TABLE dbo.NatureSpecies (
  SpeciesID INT IDENTITY PRIMARY KEY,
  NameKey NVARCHAR(160) NOT NULL UNIQUE,
  CommonName NVARCHAR(120) NOT NULL,
  ScientificName NVARCHAR(160) NULL,
  Category NVARCHAR(24) NOT NULL
);
IF OBJECT_ID('dbo.NatureDiscoveries','U') IS NULL
CREATE TABLE dbo.NatureDiscoveries (
  DiscoveryID INT IDENTITY PRIMARY KEY,
  UserID INT NOT NULL REFERENCES dbo.Users(UserID),
  ClientID NVARCHAR(80) NOT NULL,
  SpeciesID INT NOT NULL REFERENCES dbo.NatureSpecies(SpeciesID),
  Notes NVARCHAR(1000) NOT NULL DEFAULT '',
  Confidence FLOAT NULL,
  ConfirmedByUser BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_NatureDiscoveryClient UNIQUE(UserID,ClientID)
);
IF OBJECT_ID('dbo.NatureUserSpecies','U') IS NULL
CREATE TABLE dbo.NatureUserSpecies (
  UserID INT NOT NULL REFERENCES dbo.Users(UserID),
  SpeciesID INT NOT NULL REFERENCES dbo.NatureSpecies(SpeciesID),
  FirstDiscoveryID INT NOT NULL REFERENCES dbo.NatureDiscoveries(DiscoveryID),
  PRIMARY KEY(UserID,SpeciesID)
);
IF OBJECT_ID('dbo.NatureChallenges','U') IS NULL
CREATE TABLE dbo.NatureChallenges (
  ChallengeID NVARCHAR(48) NOT NULL PRIMARY KEY,
  Title NVARCHAR(100) NOT NULL, Target INT NOT NULL, RewardPoints INT NOT NULL
);
IF OBJECT_ID('dbo.NatureChallengeProgress','U') IS NULL
CREATE TABLE dbo.NatureChallengeProgress (
  UserID INT NOT NULL REFERENCES dbo.Users(UserID),
  ChallengeID NVARCHAR(48) NOT NULL REFERENCES dbo.NatureChallenges(ChallengeID),
  Progress INT NOT NULL DEFAULT 0, CompletedAt DATETIME2 NULL,
  PRIMARY KEY(UserID,ChallengeID)
);
IF OBJECT_ID('dbo.NatureAchievements','U') IS NULL
CREATE TABLE dbo.NatureAchievements (
  AchievementID NVARCHAR(48) NOT NULL PRIMARY KEY,
  Title NVARCHAR(100) NOT NULL
);
IF OBJECT_ID('dbo.NatureUserAchievements','U') IS NULL
CREATE TABLE dbo.NatureUserAchievements (
  UserID INT NOT NULL REFERENCES dbo.Users(UserID),
  AchievementID NVARCHAR(48) NOT NULL REFERENCES dbo.NatureAchievements(AchievementID),
  EarnedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  PRIMARY KEY(UserID,AchievementID)
);
IF OBJECT_ID('dbo.NatureRewards','U') IS NULL
CREATE TABLE dbo.NatureRewards (
  RewardID NVARCHAR(48) NOT NULL PRIMARY KEY,
  Name NVARCHAR(100) NOT NULL, RequiredSpecies INT NOT NULL
);
IF OBJECT_ID('dbo.NatureUserRewards','U') IS NULL
CREATE TABLE dbo.NatureUserRewards (
  UserID INT NOT NULL REFERENCES dbo.Users(UserID),
  RewardID NVARCHAR(48) NOT NULL REFERENCES dbo.NatureRewards(RewardID),
  UnlockedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  PRIMARY KEY(UserID,RewardID)
);
MERGE dbo.NatureChallenges AS t USING (VALUES
 ('first_flower','A Little Color',1,20),('new_species','Familiar Stranger',1,30),
 ('three_species','Curious Observer',3,0),('five_species','Little Botanist',5,0)
) AS s(ChallengeID,Title,Target,RewardPoints) ON t.ChallengeID=s.ChallengeID
WHEN NOT MATCHED THEN INSERT (ChallengeID,Title,Target,RewardPoints) VALUES(s.ChallengeID,s.Title,s.Target,s.RewardPoints);
MERGE dbo.NatureAchievements AS t USING (VALUES
 ('first_flower','A Little Color'),('new_species','Familiar Stranger'),
 ('three_species','Curious Observer'),('five_species','Little Botanist')
) AS s(AchievementID,Title) ON t.AchievementID=s.AchievementID
WHEN NOT MATCHED THEN INSERT(AchievementID,Title) VALUES(s.AchievementID,s.Title);
MERGE dbo.NatureRewards AS t USING (VALUES
 ('butterfly','Butterfly companion',3),('flower_pot','Flower pot decoration',5)
) AS s(RewardID,Name,RequiredSpecies) ON t.RewardID=s.RewardID
WHEN NOT MATCHED THEN INSERT(RewardID,Name,RequiredSpecies) VALUES(s.RewardID,s.Name,s.RequiredSpecies);
