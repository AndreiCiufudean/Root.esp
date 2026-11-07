
const odbc = require('odbc');
const crypto = require('node:crypto');
const {normalizeRows}=require('./db_types');
const normalizedConnections=new WeakSet();

const connectionString = process.env.ODBC_CONNECTION_STRING ||
    'Driver={ODBC Driver 18 for SQL Server};Server=(localdb)\\MSSQLLocalDB;Database=root_esp;Trusted_Connection=Yes;TrustServerCertificate=Yes;';

// 1. Conectare la baza de date
async function connectDatabase() {
    const connection=await odbc.connect(connectionString);
    if(!normalizedConnections.has(connection)){
      const query=connection.query.bind(connection);
      connection.query=async(...args)=>normalizeRows(await query(...args));
      normalizedConnections.add(connection);
    }
    return connection;
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
    let transactionOpen = false;
    try {
        await db.beginTransaction();
        transactionOpen = true;
        let speciesID = plant.speciesID ?? null;
        if (plant.customSpecies) {
            // user-defined plant type: stored in the shared catalog so it appears in the species list
            const c = plant.customSpecies;
            const created = await db.query(
                `INSERT INTO PlantCatalog
                (CommonName, Category, Description, MinSoilMoisture, MaxSoilMoisture, MinTemperature, MaxTemperature, LightRequirements, WateringAdvice, CareInstructions)
                OUTPUT INSERTED.SpeciesID
                VALUES (?, ?, 'Custom plant type.', ?, ?, 15, 28, ?, 'Water when the soil is dry to the touch.', 'Custom plant type, no care notes yet.')`,
                [c.commonName, c.category, c.minSoilMoisture, c.maxSoilMoisture, c.lightRequirements]
            );
            speciesID = created[0].SpeciesID;
        }
        const result = await db.query(
            `INSERT INTO UserPlants
            (UserID, SpeciesID, DeviceID, PlantName,
             Location, PlantedAt, Notes, CreatedAt)
             OUTPUT INSERTED.PlantID
             VALUES (?, ?, ?, ?, ?, ?, ?, SYSUTCDATETIME())`,
            [
                plant.userID,
                speciesID,
                plant.deviceID ?? null,
                plant.plantName,
                plant.location ?? null,
                plant.plantedAt ?? null,
                plant.notes ?? null
            ]
        );
        const plantID = result[0].PlantID;
        await db.query(`INSERT INTO PlantCareSettings
            (PlantID, SoilMoistureThreshold, AutomaticWateringEnabled, WateringDurationSeconds,
             FanAutomaticEnabled, FanStartTemperature, FanStopTemperature, UpdatedAt)
             VALUES (?, 30, 0, 5, 0, 28, 24, SYSUTCDATETIME())`, [plantID]);
        await db.commit();
        transactionOpen = false;
        return plantID;
    } catch (err) {
        if (transactionOpen) {
            try { await db.rollback(); } catch (rollbackError) { console.error('Plant creation rollback failed:', rollbackError); }
        }
        throw err;
    } finally {
        await db.close();
    }
}

