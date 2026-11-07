// Opt-in, authenticated ESP32 endpoints. Never expose device credentials over plain HTTP.
const crypto = require('node:crypto');
const {sqlBoolean,sqlID,normalizeRows}=require('./db_types');
const { timingSafeEqual } = crypto;

const isEnabled = () => process.env.ENABLE_DEVICE_API === 'true';
const requireTLS = () => process.env.DEVICE_API_REQUIRE_HTTPS !== 'false';
const finiteOrNull = (v, min, max) => {
  if (v == null) return null;
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined;
};

module.exports = function mountDeviceRoutes(app, db) {
  app.use('/api/device', async (req, res, next) => {
    if (!isEnabled()) return res.status(503).json({error: 'Device API disabled.'});
    if (requireTLS() && !req.secure) return res.status(403).json({error: 'HTTPS required for device API.'});
    const deviceID = Number(req.headers['x-device-id']);
    const key = req.headers['x-device-key'];
    if (!Number.isInteger(deviceID) || deviceID <= 0 || typeof key !== 'string' || !/^[0-9a-f]{64}$/.test(key))
      return res.status(401).json({error: 'Invalid device credentials.'});
    try {
      const rows = await db.query('SELECT DeviceID, DeviceKeyHash, IsActive FROM EspDevices WHERE DeviceID=?', [deviceID]);
      const device = rows[0];
      if (!sqlBoolean(device?.IsActive) || !/^[0-9a-f]{64}$/.test(device.DeviceKeyHash || ''))
        return res.status(401).json({error: 'Invalid device credentials.'});
      const provided = crypto.createHash('sha256').update(key).digest();
      const stored = Buffer.from(device.DeviceKeyHash, 'hex');
      if (stored.length !== provided.length || !timingSafeEqual(provided, stored))
        return res.status(401).json({error: 'Invalid device credentials.'});
      req.deviceID = deviceID;
      next();
    } catch(err) { next(err); }
  });

  app.get('/api/device/config', async (req, res, next) => {
    try {
      const plants = await db.query('SELECT TOP 1 PlantID FROM UserPlants WHERE DeviceID=?', [req.deviceID]);
      const plantID = plants[0]?.PlantID ?? null;
      const settings=plantID ? normalizeRows(await db.getPlantCareSettings(plantID))[0] || null : null;
      res.json({plantID, linked: plantID !== null, settings, maxWaterDurationSeconds:1});
    } catch(err) { next(err); }
  });

  app.post('/api/device/telemetry', async (req, res, next) => {
    try {
      const b = req.body || {};
      const values = [
        finiteOrNull(b.SoilMoisture,0,100),finiteOrNull(b.AirTemperature,-50,100),
        finiteOrNull(b.AirHumidity,0,100),finiteOrNull(b.LightLevel,0,100)
      ];
      if (values.every(v => v == null) || values.some(v => v === undefined) || (b.FanStatus != null && typeof b.FanStatus !== 'boolean'))
        return res.status(400).json({error:'Invalid telemetry readings.'});
      const plants = await db.query('SELECT TOP 1 PlantID FROM UserPlants WHERE DeviceID=?', [req.deviceID]);
      await db.updateDeviceLastSeen(req.deviceID);
      if (!plants.length) return res.json({ok:true, recorded:false, reason:'No linked plant'});
      await db.saveSensorMeasurement({
        plantID:plants[0].PlantID, soilMoisture:values[0], airTemperature:values[1],
        airHumidity:values[2], lightLevel:values[3], fanStatus:b.FanStatus ?? null
      });
      // A successfully persisted sample stays accepted if optional alert work fails.
      let alertsGenerated=true;
      try{await db.generateDeviceAlerts(req.deviceID);}catch(err){alertsGenerated=false;console.error('Telemetry alert generation failed',err);}

      res.status(201).json({ok:true, recorded:true,alertsGenerated});
    } catch(err) { next(err); }
  });

  app.get('/api/device/commands/next', async (req, res, next) => {
    try {
      await db.updateDeviceLastSeen(req.deviceID);
      // Expire stale commands instead of watering hours later after a reconnect.
      await db.query(`UPDATE DeviceCommands SET Status='Failed', ExecutedAt=SYSUTCDATETIME()
        WHERE DeviceID=? AND Status='Pending' AND CreatedAt<DATEADD(MINUTE,-5,SYSUTCDATETIME())`,[req.deviceID]);
      const rows = await db.query(`WITH nextCmd AS (
          SELECT TOP (1) CommandID, CommandType, DurationSeconds, Status
          FROM DeviceCommands WITH (UPDLOCK, READPAST, ROWLOCK)
          WHERE DeviceID=? AND Status='Pending'
          ORDER BY CreatedAt ASC, CommandID ASC
        )
        UPDATE nextCmd SET Status='Processing'
        OUTPUT INSERTED.CommandID, INSERTED.CommandType, INSERTED.DurationSeconds`, [req.deviceID]);
      res.json({command:normalizeRows(rows)[0] || null});
    } catch(err) { next(err); }
  });

  app.get('/api/device/commands/:commandID/status',async(req,res,next)=>{
    try{
      const id=sqlID(req.params.commandID);
      if(!id)return res.status(400).json({error:'Invalid command ID.'});
      const rows=await db.query('SELECT CommandID,Status FROM DeviceCommands WHERE CommandID=? AND DeviceID=?',[id,req.deviceID]);
      if(!rows.length)return res.status(404).json({error:'Command not found.'});
      res.json(normalizeRows(rows)[0]);
    }catch(err){next(err);}
  });
  app.post('/api/device/commands/:commandID/ack', async (req, res, next) => {
    try {
      const id=sqlID(req.params.commandID), status=req.body?.status;
      const actualSeconds=req.body?.actualSeconds;
      if (!id || !['Completed','Failed'].includes(status) ||
          (status === 'Completed' && (!Number.isInteger(actualSeconds) || actualSeconds < 1 || actualSeconds > 60)))
        return res.status(400).json({error:'Invalid acknowledgement.'});
      if(status==='Completed') {
        const rows=await db.query('SELECT DurationSeconds FROM DeviceCommands WHERE CommandID=? AND DeviceID=?',[id,req.deviceID]);
        if(!rows.length || actualSeconds>rows[0].DurationSeconds) return res.status(400).json({error:'Duration exceeds requested command.'});
      }
      const ok=await db.acknowledgeDeviceCommand(req.deviceID,id,status,status==='Completed'?actualSeconds:null);
      if (!ok) return res.status(409).json({error:'Command not in processing state.'});
      res.json({ok:true});
    } catch(err) { next(err); }
  });
};
