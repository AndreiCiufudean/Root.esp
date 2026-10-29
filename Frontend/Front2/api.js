// Data layer. Screens only talk to this file.
// USE_MOCK = true  -> in-memory data from mock.js (same shape as the SQL tables)
// USE_MOCK = false -> real backend at BASE_URL (see README for the endpoints)
import { db } from './mock';
import { validateSettings } from './logic';

export const USE_MOCK = true;
export const BASE_URL = 'http://192.168.0.10:3000/api'; // your PC's IP when testing on a phone

const wait = (ms = 150) => new Promise((r) => setTimeout(r, ms));
const clone = (x) => JSON.parse(JSON.stringify(x));
const nextId = (rows, key) => rows.reduce((m, r) => Math.max(m, r[key]), 0) + 1;

async function http(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
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
  async login(email, password) {
    await wait();
    if (!email.includes('@') || password.length < 6) throw new Error('Wrong email or password.');
    let u = db.Users.find((x) => x.Email.toLowerCase() === email.toLowerCase());
    if (!u) {
      // demo only: unknown emails become new regular users
      u = { UserID: nextId(db.Users, 'UserID'), Username: email.split('@')[0], Email: email, IsAdmin: false, IsActive: true };
      db.Users.push(u);
    }
    if (!u.IsActive) throw new Error('This account is disabled.');
    return clone(u);
  },

  async register(username, email, password) {
    await wait();
    if (!username.trim()) throw new Error('Enter a username.');
    if (!email.includes('@') || password.length < 6) throw new Error('Enter a valid email and a password of at least 6 characters.');
    if (db.Users.some((u) => u.Username.toLowerCase() === username.toLowerCase())) throw new Error('Username already taken.');
    if (db.Users.some((u) => u.Email.toLowerCase() === email.toLowerCase())) throw new Error('Email already registered.');
    const u = { UserID: nextId(db.Users, 'UserID'), Username: username.trim(), Email: email, IsAdmin: false, IsActive: true };
    db.Users.push(u);
    return clone(u);
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
    Object.assign(row, s, { UpdatedAt: new Date().toISOString() });
    return clone(row);
  },

  // Real backend: insert a row in DeviceCommands (see db/fixes.sql); the ESP32 picks it up on its next poll.
  async waterNow(plantId) {
    await wait(300);
    const p = db.UserPlants.find((x) => x.PlantID === plantId);
    if (!p.DeviceID) throw new Error('Link a device to this plant first.');
    const s = db.PlantCareSettings.find((x) => x.PlantID === plantId);
    db.WateringHistory.push({
      WateringID: nextId(db.WateringHistory, 'WateringID'), PlantID: plantId, DeviceID: p.DeviceID,
      StartedAt: new Date().toISOString(), DurationSeconds: s.WateringDurationSeconds,
      IsAutomatic: false, Status: 'Completed', Notes: 'Manual from app',
    });
    const l = db.latest[plantId];
    if (l) l.SoilMoisture = Math.min(100, l.SoilMoisture + 15);
    return { seconds: s.WateringDurationSeconds };
  },

  async getCatalog() {
    await wait();
    return clone({ species: db.PlantCatalog, diseases: db.DiseaseCatalog });
  },

  async addPlant(userId, f) {
    await wait();
    if (!f.PlantName.trim()) throw new Error('Enter a plant name.');
    if (f.DeviceID && db.UserPlants.some((p) => p.DeviceID === f.DeviceID)) throw new Error('That device is already linked to another plant.');
    const plant = {
      PlantID: nextId(db.UserPlants, 'PlantID'), UserID: userId, SpeciesID: f.SpeciesID || null, DeviceID: f.DeviceID || null,
      PlantName: f.PlantName.trim(), Location: f.Location?.trim() || null, PlantedAt: null, Notes: null,
    };
    db.UserPlants.push(plant);
    const sp = db.PlantCatalog.find((s) => s.SpeciesID === plant.SpeciesID);
    db.PlantCareSettings.push({
      PlantID: plant.PlantID, ...DEFAULT_SETTINGS,
      SoilMoistureThreshold: sp?.MinSoilMoisture != null ? Math.min(sp.MinSoilMoisture, 30) : 30,
    });
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
    return clone(d);
  },

  async getNotifications(userId) {
    await wait(80);
    return clone(db.UserNotifications.filter((n) => n.UserID === userId).sort((a, b) => b.CreatedAt.localeCompare(a.CreatedAt)));
  },

  async markRead(id) {
    const n = db.UserNotifications.find((x) => x.NotificationID === id);
    if (n) n.IsRead = true;
  },

  async markAllRead(userId) {
    db.UserNotifications.filter((n) => n.UserID === userId).forEach((n) => { n.IsRead = true; });
  },

  async getUsers() {
    await wait();
    return clone(db.Users);
  },

  async setUserActive(userId, active) {
    await wait(80);
    const u = db.Users.find((x) => x.UserID === userId);
    if (u) u.IsActive = active;
  },
};

// Real backend version: same function names, one endpoint each.
const real = {
  login: (email, password) => http('POST', '/auth/login', { email, password }),
  register: (username, email, password) => http('POST', '/auth/register', { username, email, password }),
  getPlants: (userId) => http('GET', `/users/${userId}/plants`),
  getPlantDetail: (plantId) => http('GET', `/plants/${plantId}`),
  saveSettings: (plantId, s) => http('PUT', `/plants/${plantId}/settings`, s),
  waterNow: (plantId) => http('POST', `/plants/${plantId}/water`),
  getCatalog: () => http('GET', '/catalog'),
  addPlant: (userId, f) => http('POST', `/users/${userId}/plants`, f),
  getDevices: (userId) => http('GET', `/users/${userId}/devices`),
  addDevice: (userId, name, code) => http('POST', `/users/${userId}/devices`, { DeviceName: name, DeviceCode: code }),
  getNotifications: (userId) => http('GET', `/users/${userId}/notifications`),
  markRead: (id) => http('POST', `/notifications/${id}/read`),
  markAllRead: (userId) => http('POST', `/users/${userId}/notifications/read-all`),
  getUsers: () => http('GET', '/admin/users'),
  setUserActive: (userId, active) => http('PUT', `/admin/users/${userId}`, { IsActive: active }),
};

export const api = USE_MOCK ? mock : real;