// 5b. Ștergere plantă (cu tot ce ține de ea). Dispozitivul rămâne înregistrat și devine liber.
// Comenzile de udare încă neluate de dispozitiv (Pending) sunt anulate, ca să nu ude după ștergere;
// o comandă deja Processing nu e atinsă (pompa poate fi pornită chiar acum).
async function deleteUserPlant(plantID, userID) {
    const db = await connectDatabase();
    let transactionOpen = false;
    try {
        await db.beginTransaction();
        transactionOpen = true;
        const rows = await db.query('SELECT PlantID, DeviceID FROM UserPlants WHERE PlantID = ? AND UserID = ?', [plantID, userID]);
        if (!rows.length) { await db.rollback(); transactionOpen = false; return false; }
        const deviceID = rows[0].DeviceID;
        if (deviceID) {
            await db.query(`UPDATE DeviceCommands SET Status = 'Cancelled', ExecutedAt = SYSUTCDATETIME()
                            WHERE DeviceID = ? AND Status = 'Pending'`, [deviceID]);
        }
        for (const table of ['WateringHistory', 'SensorMeasurements', 'PlantCareActivities', 'PlantDiseaseReports', 'PlantPhotos', 'UserNotifications', 'PlantCareSettings']) {
            await db.query(`DELETE FROM ${table} WHERE PlantID = ?`, [plantID]);
        }
        await db.query('DELETE FROM UserPlants WHERE PlantID = ? AND UserID = ?', [plantID, userID]);
        await db.commit();
        transactionOpen = false;
        return true;
    } catch (err) {
        if (transactionOpen) {
            try { await db.rollback(); } catch (rollbackError) { console.error('Plant deletion rollback failed:', rollbackError); }
        }
        throw err;
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
             VALUES (?, ?, ?, ?, ?, ?, SYSUTCDATETIME())`,
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
async function updatePlantCareSettings(settings,expected) {
    const db=await connectDatabase();let open=false;
    try {
        if(expected!==undefined){
            await db.beginTransaction();open=true;
            const rows=await db.query('SELECT * FROM PlantCareSettings WITH (UPDLOCK,HOLDLOCK) WHERE PlantID=?',[settings.plantID]);
            const row=rows[0];
            const baseline=row?{threshold:String(row.SoilMoistureThreshold),auto:row.AutomaticWateringEnabled,
                duration:String(row.WateringDurationSeconds),fanAuto:row.FanAutomaticEnabled,
                fanStart:String(row.FanStartTemperature),fanStop:String(row.FanStopTemperature)}:null;
            if(!baseline||!expected||typeof expected!=='object'||!Object.keys(baseline).every(k=>baseline[k]===expected[k])){
                await db.rollback();open=false;return false;
            }
        }
        await db.query(`UPDATE PlantCareSettings SET SoilMoistureThreshold=?,AutomaticWateringEnabled=?,WateringDurationSeconds=?,
            FanAutomaticEnabled=?,FanStartTemperature=?,FanStopTemperature=?,UpdatedAt=SYSUTCDATETIME() WHERE PlantID=?`,
            [settings.soilMoistureThreshold,settings.automaticWateringEnabled,settings.wateringDurationSeconds,
             settings.fanAutomaticEnabled,settings.fanStartTemperature,settings.fanStopTemperature,settings.plantID]);
        if(open){await db.commit();open=false;}
        return true;
    }catch(err){if(open)await db.rollback();throw err;}finally{await db.close();}
}

// 10. Dispozitivele unui utilizator
async function getUserDevices(userID) {
    const db = await connectDatabase();
    try {
        return await db.query(
            'SELECT DeviceID, UserID, DeviceName, DeviceCode, LastSeenAt, IsActive, CreatedAt FROM EspDevices WHERE UserID = ?',
            [userID]
        );
    } finally {
        await db.close();
    }
}

// 11. Adăugare dispozitiv
async function addDevice(device) {
    const db = await connectDatabase();
    const deviceKey = crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(deviceKey).digest('hex');
    try {
        const result = await db.query(
            `INSERT INTO EspDevices
             (UserID, DeviceName, DeviceCode, DeviceKeyHash, IsActive, CreatedAt)
             OUTPUT INSERTED.DeviceID
             VALUES (?, ?, ?, ?, 1, SYSUTCDATETIME())`,
            [device.userID, device.deviceName, device.deviceCode, keyHash]
        );
        return { deviceID: result[0].DeviceID, deviceKey };
    } finally {
        await db.close();
    }
}

async function rotateDeviceKey(deviceID, userID) {
    const connection = await connectDatabase();
    const deviceKey = crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(deviceKey).digest('hex');
    try {
        const rows = await connection.query(
            'UPDATE EspDevices SET DeviceKeyHash=? OUTPUT INSERTED.DeviceID WHERE DeviceID=? AND UserID=?',
            [keyHash, deviceID, userID]
        );
        return rows.length ? { deviceID, deviceKey } : null;
    } finally { await connection.close(); }
}

// Atomic acknowledgement ensures a completed watering is recorded only once.
async function acknowledgeDeviceCommand(deviceID, commandID, status, actualSeconds) {
    const connection = await connectDatabase();
    let open = false;
    try {
        await connection.beginTransaction();
        open = true;
        await connection.query('SELECT DeviceID FROM EspDevices WITH (UPDLOCK,HOLDLOCK) WHERE DeviceID=?',[deviceID]);
        const existing=await connection.query('SELECT Status,DurationSeconds FROM DeviceCommands WITH (UPDLOCK,HOLDLOCK) WHERE CommandID=? AND DeviceID=?',[commandID,deviceID]);
        if (!existing.length || (status==='Completed' && actualSeconds>existing[0].DurationSeconds)) {
            await connection.rollback();open=false;return false;
        }
        if(existing[0].Status===status){await connection.commit();open=false;return true;}
        const updated = await connection.query(`UPDATE DeviceCommands
            SET Status=?, ExecutedAt=SYSUTCDATETIME()
            OUTPUT INSERTED.CommandID, INSERTED.CommandType, INSERTED.DurationSeconds
            WHERE CommandID=? AND DeviceID=? AND Status='Processing'`,
            [status, commandID, deviceID]);
        if (!updated.length) { await connection.rollback(); open = false; return false; }
        if (status === 'Completed' && updated[0].CommandType === 'Water') {
            const plants = await connection.query('SELECT TOP 1 PlantID FROM UserPlants WHERE DeviceID=?', [deviceID]);
            if (!plants.length) throw new Error('Device not associated with a plant');
            await connection.query(`INSERT INTO WateringHistory
              (PlantID, DeviceID, StartedAt, DurationSeconds, IsAutomatic, Status, Notes)
              VALUES (?, ?, SYSUTCDATETIME(), ?, 0, 'Completed', 'Confirmed by device')`,
              [plants[0].PlantID, deviceID, actualSeconds]);
        }
        await connection.commit();
        open = false;
        return true;
    } catch (err) {
        if (open) { try { await connection.rollback(); } catch (e) { console.error('Device ack rollback failed', e); } }
        throw err;
    } finally { await connection.close(); }
}

// 12. Actualizare ultima conectare a dispozitivului
async function updateDeviceLastSeen(deviceID) {
    const db = await connectDatabase();
    try {
        await db.query(
            `UPDATE EspDevices
             SET LastSeenAt = SYSUTCDATETIME()
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
             VALUES (?, ?, ?, SYSUTCDATETIME(), ?, ?)`,
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
             SET Status = ?, ExecutedAt = SYSUTCDATETIME()
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
             VALUES (?, ?, SYSUTCDATETIME(), ?, ?, ?, ?)`,
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
             VALUES (?, ?, ?, ?, ?, SYSUTCDATETIME(), 0)`,
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
             VALUES (?, ?, ?, SYSUTCDATETIME())`,
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
             VALUES (?, ?, SYSUTCDATETIME(), ?, ?, ?, ?, NULL)`,
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
             VALUES (?, ?, SYSUTCDATETIME(), ?)`,
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


// 30. Exportarea funcțiilor
async function query(sql, params = []) {
    const connection = await connectDatabase();
    try { return await connection.query(sql, params); }
    finally { await connection.close(); }
}
module.exports = {
    query,
    connectDatabase,
    getPlantCatalog,
    getDiseaseCatalog,
    getUserPlants,
    addUserPlant,
    deleteUserPlant,
    saveSensorMeasurement,
    getSensorMeasurements,
    getPlantCareSettings,
    updatePlantCareSettings,
    getUserDevices,
    addDevice,
    rotateDeviceKey,
    acknowledgeDeviceCommand,
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
    createUser
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
        // Prefer the adult account when kids accounts share the email.
        return result.find(r => r.IsKid !== true && r.IsKid !== 1) || result[0] || null;
    } finally {
        await db.close();
    }
}

// New registrations do not create non-actionable alerts.
// Înregistrare utilizator
async function createUser(user) {
    const db = await connectDatabase();
    let open = false;

    try {
        await db.beginTransaction(); open = true;
        const result = await db.query(
            `INSERT INTO Users
             (Username, Email, PasswordHash, IsAdmin, IsActive, CreatedAt)
             OUTPUT INSERTED.UserID
             VALUES (?, ?, ?, 0, 1, SYSUTCDATETIME())`,
            [user.username, user.email, user.passwordHash]
        );
        const userID = result[0].UserID;
        await db.commit(); open = false;
        return userID;
    } catch (e) {
        if (open) await db.rollback();
        throw e;
    } finally {
        await db.close();
    }
}

// Registration and hardware claim share one SQL transaction. Locks ensure a token
// cannot be reused by concurrent requests, even across multiple API processes.
async function createUserWithProvisionedDevice(user, deviceCode) {
  const c=await connectDatabase(); let open=false;
  try {
    await c.beginTransaction();open=true;
    const rows=await c.query(`SELECT DeviceCode,DeviceKeyHash,ClaimedByUserID FROM RootDeviceProvisioning WITH (UPDLOCK,HOLDLOCK) WHERE DeviceCode=?`,[deviceCode]);
    const device=rows[0];
    if(!device || device.ClaimedByUserID!=null || !/^[a-f0-9]{64}$/i.test(device.DeviceKeyHash || '')) {
      const e=new Error('Device already claimed or pairing expired.');e.status=409;throw e;
    }
    const result=await c.query(`INSERT INTO Users (Username,Email,PasswordHash,IsAdmin,IsActive,CreatedAt) OUTPUT INSERTED.UserID VALUES (?,?,?,0,1,SYSUTCDATETIME())`,[user.username,user.email,user.passwordHash]);
    const id=result[0].UserID;
    await c.query(`INSERT INTO EspDevices (UserID,DeviceName,DeviceCode,DeviceKeyHash,IsActive,CreatedAt) VALUES (?,?,?,?,1,SYSUTCDATETIME())`,[id,'My Root.esp',deviceCode,device.DeviceKeyHash]);
    await c.query(`UPDATE RootDeviceProvisioning SET ClaimedByUserID=?,ClaimedAt=SYSUTCDATETIME() WHERE DeviceCode=?`,[id,deviceCode]);
    await c.query(`INSERT INTO UserNotifications (UserID,PlantID,NotificationType,Title,Message,CreatedAt,IsRead) VALUES (?,NULL,'Welcome','Thank you for being here','Thank you for being here. Welcome to Root.esp.',SYSUTCDATETIME(),0)`,[id]);
    await c.commit();open=false;return id;
  }catch(e){if(open)await c.rollback();throw e;}finally{await c.close();}
}
module.exports.createUserWithProvisionedDevice=createUserWithProvisionedDevice;

// Re-read account state for every authenticated request. JWT role claims can become stale.
// Kids-account columns exist only after migrate-kids-accounts.sql; older databases still work.
const missingColumn = e => /invalid column name/i.test(String(e && (e.message || e.odbcErrors?.[0]?.message || '')));
async function getUserById(userID) {
    const db = await connectDatabase();
    try {
        try {
            const rows = await db.query('SELECT UserID, IsActive, IsAdmin, IsKid, ParentUserID, DisplayName, Email FROM Users WHERE UserID = ?', [userID]);
            return rows[0] || null;
        } catch (e) {
            if (!missingColumn(e)) throw e;
            const rows = await db.query('SELECT UserID, IsActive, IsAdmin, Email FROM Users WHERE UserID = ?', [userID]);
            return rows[0] ? { ...rows[0], IsKid: false, ParentUserID: null, DisplayName: null } : null;
        }
    } finally {
        await db.close();
    }
}

// Every account using this email: the adult account and any kids accounts. The password picks one.
async function getUsersByEmail(email) {
    const db = await connectDatabase();
    try {
        try {
            return await db.query('SELECT UserID, Username, Email, PasswordHash, IsAdmin, IsActive, IsKid, ParentUserID, DisplayName FROM Users WHERE Email = ? ORDER BY IsKid, UserID', [email]);
        } catch (e) {
            if (!missingColumn(e)) throw e;
            const rows = await db.query('SELECT UserID, Username, Email, PasswordHash, IsAdmin, IsActive FROM Users WHERE Email = ?', [email]);
            return rows.map(r => ({ ...r, IsKid: false, ParentUserID: null, DisplayName: null }));
        }
    } finally {
        await db.close();
    }
}
module.exports.getUsersByEmail = getUsersByEmail;

async function createKidUser(kid) {
    const db = await connectDatabase();
    try {
        const rows = await db.query(
            `INSERT INTO Users (Username, Email, PasswordHash, IsAdmin, IsActive, CreatedAt, IsKid, ParentUserID, DisplayName)
             OUTPUT INSERTED.UserID VALUES (?, ?, ?, 0, 1, SYSUTCDATETIME(), 1, ?, ?)`,
            [kid.username, kid.email, kid.passwordHash, kid.parentUserID, kid.displayName]);
        return rows[0].UserID;
    } finally {
        await db.close();
    }
}
module.exports.createKidUser = createKidUser;
module.exports.getUserById = getUserById;

async function enqueueWaterCommand(c) {
 const connection=await connectDatabase(); let open=false;
 try {
  await connection.beginTransaction(); open=true;
  await connection.query('SELECT DeviceID FROM EspDevices WITH (UPDLOCK,HOLDLOCK) WHERE DeviceID=?',[c.deviceID]);
  await connection.query("UPDATE DeviceCommands SET Status='Failed',ExecutedAt=SYSUTCDATETIME() WHERE DeviceID=? AND Status='Pending' AND CreatedAt<DATEADD(MINUTE,-5,SYSUTCDATETIME())",[c.deviceID]);
  const active=await connection.query("SELECT CommandID FROM DeviceCommands WITH (UPDLOCK,HOLDLOCK) WHERE DeviceID=? AND Status IN ('Pending','Processing')",[c.deviceID]);
  if(active.length){await connection.rollback();open=false;return null;}
  const rows=await connection.query("INSERT INTO DeviceCommands (DeviceID,CommandType,Status,CreatedAt,DurationSeconds,RequestedByUserID) OUTPUT INSERTED.CommandID VALUES (?,'Water','Pending',SYSUTCDATETIME(),?,?)",[c.deviceID,c.durationSeconds,c.requestedByUserID]);
  await connection.commit();open=false;return rows[0].CommandID;
 }catch(e){if(open)await connection.rollback();throw e;}finally{await connection.close();}
}
module.exports.enqueueWaterCommand=enqueueWaterCommand;

async function generateDeviceAlerts(deviceID) {
 const connection=await connectDatabase();let open=false;
 try {
  await connection.beginTransaction();open=true;
  await connection.query('SELECT DeviceID FROM EspDevices WITH (UPDLOCK,HOLDLOCK) WHERE DeviceID=?',[deviceID]);
  await connection.query(`INSERT INTO UserNotifications (UserID,PlantID,NotificationType,Title,Message,CreatedAt,IsRead)
   SELECT p.UserID,p.PlantID,'DrySoil','Check soil moisture','Soil moisture is below your saved threshold.',SYSUTCDATETIME(),0
   FROM UserPlants p JOIN PlantCareSettings s ON s.PlantID=p.PlantID
   CROSS APPLY (SELECT TOP 1 SoilMoisture,MeasuredAt FROM SensorMeasurements WHERE PlantID=p.PlantID ORDER BY MeasuredAt DESC) m
   WHERE p.DeviceID=? AND m.MeasuredAt>DATEADD(MINUTE,-5,SYSUTCDATETIME()) AND m.SoilMoisture<s.SoilMoistureThreshold
   AND NOT EXISTS (SELECT 1 FROM UserNotifications n WHERE n.PlantID=p.PlantID AND n.NotificationType='DrySoil' AND n.CreatedAt>DATEADD(HOUR,-6,SYSUTCDATETIME()))`,[deviceID]);
  await connection.commit();open=false;
 }catch(e){if(open)await connection.rollback();throw e;}finally{await connection.close();}
}
module.exports.generateDeviceAlerts=generateDeviceAlerts;
async function generateOfflineAlerts(userID) {
 const c=await connectDatabase();let open=false;
 try {
 await c.beginTransaction();open=true;
 await c.query('SELECT UserID FROM Users WITH (UPDLOCK,HOLDLOCK) WHERE UserID=?',[userID]);
 await c.query(`INSERT INTO UserNotifications (UserID,PlantID,NotificationType,Title,Message,CreatedAt,IsRead)
 SELECT p.UserID,p.PlantID,'Offline','Device offline','No device contact in the last five minutes.',SYSUTCDATETIME(),0
 FROM UserPlants p JOIN EspDevices d ON d.DeviceID=p.DeviceID
 WHERE p.UserID=? AND d.IsActive=1 AND d.LastSeenAt<DATEADD(MINUTE,-5,SYSUTCDATETIME())
 AND NOT EXISTS (SELECT 1 FROM UserNotifications n WHERE n.PlantID=p.PlantID AND n.NotificationType='Offline' AND n.CreatedAt>DATEADD(HOUR,-6,SYSUTCDATETIME()))`,[userID]);
 await c.commit();open=false;
 }catch(e){if(open)await c.rollback();throw e;}finally{await c.close();}
}
module.exports.generateOfflineAlerts=generateOfflineAlerts;
