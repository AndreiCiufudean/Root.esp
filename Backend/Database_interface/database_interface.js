
const odbc = require('odbc');

const connectionString =
    'Driver={ODBC Driver 18 for SQL Server};' +
    'Server=(localdb)\\MSSQLLocalDB;' +
    'Database=root_esp;' +
    'Trusted_Connection=Yes;' +
    'TrustServerCertificate=Yes;';

// 1. Conectare la baza de date
async function connectDatabase() {
    return await odbc.connect(connectionString);
}

// 2. Catalog plante
async function getPlantCatalog() {
    const db = await connectDatabase();
    try {
        return await db.query('SELECT * FROM PlantCatalog');
    } finally {
        await db.close();
    }
}

// 3. Catalog boli
async function getDiseaseCatalog() {
    const db = await connectDatabase();
    try {
        return await db.query('SELECT * FROM DiseaseCatalog');
    } finally {
        await db.close();
    }
}

// 4. Plantele unui utilizator
async function getUserPlants(userID) {
    const db = await connectDatabase();
    try {
        return await db.query(
            'SELECT * FROM UserPlants WHERE UserID = ?',
            [userID]
        );
    } finally {
        await db.close();
    }
}

// 5. Adăugare plantă
async function addUserPlant(plant) {
    const db = await connectDatabase();
    try {
        const result = await db.query(
            `INSERT INTO UserPlants
            (UserID, SpeciesID, DeviceID, PlantName,
             Location, PlantedAt, Notes, CreatedAt)
             OUTPUT INSERTED.PlantID
             VALUES (?, ?, ?, ?, ?, ?, ?, SYSDATETIME())`,
            [
                plant.userID,
                plant.speciesID ?? null,
                plant.deviceID ?? null,
                plant.plantName,
                plant.location ?? null,
                plant.plantedAt ?? null,
                plant.notes ?? null
            ]
        );
        return result[0].PlantID;
    } finally {
        await db.close();
    }
}

// 6. Salvare măsurători senzori
async function saveSensorMeasurement(data) {
    const db = await connectDatabase();
    try {
        const result = await db.query(
            `INSERT INTO SensorMeasurements
            (PlantID, SoilMoisture, AirTemperature,
             AirHumidity, LightLevel, FanStatus, MeasuredAt)
             OUTPUT INSERTED.MeasurementID
             VALUES (?, ?, ?, ?, ?, ?, SYSDATETIME())`,
            [
                data.plantID,
                data.soilMoisture ?? null,
                data.airTemperature ?? null,
                data.airHumidity ?? null,
                data.lightLevel ?? null,
                data.fanStatus ?? null
            ]
        );
        return result[0].MeasurementID;
    } finally {
        await db.close();
    }
}

// 7. Istoric măsurători
async function getSensorMeasurements(plantID) {
    const db = await connectDatabase();
    try {
        return await db.query(
            `SELECT * FROM SensorMeasurements
             WHERE PlantID = ?
             ORDER BY MeasuredAt DESC`,
            [plantID]
        );
    } finally {
        await db.close();
    }
}

// 8. Citire setări de îngrijire
async function getPlantCareSettings(plantID) {
    const db = await connectDatabase();
    try {
        return await db.query(
            'SELECT * FROM PlantCareSettings WHERE PlantID = ?',
            [plantID]
        );
    } finally {
        await db.close();
    }
}

// 9. Actualizare setări de îngrijire
async function updatePlantCareSettings(settings) {
    const db = await connectDatabase();
    try {
        await db.query(
            `UPDATE PlantCareSettings
             SET SoilMoistureThreshold = ?,
                 AutomaticWateringEnabled = ?,
                 WateringDurationSeconds = ?,
                 FanAutomaticEnabled = ?,
                 FanStartTemperature = ?,
                 FanStopTemperature = ?,
                 UpdatedAt = SYSDATETIME()
             WHERE PlantID = ?`,
            [
                settings.soilMoistureThreshold,
                settings.automaticWateringEnabled,
                settings.wateringDurationSeconds,
                settings.fanAutomaticEnabled,
                settings.fanStartTemperature,
                settings.fanStopTemperature,
                settings.plantID
            ]
        );
    } finally {
        await db.close();
    }
}

