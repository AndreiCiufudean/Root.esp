#include <Arduino.h>
#include <math.h>
#include <Preferences.h>
#include "SenzorDHT11.h"
#include "SenzorLumina.h"
#include "SenzorUmiditateSol.h"
#include "Mosfet.h"
#include "LEDURI.h"

// GPIO mapping from the original prototype. Check polarity and wiring on real hardware.
#define PIN_DHT11 16
#define PIN_LUMINA 34
#define PIN_SOL 33
#define PIN_POMPA 18
#define PIN_VENTILATOR 19
#define LED_R 25
#define LED_G 26
#define LED_B 27
#define LED_Y 14

SenzorLumina s_lumina(PIN_LUMINA);
SenzorUmiditateSol s_umiditate_sol(PIN_SOL);
SenzorDHT11 s_dht11(PIN_DHT11, DHT11);
Mosfet pompa(PIN_POMPA);
Mosfet ventilator(PIN_VENTILATOR);
LEDURI red(LED_R);
LEDURI green(LED_G);
LEDURI blue(LED_B);
LEDURI yellow(LED_Y);

// Conservative defaults: check sensor polarity, dry/wet ADC calibration, relay
// active level and electrical safety before enabling the physical pump.
const bool ENABLE_LOCAL_AUTOWATERING = false;
const unsigned long SENSOR_INTERVAL_MS = 2500UL; // DHT11 needs >= 2 sec between readings
const unsigned long WATER_COOLDOWN_MS = 30UL * 60UL * 1000UL;
const unsigned long MAX_WATER_DURATION_MS = 1000UL; // 1-second safety limit
const int SOIL_DRY_THRESHOLD = 30;
const int SOIL_TARGET = 45;
const int SOIL_TOO_WET = 70;
const float FAN_ON_TEMPERATURE = 28.0f;
const float FAN_OFF_TEMPERATURE = 24.0f;

unsigned long lastSampleMs = 0;
unsigned long lastWateringMs = 0;
bool hasWatered = false;
bool fanOn = false;
bool configuredAutoWater = true, configuredFanAuto = true;
float configuredSoilThreshold = SOIL_DRY_THRESHOLD;
int configuredDuration = 1;
float configuredFanStart = FAN_ON_TEMPERATURE, configuredFanStop = FAN_OFF_TEMPERATURE;
Preferences wateringState;
bool wateringStateReady=false;
// Persist before actuation. After reboot, conservatively wait a full cooldown.
bool beginWaterCycle(){
  if(!wateringStateReady || wateringState.putBool("watered",true)!=1)return false;
  hasWatered=true;lastWateringMs=millis();return true;
}


// Network features compile only when DeviceConfig.h exists and opts in.
#if __has_include("DeviceConfig.h")
#include "DeviceConfig.h"
#if ROOT_ESP_ENABLE_SYNC
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>   // install ArduinoJson v7 using Arduino Library Manager
#include <time.h>
const unsigned long NETWORK_INTERVAL_MS = 30000UL;
unsigned long lastNetworkMs = 0;

int lastDeviceHttpStatus=0;
bool deviceApi(const char *method, const String &path, const String &payload, String &response) {
  lastDeviceHttpStatus=0;
  if (WiFi.status() != WL_CONNECTED) return false;
  WiFiClientSecure client;
  client.setCACert(ROOT_ESP_CA_CERT); // verified TLS; never use setInsecure()
  HTTPClient http;
  if (!http.begin(client, String(ROOT_ESP_SERVER) + "/api/device" + path)) return false;
  http.setTimeout(5000);
  http.addHeader("X-Device-ID", String(ROOT_ESP_DEVICE_ID));
  http.addHeader("X-Device-Key", ROOT_ESP_DEVICE_KEY);
  http.addHeader("Content-Type", "application/json");
  const int code = String(method) == "GET" ? http.GET() : http.POST(payload);
  lastDeviceHttpStatus=code;
  response = http.getString();
  http.end();
  return code >= 200 && code < 300;
}

