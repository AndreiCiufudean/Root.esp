// Data layer. Screens only talk to this file.
// USE_MOCK = true  -> in-memory data from mock.js (same shape as the SQL tables)
// USE_MOCK = false -> real backend at BASE_URL (see README for the endpoints)
import { db } from './mock';
import { validateSettings, percentage } from './logic';
import { demoReply } from './assistant';

export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api'; // use PC LAN IP on a physical phone

const wait = (ms = 150) => new Promise((r) => setTimeout(r, ms));
const clone = (x) => JSON.parse(JSON.stringify(x));
const nextId = (rows, key) => rows.reduce((m, r) => Math.max(m, r[key]), 0) + 1;

// ---- Demo database persistence (mock mode): the app registers a callback that saves after each change ----
let persistHook = () => {};
export const setPersist = (fn) => { persistHook = typeof fn === 'function' ? fn : () => {}; };
const persist = () => { try { persistHook(); } catch (e) { /* storage is best effort */ } };
const SAVED_TABLES = ['Users', 'PlantCatalog', 'EspDevices', 'UserPlants', 'PlantCareSettings', 'UserNotifications', 'WateringHistory', 'PlantCareActivities', 'PlantDiseaseReports'];
export const exportMock = () => Object.fromEntries(SAVED_TABLES.map((t) => [t, db[t]]));
export const importMock = (saved) => {
  if (!saved || typeof saved !== 'object') return;
  const seedDevices = new Map(db.EspDevices.map((d) => [d.DeviceID, d.LastSeenAt]));
  const seedKids = db.Users.filter((u) => u.IsKid);
  SAVED_TABLES.forEach((t) => { if (Array.isArray(saved[t])) db[t] = saved[t]; });
  // Demo data saved by older versions has no kids account: add the seeded one when its id is still free.
  seedKids.forEach((k) => { if (!db.Users.some((u) => u.UserID === k.UserID) && db.Users.some((u) => u.UserID === k.ParentUserID)) db.Users.push(k); });
  // keep the seeded demo devices "recently seen" instead of stuck at an old timestamp
  db.EspDevices.forEach((d) => { if (seedDevices.has(d.DeviceID)) d.LastSeenAt = seedDevices.get(d.DeviceID); });
};
const safeUser = (u) => { const { Password, ...rest } = u; return clone(rest); };