// 10. Dispozitivele unui utilizator
async function getUserDevices(userID) {
    const db = await connectDatabase();
    try {
        return await db.query(
            'SELECT * FROM EspDevices WHERE UserID = ?',
            [userID]
        );
    } finally {
        await db.close();
    }
}

// 11. Adăugare dispozitiv
async function addDevice(device) {
    const db = await connectDatabase();
    try {
        const result = await db.query(
            `INSERT INTO EspDevices
            (UserID, DeviceName, DeviceCode, IsActive, CreatedAt)
             OUTPUT INSERTED.DeviceID
             VALUES (?, ?, ?, ?, SYSDATETIME())`,
            [
                device.userID,
                device.deviceName,
                device.deviceCode,
                device.isActive ?? true
            ]
        );
        return result[0].DeviceID;
    } finally {
        await db.close();
    }
}

// 12. Actualizare ultima conectare a dispozitivului
async function updateDeviceLastSeen(deviceID) {
    const db = await connectDatabase();
    try {
        await db.query(
            `UPDATE EspDevices
             SET LastSeenAt = SYSDATETIME()
             WHERE DeviceID = ?`,
            [deviceID]
        );
    } finally {
        await db.close();
    }
}

// 13. Creare comandă pentru dispozitiv
async function createDeviceCommand(command) {
    const db = await connectDatabase();
    try {
        const result = await db.query(
            `INSERT INTO DeviceCommands
            (DeviceID, CommandType, Status, CreatedAt,
             DurationSeconds, RequestedByUserID)
             OUTPUT INSERTED.CommandID
             VALUES (?, ?, ?, SYSDATETIME(), ?, ?)`,
            [
                command.deviceID,
                command.commandType,
                command.status ?? 'Pending',
                command.durationSeconds ?? null,
                command.requestedByUserID ?? null
            ]
        );
        return result[0].CommandID;
    } finally {
        await db.close();
    }
}

// 14. Citire comenzi dispozitiv
async function getDeviceCommands(deviceID) {
    const db = await connectDatabase();
    try {
        return await db.query(
            `SELECT * FROM DeviceCommands
             WHERE DeviceID = ?
             ORDER BY CreatedAt DESC`,
            [deviceID]
        );
    } finally {
        await db.close();
    }
}

// 15. Actualizare stare comandă
async function updateDeviceCommand(commandID, status) {
    const db = await connectDatabase();
    try {
        await db.query(
            `UPDATE DeviceCommands
             SET Status = ?, ExecutedAt = SYSDATETIME()
             WHERE CommandID = ?`,
            [status, commandID]
        );
    } finally {
        await db.close();
    }
}

// 16. Salvare udare în istoric
async function saveWateringHistory(watering) {
    const db = await connectDatabase();
    try {
        const result = await db.query(
            `INSERT INTO WateringHistory
            (PlantID, DeviceID, StartedAt, DurationSeconds,
             IsAutomatic, Status, Notes)
             OUTPUT INSERTED.WateringID
             VALUES (?, ?, SYSDATETIME(), ?, ?, ?, ?)`,
            [
                watering.plantID,
                watering.deviceID,
                watering.durationSeconds ?? null,
                watering.isAutomatic ?? false,
                watering.status,
                watering.notes ?? null
            ]
        );
        return result[0].WateringID;
    } finally {
        await db.close();
    }
}

// 17. Istoric udare pentru o plantă
async function getWateringHistory(plantID) {
    const db = await connectDatabase();
    try {
        return await db.query(
            `SELECT * FROM WateringHistory
             WHERE PlantID = ?
             ORDER BY StartedAt DESC`,
            [plantID]
        );
    } finally {
        await db.close();
    }
}

