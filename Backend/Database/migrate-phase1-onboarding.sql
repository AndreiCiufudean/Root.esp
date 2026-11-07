-- Phase 1 migration: starter notifications (Welcome + OnboardingAlert).
-- Back up the database first. Safe to run more than once. Existing users and notifications are NOT changed:
-- only accounts created after this release receive the two starter notifications (no back-fill on purpose).
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF EXISTS (SELECT UserID, NotificationType FROM dbo.UserNotifications
           WHERE NotificationType IN (N'Welcome', N'OnboardingAlert')
           GROUP BY UserID, NotificationType HAVING COUNT(*) > 1)
BEGIN
  ROLLBACK;
  THROW 50002, 'Some users already have duplicate Welcome/OnboardingAlert notifications. Remove the duplicates, then run this again.', 1;
END;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_UserNotifications_Starter' AND object_id=OBJECT_ID(N'dbo.UserNotifications'))
  CREATE UNIQUE INDEX UX_UserNotifications_Starter ON dbo.UserNotifications(UserID, NotificationType) WHERE NotificationType IN (N'Welcome', N'OnboardingAlert');
COMMIT;