// Settings expire safely when the server cannot be reached. Local pump opt-in remains mandatory.
unsigned long lastConfigMs = 0;
bool configReady = false;
String pendingAckPath, pendingAckBody;
void fetchCareSettings() {
 String response;
 if (!deviceApi("GET", "/config", "", response)) return;
 JsonDocument doc;
 if (deserializeJson(doc,response) != DeserializationError::Ok) return;
 JsonVariant s=doc["settings"];
 if (!doc["linked"].as<bool>() || s.isNull()) {configReady=false;configuredAutoWater=false;configuredFanAuto=false;return;}
 const float soil=s["SoilMoistureThreshold"] | -1.0f;
 const int duration=s["WateringDurationSeconds"] | 0;
 const float start=s["FanStartTemperature"] | -999.0f, stop=s["FanStopTemperature"] | -999.0f;
 if (!s["AutomaticWateringEnabled"].is<bool>() || !s["FanAutomaticEnabled"].is<bool>() ||
     !isfinite(soil)||soil<0||soil>100||duration<1||duration>60||!isfinite(start)||!isfinite(stop)||stop>=start||stop< -50||start>100) {
   configReady=false;configuredAutoWater=false;configuredFanAuto=false;return;
 }
 configuredSoilThreshold=soil;configuredDuration=duration;
 configuredFanStart=start;configuredFanStop=stop;
 configuredAutoWater=s["AutomaticWateringEnabled"].as<bool>();
 configuredFanAuto=s["FanAutomaticEnabled"].as<bool>();
 configReady=true;lastConfigMs=millis();
}
void uploadReadings(int soil, float temperature, float humidity, float lightPercent, bool isFanOn) {
  JsonDocument doc;
  doc["SoilMoisture"] = soil;
  if (isnan(temperature) || temperature < -50 || temperature > 100) doc["AirTemperature"] = nullptr;
  else doc["AirTemperature"] = temperature;
  if (isnan(humidity) || humidity < 0 || humidity > 100) doc["AirHumidity"] = nullptr;
  else doc["AirHumidity"] = humidity;
  doc["LightLevel"] = lightPercent;
  doc["FanStatus"] = isFanOn;
  String body, response;
  serializeJson(doc, body);
  if (!deviceApi("POST", "/telemetry", body, response)) Serial.println("Telemetry upload failed.");
}

void retryPendingAck(){
 String response;
 if(deviceApi("POST",pendingAckPath,pendingAckBody,response)){pendingAckPath="";pendingAckBody="";return;}
 if(lastDeviceHttpStatus!=409 && lastDeviceHttpStatus!=404)return;
 String statusPath=pendingAckPath.substring(0,pendingAckPath.length()-4)+"/status";
 if(deviceApi("GET",statusPath,"",response)){
   JsonDocument state;
   if(deserializeJson(state,response)!=DeserializationError::Ok)return;
   const String status=state["Status"] | "";
   if(status=="Completed" || status=="Failed"){pendingAckPath="";pendingAckBody="";}
 }else if(lastDeviceHttpStatus==404){pendingAckPath="";pendingAckBody="";}
 // Never retry an actuator action while reconciling a report.
}
void pollAndHandleCommand(int soil) {
  String response;
  if (pendingAckPath.length()) {
    retryPendingAck();
    return; // retry acknowledgement only; never repeat physical actuation
  }
  if (!deviceApi("GET", "/commands/next", "", response)) return;
  JsonDocument cmd;
  if (deserializeJson(cmd, response) != DeserializationError::Ok || cmd["command"].isNull()) return;
  const String commandID = cmd["command"]["CommandID"].as<String>();
  const String commandType = cmd["command"]["CommandType"] | "";
  const int duration = cmd["command"]["DurationSeconds"] | 0;
  if(commandID.length()==0 || commandID.length()>19 || commandID[0]=='0' ||
     (commandID.length()==19 && commandID.compareTo("9223372036854775807")>0))return;
  for(unsigned int i=0;i<commandID.length();i++)if(commandID[i]<'0'||commandID[i]>'9')return;
  int actualSeconds = 0;
  bool success = false;
  // Safety: remote watering is explicitly off by default and constrained in hardware.
  if (ROOT_ESP_ENABLE_REMOTE_WATERING && commandType == "Water" &&
      duration >= 1 && duration <= 60 && soil >= 0 && soil <= 100 && soil < SOIL_TOO_WET &&
      (!hasWatered || millis() - lastWateringMs >= WATER_COOLDOWN_MS) && beginWaterCycle()) {
    // A limited 1-second cycle; additional water requires a new explicit request.
    const unsigned long runMs = min(static_cast<unsigned long>(duration) * 1000UL, MAX_WATER_DURATION_MS);
    blue.porneste(); pompa.porneste();
    delay(runMs);
    pompa.opreste(); blue.opreste();
    actualSeconds = runMs / 1000UL;
    lastWateringMs = millis(); hasWatered = true;
    success = actualSeconds >= 1;
  }
  JsonDocument ack;
  ack["status"] = success ? "Completed" : "Failed";
  if (success) ack["actualSeconds"] = actualSeconds;
  String body, reply;
  serializeJson(ack, body);
  pendingAckPath="/commands/" + commandID + "/ack";
  pendingAckBody=body;
  retryPendingAck();

}