// 18. Creare notificare
async function createNotification(notification) {
    const db = await connectDatabase();
    try {
        const result = await db.query(
            `INSERT INTO UserNotifications
            (UserID, PlantID, NotificationType, Title,
             Message, CreatedAt, IsRead)
             OUTPUT INSERTED.NotificationID
             VALUES (?, ?, ?, ?, ?, SYSDATETIME(), 0)`,
            [
                notification.userID,
                notification.plantID ?? null,
                notification.notificationType,
                notification.title,
                notification.message
            ]
        );
        return result[0].NotificationID;
    } finally {
        await db.close();
    }
}

// 19. Notificările unui utilizator
async function getUserNotifications(userID) {
    const db = await connectDatabase();
    try {
        return await db.query(
            `SELECT * FROM UserNotifications
             WHERE UserID = ?
             ORDER BY CreatedAt DESC`,
            [userID]
        );
    } finally {
        await db.close();
    }
}

// 20. Marcare notificare ca citită
async function markNotificationAsRead(notificationID) {
    const db = await connectDatabase();
    try {
        await db.query(
            `UPDATE UserNotifications
             SET IsRead = 1
             WHERE NotificationID = ?`,
            [notificationID]
        );
    } finally {
        await db.close();
    }
}

// 21. Fotografii ale unei plante
async function getPlantPhotos(plantID) {
    const db = await connectDatabase();
    try {
        return await db.query(
            `SELECT * FROM PlantPhotos
             WHERE PlantID = ?
             ORDER BY UploadedAt DESC`,
            [plantID]
        );
    } finally {
        await db.close();
    }
}

// 22. Salvare fotografie (URL-ul imaginii)
async function addPlantPhoto(photo) {
    const db = await connectDatabase();
    try {
        const result = await db.query(
            `INSERT INTO PlantPhotos
            (PlantID, PhotoURL, Caption, UploadedAt)
             OUTPUT INSERTED.PhotoID
             VALUES (?, ?, ?, SYSDATETIME())`,
            [
                photo.plantID,
                photo.photoURL,
                photo.caption ?? null
            ]
        );
        return result[0].PhotoID;
    } finally {
        await db.close();
    }
}

// 23. Ștergere fotografie
async function deletePlantPhoto(photoID) {
    const db = await connectDatabase();
    try {
        await db.query(
            'DELETE FROM PlantPhotos WHERE PhotoID = ?',
            [photoID]
        );
    } finally {
        await db.close();
    }
}

// 24. Rapoarte despre bolile unei plante
async function getPlantDiseaseReports(plantID) {
    const db = await connectDatabase();
    try {
        return await db.query(
            `SELECT * FROM PlantDiseaseReports
             WHERE PlantID = ?
             ORDER BY ReportedAt DESC`,
            [plantID]
        );
    } finally {
        await db.close();
    }
}

// 25. Creare raport despre o boală
async function addPlantDiseaseReport(report) {
    const db = await connectDatabase();
    try {
        const result = await db.query(
            `INSERT INTO PlantDiseaseReports
            (PlantID, DiseaseID, ReportedAt, Status,
             SymptomsObserved, Notes, TreatmentApplied, ResolvedAt)
             OUTPUT INSERTED.ReportID
             VALUES (?, ?, SYSDATETIME(), ?, ?, ?, ?, NULL)`,
            [
                report.plantID,
                report.diseaseID ?? null,
                report.status,
                report.symptomsObserved ?? null,
                report.notes ?? null,
                report.treatmentApplied ?? null
            ]
        );
        return result[0].ReportID;
    } finally {
        await db.close();
    }
}

// 26. Actualizare raport despre boală
async function updatePlantDiseaseReport(report) {
    const db = await connectDatabase();
    try {
        await db.query(
            `UPDATE PlantDiseaseReports
             SET Status = ?,
                 SymptomsObserved = ?,
                 Notes = ?,
                 TreatmentApplied = ?,
                 ResolvedAt = ?
             WHERE ReportID = ?`,
            [
                report.status,
                report.symptomsObserved ?? null,
                report.notes ?? null,
                report.treatmentApplied ?? null,
                report.resolvedAt ?? null,
                report.reportID
            ]
        );
    } finally {
        await db.close();
    }
}

