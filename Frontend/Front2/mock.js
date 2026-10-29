// Mock data shaped exactly like the SQL Server tables (same table and column names).
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();

export const db = {
  Users: [
    { UserID: 1, Username: 'Admin', Email: 'admin@sera.app', IsAdmin: true, IsActive: true },
    { UserID: 2, Username: 'Ioana', Email: 'user@sera.app', IsAdmin: false, IsActive: true },
    { UserID: 3, Username: 'Dan', Email: 'dan@sera.app', IsAdmin: false, IsActive: true },
  ],

  PlantCatalog: [
    { SpeciesID: 1, CommonName: 'Tomato', ScientificName: 'Solanum lycopersicum', Category: 'Vegetable',
      Description: 'Warm-season fruiting plant.', MinSoilMoisture: 40, MaxSoilMoisture: 70, MinTemperature: 18, MaxTemperature: 27,
      LightRequirements: 'Full sun', WateringAdvice: 'Water deeply in the morning and keep leaves dry.', CareInstructions: 'Stake the stems and remove side shoots.' },
    { SpeciesID: 2, CommonName: 'Basil', ScientificName: 'Ocimum basilicum', Category: 'Herb',
      Description: 'Fast-growing aromatic herb.', MinSoilMoisture: 40, MaxSoilMoisture: 65, MinTemperature: 18, MaxTemperature: 28,
      LightRequirements: 'Full sun', WateringAdvice: 'Keep soil lightly moist, never soggy.', CareInstructions: 'Pinch off flower buds to keep leaves tender.' },
    { SpeciesID: 3, CommonName: 'Monstera', ScientificName: 'Monstera deliciosa', Category: 'Houseplant',
      Description: 'Tropical climber with split leaves.', MinSoilMoisture: 35, MaxSoilMoisture: 60, MinTemperature: 18, MaxTemperature: 28,
      LightRequirements: 'Bright, indirect', WateringAdvice: 'Let the top layer dry between waterings.', CareInstructions: 'Wipe leaves and give it a support pole.' },
    { SpeciesID: 4, CommonName: 'Snake plant', ScientificName: 'Dracaena trifasciata', Category: 'Houseplant',
      Description: 'Very hardy succulent-like plant.', MinSoilMoisture: 20, MaxSoilMoisture: 45, MinTemperature: 15, MaxTemperature: 30,
      LightRequirements: 'Low to bright', WateringAdvice: 'Water sparingly, rot is the main risk.', CareInstructions: 'Use a gritty, fast-draining mix.' },
  ],

  DiseaseCatalog: [
    { DiseaseID: 1, DiseaseName: 'Powdery mildew', Symptoms: 'White powder on leaves.', FavorableConditions: 'High humidity, poor airflow.', Prevention: 'Space plants, improve ventilation.', Treatment: 'Remove affected leaves, use a sulfur or potassium bicarbonate spray.' },
    { DiseaseID: 2, DiseaseName: 'Root rot', Symptoms: 'Yellow leaves, soft dark roots.', FavorableConditions: 'Soil that stays too wet.', Prevention: 'Use drainage holes and do not overwater.', Treatment: 'Repot in fresh soil and trim rotten roots.' },
    { DiseaseID: 3, DiseaseName: 'Gray mold', Symptoms: 'Gray fuzzy patches on leaves and fruit.', FavorableConditions: 'Cool, damp, still air.', Prevention: 'Water at the base, ventilate.', Treatment: 'Remove infected parts and reduce humidity.' },
  ],

  PlantSpeciesDiseases: [
    { SpeciesID: 1, DiseaseID: 1 }, { SpeciesID: 1, DiseaseID: 3 },
    { SpeciesID: 2, DiseaseID: 1 }, { SpeciesID: 3, DiseaseID: 2 }, { SpeciesID: 4, DiseaseID: 2 },
  ],

  EspDevices: [
    { DeviceID: 1, UserID: 2, DeviceName: 'Greenhouse A', DeviceCode: 'SERA-0001', LastSeenAt: ago(1), IsActive: true },
    { DeviceID: 2, UserID: 2, DeviceName: 'Balcony', DeviceCode: 'SERA-0002', LastSeenAt: ago(180), IsActive: true },
    { DeviceID: 3, UserID: 2, DeviceName: 'Spare board', DeviceCode: 'SERA-0003', LastSeenAt: null, IsActive: true },
    { DeviceID: 4, UserID: 1, DeviceName: 'Lab', DeviceCode: 'SERA-0100', LastSeenAt: ago(2), IsActive: true },
  ],

  UserPlants: [
    { PlantID: 1, UserID: 2, SpeciesID: 1, DeviceID: 1, PlantName: 'Tomatoes', Location: 'Greenhouse', PlantedAt: '2026-05-10', Notes: 'Cherry variety.' },
    { PlantID: 2, UserID: 2, SpeciesID: 2, DeviceID: 2, PlantName: 'Basil', Location: 'Balcony', PlantedAt: '2026-06-02', Notes: null },
    { PlantID: 3, UserID: 2, SpeciesID: 3, DeviceID: null, PlantName: 'Monstera', Location: 'Living room', PlantedAt: null, Notes: null },
    { PlantID: 4, UserID: 1, SpeciesID: 4, DeviceID: 4, PlantName: 'Test plant', Location: 'Lab', PlantedAt: null, Notes: null },
  ],

  PlantCareSettings: [
    { PlantID: 1, SoilMoistureThreshold: 30, AutomaticWateringEnabled: true, WateringDurationSeconds: 5, FanAutomaticEnabled: true, FanStartTemperature: 28, FanStopTemperature: 24 },
    { PlantID: 2, SoilMoistureThreshold: 30, AutomaticWateringEnabled: false, WateringDurationSeconds: 4, FanAutomaticEnabled: true, FanStartTemperature: 28, FanStopTemperature: 24 },
    { PlantID: 3, SoilMoistureThreshold: 30, AutomaticWateringEnabled: false, WateringDurationSeconds: 5, FanAutomaticEnabled: false, FanStartTemperature: 28, FanStopTemperature: 24 },
    { PlantID: 4, SoilMoistureThreshold: 30, AutomaticWateringEnabled: true, WateringDurationSeconds: 5, FanAutomaticEnabled: true, FanStartTemperature: 28, FanStopTemperature: 24 },
  ],

  // Newest reading per plant; history is generated below.
  latest: {
    1: { SoilMoisture: 52, AirTemperature: 24.5, AirHumidity: 61, LightLevel: 1400, FanStatus: false, MeasuredAt: ago(1) },
    2: { SoilMoisture: 24, AirTemperature: 30, AirHumidity: 48, LightLevel: 2600, FanStatus: true, MeasuredAt: ago(180) },
    4: { SoilMoisture: 78, AirTemperature: 22, AirHumidity: 55, LightLevel: 300, FanStatus: false, MeasuredAt: ago(2) },
  },
  SensorMeasurements: [],

  WateringHistory: [
    { WateringID: 1, PlantID: 1, DeviceID: 1, StartedAt: ago(300), DurationSeconds: 5, IsAutomatic: true, Status: 'Completed', Notes: null },
    { WateringID: 2, PlantID: 1, DeviceID: 1, StartedAt: ago(1700), DurationSeconds: 5, IsAutomatic: false, Status: 'Completed', Notes: 'Manual from app' },
    { WateringID: 3, PlantID: 2, DeviceID: 2, StartedAt: ago(2900), DurationSeconds: 4, IsAutomatic: false, Status: 'Completed', Notes: null },
  ],

  PlantCareActivities: [
    { ActivityID: 1, PlantID: 1, ActivityType: 'Fertilized', ActivityDate: ago(8000), Notes: 'Tomato fertilizer' },
    { ActivityID: 2, PlantID: 2, ActivityType: 'Pruned', ActivityDate: ago(5000), Notes: 'Pinched flower buds' },
  ],

  PlantDiseaseReports: [
    { ReportID: 1, PlantID: 2, DiseaseID: 1, ReportedAt: ago(1500), Status: 'Suspected', SymptomsObserved: 'White spots on a few leaves.', Notes: null, TreatmentApplied: null, ResolvedAt: null },
  ],

  UserNotifications: [
    { NotificationID: 1, UserID: 2, PlantID: 2, NotificationType: 'SoilDry', Title: 'Basil soil is dry', Message: 'Soil moisture dropped to 24%, below your 30% threshold.', CreatedAt: ago(185), IsRead: false },
    { NotificationID: 2, UserID: 2, PlantID: null, NotificationType: 'DeviceOffline', Title: 'Balcony is offline', Message: 'The device has not reported for 3 hours.', CreatedAt: ago(170), IsRead: false },
    { NotificationID: 3, UserID: 2, PlantID: 1, NotificationType: 'Watered', Title: 'Tomatoes watered', Message: 'Automatic watering ran for 5 seconds.', CreatedAt: ago(300), IsRead: true },
  ],
};

// Build 24 hourly readings per plant that end at the latest reading.
Object.entries(db.latest).forEach(([pid, last]) => {
  for (let i = 23; i >= 0; i--) {
    const wave = Math.sin(i / 3) * 6;
    db.SensorMeasurements.push({
      PlantID: Number(pid),
      SoilMoisture: Math.max(0, Math.min(100, Math.round(last.SoilMoisture + wave + i * 0.4))),
      AirTemperature: last.AirTemperature,
      AirHumidity: last.AirHumidity,
      LightLevel: last.LightLevel,
      FanStatus: last.FanStatus,
      MeasuredAt: new Date(new Date(last.MeasuredAt).getTime() - i * 3600000).toISOString(),
    });
  }
});

export const community = [
  { id: 'a', author: 'Ioana', text: 'My monstera finally grew a split leaf!' },
  { id: 'b', author: 'Dan', text: 'Any tips for basil indoors in winter?' },
  { id: 'c', author: 'Sara', text: 'Repotted my snake plant with extra perlite.' },
];