let authToken = null;
export const getToken = () => authToken;
export const setToken = (t) => { authToken = t || null; };
async function http(method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
  const res = await fetch(`${BASE_URL}${path}`, {
    method, signal: controller.signal,
    headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
  return data;
  } finally { clearTimeout(timer); }
}

const DEFAULT_SETTINGS = {
  SoilMoistureThreshold: 30,
  AutomaticWateringEnabled: false,
  WateringDurationSeconds: 5,
  FanAutomaticEnabled: false,
  FanStartTemperature: 28,
  FanStopTemperature: 24,
};

const mock = {
  async generateDesign(){throw new Error('AI design is unavailable in demo mode.');},
  async requestManufacturing(){throw new Error('Manufacturing requests need a real backend.');},
  async getDesignRequests(){return [];},
  async login(email, password) {
    await wait();
    if (typeof email !== 'string' || typeof password !== 'string' || !email.includes('@')) throw new Error('Wrong email or password.');
    // A family shares one email: the adult account and each kids account have different passwords,
    // and the password decides which account opens (demo accounts: demopassword).
    const u = db.Users.find((x) => x.Email.toLowerCase() === email.trim().toLowerCase() && x.Password === password);
    if (!u) throw new Error('Wrong email or password.');
    if (!u.IsActive) throw new Error('This account is disabled.');
    if(!db.UserNotifications.some(n=>n.UserID===u.UserID&&n.NotificationType==='Welcome')){
      db.UserNotifications.push({NotificationID:nextId(db.UserNotifications,'NotificationID'),UserID:u.UserID,PlantID:null,NotificationType:'Welcome',Title:'Thank you for being here',Message:'Thank you for being here. Welcome to Root.esp.',CreatedAt:new Date().toISOString(),IsRead:false});persist();
    }
    return safeUser(u);
  },

  async pairDevice(deviceCode, deviceKey) {
    await wait();
    if(deviceCode !== 'ROOT-DEMO-01' || deviceKey !== 'DEMO-SETUP-KEY') throw new Error('Demo pairing: use ROOT-DEMO-01 / DEMO-SETUP-KEY (simulation only).');
    if(db.EspDevices.some(d=>d.DeviceCode===deviceCode)) throw new Error('Demo device already claimed.');
    return {pairingToken:'demo-pairing-token',deviceCode,verified:true,simulated:true};
  },
  async register(username, email, password, pairingToken) {
    if(pairingToken!=='demo-pairing-token') throw new Error('Pair a demo device first.');
    if(db.EspDevices.some(d=>d.DeviceCode==='ROOT-DEMO-01')) throw new Error('Demo device already claimed.');
    await wait();
    if (typeof username !== 'string' || !username.trim()) throw new Error('Enter a username.');
    if (typeof email !== 'string' || typeof password !== 'string' || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || unescape(encodeURIComponent(password)).length > 72) throw new Error('Enter a valid email and a password of at least 8 characters.');
    if (db.Users.some((u) => u.Username.toLowerCase() === username.toLowerCase())) throw new Error('Username already taken.');
    if (db.Users.some((u) => !u.ParentUserID && u.Email.toLowerCase() === email.toLowerCase())) throw new Error('Email already registered.');
    const u = { UserID: nextId(db.Users, 'UserID'), Username: username.trim(), Email: email.trim(), Password: password, IsAdmin: false, IsActive: true, IsKid: false, ParentUserID: null };
    db.Users.push(u);
    db.EspDevices.push({DeviceID:nextId(db.EspDevices,'DeviceID'),UserID:u.UserID,DeviceName:'Demo Root.esp',DeviceCode:'ROOT-DEMO-01',IsActive:true,LastSeenAt:null});
    db.UserNotifications.push({NotificationID:nextId(db.UserNotifications,'NotificationID'),UserID:u.UserID,PlantID:null,NotificationType:'Welcome',Title:'Thank you for being here',Message:'Thank you for being here. Welcome to Root.esp.',CreatedAt:new Date().toISOString(),IsRead:false});
    persist();
    return safeUser(u);
  },

  // ---- Kids accounts: same email as the parent, a different password, and the child's name ----
  async createKidAccount(parentId, { name, password }) {
    await wait();
    const parent = db.Users.find((u) => u.UserID === parentId && !u.IsKid);
    if (!parent) throw new Error('Only an adult account can create a kids account.');
    const kidName = typeof name === 'string' ? name.trim() : '';
    if (!kidName || kidName.length > 30) throw new Error('Enter your child\'s name (up to 30 characters).');
    if (typeof password !== 'string' || password.length < 6 || unescape(encodeURIComponent(password)).length > 72) throw new Error('Use a kids password of at least 6 characters.');
    const family = db.Users.filter((u) => u.Email.toLowerCase() === parent.Email.toLowerCase());
    if (family.some((u) => u.Password === password)) throw new Error('This password is already used by an account with this email. Choose a different password so Root.esp knows which account to open.');
    if (family.some((u) => u.IsKid && u.DisplayName?.toLowerCase() === kidName.toLowerCase())) throw new Error('A kids account with this name already exists.');
    const kid = { UserID: nextId(db.Users, 'UserID'), Username: `${parent.Username}·${kidName}`.slice(0, 50), DisplayName: kidName, Email: parent.Email, Password: password, IsAdmin: false, IsActive: true, IsKid: true, ParentUserID: parent.UserID };
    db.Users.push(kid);
    db.UserNotifications.push({NotificationID:nextId(db.UserNotifications,'NotificationID'),UserID:kid.UserID,PlantID:null,NotificationType:'Welcome',Title:`Hi ${kidName}!`,Message:'Your plant buddies are waiting for you.',CreatedAt:new Date().toISOString(),IsRead:false});
    persist();
    return safeUser(kid);
  },
  async getKidAccounts(parentId) {
    await wait(80);
    return db.Users.filter((u) => u.IsKid && u.ParentUserID === parentId).map(safeUser);
  },
  // A signed-in parent opens one of their own kids accounts with a single tap (no kids password needed).
  async openKidSession(parentId, kidId) {
    await wait(80);
    const parent = db.Users.find((u) => u.UserID === parentId && !u.IsKid);
    if (!parent) throw new Error('Only a grown-up account can open a kids account.');
    const kid = db.Users.find((u) => u.UserID === kidId && u.IsKid && u.ParentUserID === parentId);
    if (!kid) throw new Error('This kids account does not belong to you.');
    if (!kid.IsActive) throw new Error('This kids account is disabled.');
    return safeUser(kid);
  },
  // Kids see the household's plants (their parent's), read-only.
  async getHouseholdPlants(user) {
    return mock.getPlants(user.IsKid ? user.ParentUserID : user.UserID);
  },
  async assistantChat(userId, messages) {
    await wait(700);
    const last = [...(messages || [])].reverse().find((m) => m.role === 'user');
    const plants = await mock.getPlants(userId);
    return { reply: demoReply(last?.content || '', plants), demo: true };
  },

  async getPlants(userId) {
    await wait();
    return clone(
      db.UserPlants.filter((p) => p.UserID === userId).map((p) => ({
        ...p,
        species: db.PlantCatalog.find((s) => s.SpeciesID === p.SpeciesID) || null,
        device: db.EspDevices.find((d) => d.DeviceID === p.DeviceID) || null,
        settings: db.PlantCareSettings.find((s) => s.PlantID === p.PlantID) || null,
        latest: db.latest[p.PlantID] || null,
      }))
    );
  },

  async getPlantDetail(plantId) {
    await wait();
    const p = db.UserPlants.find((x) => x.PlantID === plantId);
    if (!p) throw new Error('Plant not found.');
    const speciesDiseases = db.PlantSpeciesDiseases.filter((x) => x.SpeciesID === p.SpeciesID).map((x) => x.DiseaseID);
    return clone({
      ...p,
      species: db.PlantCatalog.find((s) => s.SpeciesID === p.SpeciesID) || null,
      device: db.EspDevices.find((d) => d.DeviceID === p.DeviceID) || null,
      settings: db.PlantCareSettings.find((s) => s.PlantID === plantId),
      latest: db.latest[plantId] || null,
      history: db.SensorMeasurements.filter((m) => m.PlantID === plantId).slice(-24),
      watering: db.WateringHistory.filter((w) => w.PlantID === plantId).sort((a, b) => b.StartedAt.localeCompare(a.StartedAt)).slice(0, 5),
      activities: db.PlantCareActivities.filter((a) => a.PlantID === plantId),
      reports: db.PlantDiseaseReports.filter((r) => r.PlantID === plantId).map((r) => ({
        ...r, disease: db.DiseaseCatalog.find((d) => d.DiseaseID === r.DiseaseID) || null,
      })),
      possibleDiseases: db.DiseaseCatalog.filter((d) => speciesDiseases.includes(d.DiseaseID)),
    });
  },

  async saveSettings(plantId, s) {
    await wait();
    const err = validateSettings(s);
    if (err) throw new Error(err);
    const row = db.PlantCareSettings.find((x) => x.PlantID === plantId);
    if (!row) throw new Error('Plant settings not found.');
    Object.assign(row, s, { UpdatedAt: new Date().toISOString() });
    persist();
    return clone(row);
  },

  // Real backend: insert a row in DeviceCommands (see db/fixes.sql); the ESP32 picks it up on its next poll.
  async waterNow(plantId) {
    await wait(300);
    const p = db.UserPlants.find((x) => x.PlantID === plantId);
    if (!p) throw new Error('Plant not found.');
    if (!p.DeviceID) throw new Error('Link a device to this plant first.');
    const s = db.PlantCareSettings.find((x) => x.PlantID === plantId);
    // Demo only. Never fabricate a completed physical watering or change sensor readings.
    return { seconds: s.WateringDurationSeconds, status: 'Simulated' };
  },

  // Link, replace (or unlink with null) the device of an existing plant.
  async linkDevice(plantId, deviceId) {
    await wait();
    const p = db.UserPlants.find((x) => x.PlantID === plantId);
    if (!p) throw new Error('Plant not found.');
    if (deviceId == null) { p.DeviceID = null; persist(); return { PlantID: plantId, DeviceID: null }; }
    const d = db.EspDevices.find((x) => x.DeviceID === deviceId && x.UserID === p.UserID);
    if (!d || !d.IsActive) throw new Error('That device does not belong to you or is inactive.');
    if (db.UserPlants.some((x) => x.DeviceID === deviceId && x.PlantID !== plantId)) throw new Error('That device is already linked to another plant. Unlink it there first.');
    p.DeviceID = deviceId;
    persist();
    return { PlantID: plantId, DeviceID: deviceId };
  },

  // Deletes the plant and everything stored about it. The registered device is kept (it simply becomes free)
  // and nothing here ever sends a watering command.
  async deletePlant(plantId, userId) {
    await wait();
    const p = db.UserPlants.find((x) => x.PlantID === plantId);
    if (!p || (userId != null && p.UserID !== userId)) throw new Error('Plant not found.');
    db.UserPlants = db.UserPlants.filter((x) => x.PlantID !== plantId);
    db.PlantCareSettings = db.PlantCareSettings.filter((x) => x.PlantID !== plantId);
    db.WateringHistory = db.WateringHistory.filter((x) => x.PlantID !== plantId);
    db.PlantCareActivities = db.PlantCareActivities.filter((x) => x.PlantID !== plantId);
    db.PlantDiseaseReports = db.PlantDiseaseReports.filter((x) => x.PlantID !== plantId);
    db.SensorMeasurements = db.SensorMeasurements.filter((x) => x.PlantID !== plantId);
    db.UserNotifications = db.UserNotifications.filter((x) => x.PlantID !== plantId);
    delete db.latest[plantId];
    persist();
    return { ok: true, PlantID: plantId };
  },

  async getCommands() { return []; },
  async reconcileCommand() { throw new Error('Available only with real backend.'); },
  async getCatalog() {
    await wait();
    return clone({ species: db.PlantCatalog, diseases: db.DiseaseCatalog });
  },

  async addPlant(userId, f) {
    await wait();
    if (typeof f.PlantName !== 'string' || !f.PlantName.trim()) throw new Error('Enter a plant name.');
    if (f.DeviceID && db.UserPlants.some((p) => p.DeviceID === f.DeviceID)) throw new Error('That device is already linked to another plant.');
    if (f.DeviceID && !db.EspDevices.some((d) => d.DeviceID === f.DeviceID && d.UserID === userId)) throw new Error('That device does not belong to you.');
    let speciesId = f.SpeciesID || null;
    if (f.CustomSpecies) {
      // user-defined plant type, stored in the catalog next to the built-in ones
      const c = f.CustomSpecies;
      if (typeof c.CommonName !== 'string' || !c.CommonName.trim()) throw new Error('Enter a name for your plant type.');
      const min = c.MinSoilMoisture ?? 30, max = c.MaxSoilMoisture ?? 65;
      if (!(min >= 0 && max <= 100 && min < max)) throw new Error('Ideal soil moisture must be between 0 and 100, with min below max.');
      const sp = {
        SpeciesID: nextId(db.PlantCatalog, 'SpeciesID'), CommonName: c.CommonName.trim(), Emoji: c.Emoji || null, ScientificName: c.ScientificName?.trim() || null,
        Category: c.Category || 'Other', Description: 'Custom plant type.', MinSoilMoisture: min, MaxSoilMoisture: max,
        MinTemperature: c.MinTemperature ?? 15, MaxTemperature: c.MaxTemperature ?? 28, LightRequirements: c.LightRequirements?.trim() || 'Not set',
        WateringAdvice: c.WateringAdvice?.trim() || 'Water when the soil is dry to the touch.', CareInstructions: c.CareInstructions?.trim() || 'Custom plant type, no care notes yet.',
        CreatedByUserID: userId,
      };
      db.PlantCatalog.push(sp);
      speciesId = sp.SpeciesID;
    }
    const plant = {
      PlantID: nextId(db.UserPlants, 'PlantID'), UserID: userId, SpeciesID: speciesId, DeviceID: f.DeviceID || null,
      PlantName: f.PlantName.trim(), Location: f.Location?.trim() || null, PlantedAt: null, Notes: null,
    };
    db.UserPlants.push(plant);
    const sp = db.PlantCatalog.find((s) => s.SpeciesID === plant.SpeciesID);
    db.PlantCareSettings.push({
      PlantID: plant.PlantID, ...DEFAULT_SETTINGS,
      SoilMoistureThreshold: sp?.MinSoilMoisture != null ? Math.min(sp.MinSoilMoisture, 30) : 30,
    });
    persist();
    return clone(plant);
  },

  async getDevices(userId) {
    await wait();
    return clone(db.EspDevices.filter((d) => d.UserID === userId).map((d) => ({
      ...d, plant: db.UserPlants.find((p) => p.DeviceID === d.DeviceID)?.PlantName || null,
    })));
  },

  async addDevice(userId, name, code) {
    await wait();
    if (!name.trim() || !code.trim()) throw new Error('Enter a device name and its code.');
    if (db.EspDevices.some((d) => d.DeviceCode.toLowerCase() === code.trim().toLowerCase())) throw new Error('This device code is already registered.');
    const d = { DeviceID: nextId(db.EspDevices, 'DeviceID'), UserID: userId, DeviceName: name.trim(), DeviceCode: code.trim(), LastSeenAt: null, IsActive: true };
    db.EspDevices.push(d);
    persist();
    return clone(d);
  },

  async rotateDeviceKey(userId, deviceId) {
    throw new Error('Device keys are available only with a configured real backend.');
  },

  async getNotifications(userId) {
    await wait(80);
    return clone(db.UserNotifications.filter((n) => n.UserID === userId).sort((a, b) => b.CreatedAt.localeCompare(a.CreatedAt)));
  },

  async markRead(id) {
    const n = db.UserNotifications.find((x) => x.NotificationID === id);
    if (n) n.IsRead = true;
    persist();
  },

  async markAllRead(userId) {
    db.UserNotifications.filter((n) => n.UserID === userId).forEach((n) => { n.IsRead = true; });
    persist();
  },

  async getUsers() {
    await wait();
    return db.Users.map(safeUser);
  },

  async setUserActive(userId, active) {
    await wait(80);
    const u = db.Users.find((x) => x.UserID === userId);
    if (u) u.IsActive = active;
    persist();
  },
};

// Real backend version: same function names, one endpoint each.
const real = {
  generateDesign: (payload) => http('POST','/design/generate',payload),
  requestManufacturing: (payload) => http('POST','/design/requests',payload),
  getDesignRequests: () => http('GET','/design/requests'),
  login: async (email, password) => { const response = await http('POST', '/auth/login', { email, password }); authToken = response.token; return response.user; },
  pairDevice: (deviceCode,deviceKey) => http('POST','/auth/pair-device',{deviceCode,deviceKey}),
  register: async (username, email, password,pairingToken) => { await http('POST', '/auth/register', { username, email, password,pairingToken }); return real.login(email, password); },
  getPlants: (userId) => http('GET', `/users/${userId}/plants`),
  createKidAccount: (parentId, kid) => http('POST', `/users/${parentId}/kids`, kid),
  getKidAccounts: (parentId) => http('GET', `/users/${parentId}/kids`),
  openKidSession: async (parentId, kidId) => { const response = await http('POST', `/users/${parentId}/kids/${kidId}/session`); authToken = response.token; return response.user; },
  getHouseholdPlants: () => http('GET', '/household/plants'),
  assistantChat: (userId, messages) => http('POST', '/assistant/chat', { messages }),
  getPlantDetail: (plantId) => http('GET', `/plants/${plantId}`),
  saveSettings: (plantId, s) => http('PUT', `/plants/${plantId}/settings`, s),
  waterNow: (plantId) => http('POST', `/plants/${plantId}/water`),
  linkDevice: (plantId, deviceId) => http('PUT', `/plants/${plantId}/device`, { DeviceID: deviceId }),
  deletePlant: (plantId) => http('DELETE', `/plants/${plantId}`),
  getCommands: (id) => http('GET', `/plants/${id}/commands`),
  reconcileCommand: (id, cmd) => http('POST', `/plants/${id}/commands/${cmd}/reconcile`, {confirmedPumpOff:true}),
  getCatalog: () => http('GET', '/catalog'),
  addPlant: (userId, f) => http('POST', `/users/${userId}/plants`, f),
  getDevices: (userId) => http('GET', `/users/${userId}/devices`),
  addDevice: (userId, name, code) => http('POST', `/users/${userId}/devices`, { DeviceName: name, DeviceCode: code }),
  rotateDeviceKey: (userId, deviceId) => http('POST', `/users/${userId}/devices/${deviceId}/rotate-key`),
  getNotifications: (userId) => http('GET', `/users/${userId}/notifications`),
  markRead: (id) => http('POST', `/notifications/${id}/read`),
  markAllRead: (userId) => http('POST', `/users/${userId}/notifications/read-all`),
  getUsers: () => http('GET', '/admin/users'),
  setUserActive: (userId, active) => http('PUT', `/admin/users/${userId}`, { IsActive: active }),
};

// ---- Slow-request tracking: the app shows a loading overlay if a request takes longer than SLOW_MS ----
export const SLOW_MS = 1200;
const busyListeners = new Set();
let slowCount = 0;
export const subscribeBusy = (fn) => { busyListeners.add(fn); return () => busyListeners.delete(fn); };
const notifyBusy = () => busyListeners.forEach((fn) => { try { fn(slowCount > 0); } catch (e) { /* listener error */ } });
const tracked = (impl) => new Proxy(impl, {
  get(target, key) {
    const value = target[key];
    if (typeof value !== 'function') return value;
    return (...args) => {
      let flagged = false;
      const timer = setTimeout(() => { flagged = true; slowCount++; notifyBusy(); }, SLOW_MS);
      const done = () => { clearTimeout(timer); if (flagged) { slowCount = Math.max(0, slowCount - 1); notifyBusy(); } };
      let result;
      try { result = value.apply(target, args); } catch (e) { done(); throw e; }
      return Promise.resolve(result).finally(done);
    };
  },
});

export const api = tracked(USE_MOCK ? mock : real);
export function clearSession() { authToken = null; }