// 27. Boli asociate unei specii de plantă
async function getDiseasesForSpecies(speciesID) {
    const db = await connectDatabase();
    try {
        return await db.query(
            `SELECT d.*
             FROM DiseaseCatalog d
             INNER JOIN PlantSpeciesDiseases psd
                 ON d.DiseaseID = psd.DiseaseID
             WHERE psd.SpeciesID = ?`,
            [speciesID]
        );
    } finally {
        await db.close();
    }
}

// 28. Istoric activități de îngrijire
async function getPlantCareActivities(plantID) {
    const db = await connectDatabase();
    try {
        return await db.query(
            `SELECT * FROM PlantCareActivities
             WHERE PlantID = ?
             ORDER BY ActivityDate DESC`,
            [plantID]
        );
    } finally {
        await db.close();
    }
}

// 29. Adăugare activitate de îngrijire
async function addPlantCareActivity(activity) {
    const db = await connectDatabase();
    try {
        const result = await db.query(
            `INSERT INTO PlantCareActivities
            (PlantID, ActivityType, ActivityDate, Notes)
             OUTPUT INSERTED.ActivityID
             VALUES (?, ?, SYSDATETIME(), ?)`,
            [
                activity.plantID,
                activity.activityType,
                activity.notes ?? null
            ]
        );
        return result[0].ActivityID;
    } finally {
        await db.close();
    }
}


async function addUserPlant(plant) {
    const db = await connectDatabase();

    try {
        const result = await db.query(
            `INSERT INTO UserPlants
                (UserID, PlantName, Location, PlantedAt, Notes, CreatedAt)
             OUTPUT INSERTED.PlantID
             VALUES (?, ?, ?, ?, ?, SYSDATETIME())`,
            [
                plant.userID,
                plant.plantName,
                plant.location || null,
                plant.plantedAt || null,
                plant.notes || null
            ]
        );

        return result[0].PlantID;
    } finally {
        await db.close();
    }
}


// 30. Exportarea funcțiilor
module.exports = {
    connectDatabase,
    getPlantCatalog,
    getDiseaseCatalog,
    getUserPlants,
    addUserPlant,
    saveSensorMeasurement,
    getSensorMeasurements,
    getPlantCareSettings,
    updatePlantCareSettings,
    getUserDevices,
    addDevice,
    updateDeviceLastSeen,
    createDeviceCommand,
    getDeviceCommands,
    updateDeviceCommand,
    saveWateringHistory,
    getWateringHistory,
    createNotification,
    getUserNotifications,
    markNotificationAsRead,
    getPlantPhotos,
    addPlantPhoto,
    deletePlantPhoto,
    getPlantDiseaseReports,
    addPlantDiseaseReport,
    updatePlantDiseaseReport,
    getDiseasesForSpecies,
    getPlantCareActivities,
    addPlantCareActivity,
    getUserByEmail,
    createUser,
    addUserPlant
}
// Autentificare: caută utilizator după email
async function getUserByEmail(email) {
    const db = await connectDatabase();

    try {
        const result = await db.query(
            `SELECT UserID, Username, Email, PasswordHash, IsAdmin, IsActive
             FROM Users
             WHERE Email = ?`,
            [email]
        );

        return result[0] || null;
    } finally {
        await db.close();
    }
}

// Înregistrare utilizator
async function createUser(user) {
    const db = await connectDatabase();

    try {
        const result = await db.query(
            `INSERT INTO Users
             (Username, Email, PasswordHash, IsAdmin, IsActive, CreatedAt)
             OUTPUT INSERTED.UserID
             VALUES (?, ?, ?, 0, 1, SYSDATETIME())`,
            [user.username, user.email, user.passwordHash]
        );

        return result[0].UserID;
    } finally {
        await db.close();
    }
}