void initNetwork() {
  if (!String(ROOT_ESP_SERVER).startsWith("https://") || ROOT_ESP_DEVICE_ID <= 0) {
    Serial.println("Network sync disabled: invalid HTTPS URL or device ID.");
    return;
  }
  WiFi.mode(WIFI_STA);
  WiFi.begin(ROOT_ESP_WIFI_SSID, ROOT_ESP_WIFI_PASSWORD);
  // TLS certificate time validation depends on synchronized wall clock.
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
}
#endif
#endif

void setup() {
  Serial.begin(115200);
  s_lumina.begin();
  s_umiditate_sol.begin();
  s_dht11.begin();
  pompa.begin();
  pompa.opreste();
  ventilator.begin();
  ventilator.opreste();
  red.begin(); red.opreste();
  green.begin(); green.opreste();
  blue.begin(); blue.opreste();
  yellow.begin(); yellow.opreste();
  wateringStateReady=wateringState.begin("root-esp",false);
  hasWatered=wateringStateReady && wateringState.getBool("watered",false);
  if(hasWatered)lastWateringMs=millis();
  Serial.println("SeraSmart sensor monitor started. Pump disabled by default.");
#if __has_include("DeviceConfig.h")
#if ROOT_ESP_ENABLE_SYNC
  initNetwork();
#endif
#endif
}

void VerificaLumina(float lightPercent) {
  if (lightPercent <= 10) Serial.println("Planta nu primeste lumina.");
  else if (lightPercent <= 40) Serial.println("Planta nu primeste destula lumina.");
  else if (lightPercent <= 75) Serial.println("Lumina estimata este ideala.");
  else Serial.println("Lumina estimata este puternica.");
}

void loop() {
  const unsigned long now = millis();
  if (now - lastSampleMs < SENSOR_INTERVAL_MS) return;
  lastSampleMs = now;

#if __has_include("DeviceConfig.h")
#if ROOT_ESP_ENABLE_SYNC
  if (!configReady || millis()-lastConfigMs>120000UL) {configuredAutoWater=false;configuredFanAuto=false;}
#endif
#endif
  const int soil = s_umiditate_sol.CitireUmiditateSol();
  const float lightPercent = s_lumina.CitesteLux();
  const float temperature = s_dht11.CitireTemperatura();
  const float humidity = s_dht11.CitireUmiditate();
  Serial.print("Soil (%): "); Serial.println(soil);
  Serial.print("Light (%): "); Serial.println(lightPercent);
  VerificaLumina(lightPercent);

  // Never run a pump based on a missing or uncalibrated sensor reading.
  // The percentage conversion is only an estimate until wet/dry calibration.
  if (ENABLE_LOCAL_AUTOWATERING && configuredAutoWater && soil >= 0 && soil <= 100 &&
      soil < configuredSoilThreshold &&
      (!hasWatered || now - lastWateringMs >= WATER_COOLDOWN_MS) && beginWaterCycle()) {
    blue.porneste();
    pompa.porneste();
    delay(configuredDuration * 1000UL < MAX_WATER_DURATION_MS ? configuredDuration * 1000UL : MAX_WATER_DURATION_MS);
    pompa.opreste();
    blue.opreste();
    hasWatered = true;
    lastWateringMs = millis();
    Serial.println("One limited watering cycle completed.");
  }

  if (soil > SOIL_TOO_WET) Serial.println("Sol foarte umed; nu uda.");
  if (configuredFanAuto && !isnan(temperature) && !isnan(humidity) &&
      temperature >= -50 && temperature <= 100 && humidity >= 0 && humidity <= 100) {
    Serial.print("Air (C): "); Serial.println(temperature);
    Serial.print("Humidity (%): "); Serial.println(humidity);
    if (!fanOn && temperature > configuredFanStart) {
      green.porneste(); ventilator.porneste(); fanOn = true;
    } else if (fanOn && temperature <= configuredFanStop) {
      green.opreste(); ventilator.opreste(); fanOn = false;
    }
  } else {
    // Fail safe: invalid temperature cannot be used to control the fan.
    green.opreste(); ventilator.opreste(); fanOn = false;
    Serial.println("No valid DHT11 reading.");
  }
#if __has_include("DeviceConfig.h")
#if ROOT_ESP_ENABLE_SYNC
  if (millis() - lastNetworkMs >= NETWORK_INTERVAL_MS) {
    lastNetworkMs = millis();
    if (WiFi.status() != WL_CONNECTED) {
      WiFi.reconnect();
    } else {
      fetchCareSettings();
      uploadReadings(soil, temperature, humidity, lightPercent, fanOn);
      pollAndHandleCommand(soil);
    }
  }
#endif
#endif
}
