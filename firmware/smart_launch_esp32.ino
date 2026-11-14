/*
  AIoT SMART LAUNCH RISK ASSESSMENT SYSTEM
  ESP32-WROOM-32D Integrated Web Firmware

  User Verified Hardware Pinout:
    - Left HX711 DT / SCK         : GPIO 19 / 18 (Cal factor: 695.416)
    - Right HX711 DT / SCK        : GPIO 25 / 26 (Cal factor: 706.785)
    - MPU6050 SDA / SCL           : GPIO 21 / 22 (Address: 0x68)
    - Water Sensor Signal         : GPIO 34 (ADC1_CH6)
    - Buzzer (NPN Transistor Base): GPIO 27
    - NEO-6M GPS RX / TX          : GPIO 16 (ESP32 RX2) / GPIO 17 (ESP32 TX2)
    - Entry HC-SR04 TRIG / ECHO   : GPIO 32 / GPIO 33 (via voltage divider)
    - Exit HC-SR04 TRIG / ECHO    : GPIO 13 / GPIO 14 (via voltage divider)

  Web Integration:
    - Hosts a responsive live dashboard at http://192.168.4.1
    - Serves telemetry JSON via GET /api/telemetry and accepts commands via POST /api/command
    - Streams the same telemetry JSON over USB for the existing serial bridge

  Serial Commands (via Serial Monitor or Web Command Queue):
    - 'd' : Water Dry Calibration
    - 'w' : Water Wet Calibration
    - 't' : Tare both Left & Right Load Cells
    - 'm' : MPU6050 Level & Bias Calibration
    - 'z' : Reset Passenger Counts
*/

#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <math.h>
#include <Preferences.h>
#include <TinyGPSPlus.h>
#include "HX711.h"

// ============================================================
// NETWORK CONFIGURATION - ESP32 ACCESS POINT
// ============================================================
const char* WIFI_SSID     = "Smart Launch ESP32";
const char* WIFI_PASSWORD = "12345678";

// The dashboard is hosted by the ESP32 and is available at this address.
IPAddress ESP32_IP(192, 168, 4, 1);
IPAddress GATEWAY_IP(192, 168, 4, 1);
IPAddress SUBNET_MASK(255, 255, 255, 0);
const char* DEVICE_ID     = "LAUNCH-BD-8902";
WebServer webServer(80);

// ============================================================
// PIN CONFIGURATION - EXACT USER VERIFIED MAPPING
// ============================================================
#define LEFT_DT_PIN       19
#define LEFT_SCK_PIN      18

#define RIGHT_DT_PIN      25
#define RIGHT_SCK_PIN     26

#define MPU_SDA_PIN       21
#define MPU_SCL_PIN       22
#define MPU_ADDRESS       0x68

#define WATER_ANALOG_PIN  34
#define BUZZER_PIN        27

#define GPS_RX_PIN        16 // Connected to NEO-6M TX
#define GPS_TX_PIN        17 // Connected to NEO-6M RX

#define ENTRY_TRIG_PIN    32
#define ENTRY_ECHO_PIN    33 // via 1k/2k voltage divider

#define EXIT_TRIG_PIN     13
#define EXIT_ECHO_PIN     14 // via 1k/2k voltage divider

// ============================================================
// OBJECTS
// ============================================================
HX711 leftScale;
HX711 rightScale;

HardwareSerial gpsSerial(2);
TinyGPSPlus gps;

Preferences preferences;

// ============================================================
// CALIBRATION FACTORS - USER'S TESTED FACTORS
// ============================================================
const float LEFT_CALIBRATION_FACTOR  = 695.416f;
const float RIGHT_CALIBRATION_FACTOR = 706.785f;

// Prototype Thresholds
const float WEIGHT_ZERO_DEADBAND_G = 2.0f;
const float NO_LOAD_THRESHOLD_G = 5.0f;
const float IMBALANCE_WARNING_PERCENT = 10.0f;
const float IMBALANCE_CRITICAL_PERCENT = 20.0f;
const float TILT_WARNING_DEG = 5.0f;
const float TILT_CRITICAL_DEG = 10.0f;
const float LOAD_CELL_WARNING_G = 800.0f;
const float LOAD_CELL_CAPACITY_G = 1000.0f;
const float WATER_DETECT_PERCENT = 5.0f;
const float WATER_WARNING_PERCENT = 25.0f;
const float WATER_CRITICAL_PERCENT = 60.0f;

const float GATE_DETECT_DISTANCE_CM = 15.0f;
const float GATE_CLEAR_DISTANCE_CM = 20.0f;

// Timing Settings
const unsigned long OUTPUT_INTERVAL_MS = 1000;
const unsigned long WATER_READ_INTERVAL_MS = 250;
const unsigned long GATE_PING_GAP_MS = 70;
const unsigned long ULTRASONIC_TIMEOUT_US = 18000UL;
const unsigned long TELEMETRY_SEND_INTERVAL_MS = 1000;

// Variables
float leftWeightG = 0.0f;
float rightWeightG = 0.0f;
bool leftScaleValid = false;
bool rightScaleValid = false;
unsigned long lastLeftScaleReadMs = 0;
unsigned long lastRightScaleReadMs = 0;

// MPU6050
int16_t accelXRaw = 0, accelYRaw = 0, accelZRaw = 0;
int16_t temperatureRaw = 0;
int16_t gyroXRaw = 0, gyroYRaw = 0, gyroZRaw = 0;
float pitchDeg = 0.0f, rollDeg = 0.0f;
float pitchZeroOffsetDeg = 0.0f, rollZeroOffsetDeg = 0.0f;
float gyroXRateDps = 0.0f, gyroYRateDps = 0.0f;
float gyroXZeroOffsetDps = 0.0f, gyroYZeroOffsetDps = 0.0f;
bool mpuValid = false;
unsigned long lastMpuReadMs = 0;

// Water Sensor
int waterRaw = 0;
int waterDryRaw = -1;
int waterWetRaw = -1;
bool waterDryReferenceValid = false;
bool waterCalibrationValid = false;
float waterCoveragePercent = 0.0f;
unsigned long lastWaterReadMs = 0;

// GPS
bool gpsFixValid = false;

// Passenger Gates
struct GateDetector {
  bool armed;
  uint8_t nearSamples;
  uint8_t clearSamples;
};
GateDetector entryGate = {true, 0, 0};
GateDetector exitGate  = {true, 0, 0};
float entryDistanceCm = -1.0f;
float exitDistanceCm = -1.0f;
uint32_t totalEntries = 0;
uint32_t totalExits = 0;
uint32_t passengerCount = 0;
uint32_t unmatchedExitEvents = 0;

enum GatePingStage { PING_ENTRY, PING_EXIT };
GatePingStage nextGatePing = PING_ENTRY;
unsigned long nextGatePingAtMs = 0;

// Buzzer
const bool BUZZER_ACTIVE_LOW = false;
const bool ENABLE_BUZZER = true;
const char *buzzerStatus = "OFF";

unsigned long lastOutputMs = 0;
unsigned long lastTelemetryMs = 0;
uint8_t lastConnectedStations = 0;

// Forward Declarations
void setBuzzer(bool enabled);
void calibrateWaterDry();
void calibrateWaterWet();
bool calibrateMPULevel();
void tareLoadCells();
void resetPassengers();
void executeCommand(char cmd);

// Preferences Storage
void loadSavedData() {
  preferences.begin("launch", true);
  waterDryRaw = preferences.getInt("waterDry", -1);
  waterWetRaw = preferences.getInt("waterWet", -1);
  totalEntries = preferences.getUInt("entries", 0);
  totalExits = preferences.getUInt("exits", 0);
  passengerCount = preferences.getUInt("passengers", 0);
  unmatchedExitEvents = preferences.getUInt("unmatched", 0);
  preferences.end();

  waterDryReferenceValid = (waterDryRaw >= 0);
  waterCalibrationValid = (waterDryRaw >= 0) && (waterWetRaw >= 0) && (abs(waterWetRaw - waterDryRaw) >= 50);
}

void saveWaterDryReference() {
  preferences.begin("launch", false);
  preferences.putInt("waterDry", waterDryRaw);
  preferences.remove("waterWet");
  preferences.end();
}

void saveWaterCalibration() {
  preferences.begin("launch", false);
  preferences.putInt("waterDry", waterDryRaw);
  preferences.putInt("waterWet", waterWetRaw);
  preferences.end();
}

void savePassengerCounts() {
  preferences.begin("launch", false);
  preferences.putUInt("entries", totalEntries);
  preferences.putUInt("exits", totalExits);
  preferences.putUInt("passengers", passengerCount);
  preferences.putUInt("unmatched", unmatchedExitEvents);
  preferences.end();
}

// Buzzer Control (GPIO27 NPN Transistor)
void setBuzzer(bool enabled) {
  if (!ENABLE_BUZZER) return;
  digitalWrite(BUZZER_PIN, enabled ? (BUZZER_ACTIVE_LOW ? LOW : HIGH) : (BUZZER_ACTIVE_LOW ? HIGH : LOW));
}

void updateBuzzer(bool criticalAlert, bool warningAlert, bool waterDetected) {
  const unsigned long now = millis();
  bool buzzerOn = false;

  if (criticalAlert) {
    buzzerOn = true;
    buzzerStatus = "CRITICAL - CONTINUOUS";
  } else if (warningAlert) {
    const unsigned long phase = now % 1000UL;
    buzzerOn = (phase < 150UL) || (phase >= 300UL && phase < 450UL);
    buzzerStatus = "WARNING - DOUBLE BEEP";
  } else if (waterDetected) {
    const unsigned long phase = now % 2500UL;
    buzzerOn = (phase < 120UL);
    buzzerStatus = "WATER DETECTED - BEEP";
  } else {
    buzzerOn = false;
    buzzerStatus = "OFF";
  }
  setBuzzer(buzzerOn);
}

// Water Sensor Reading
int readWaterRawAverage() {
  long total = 0;
  const uint8_t samples = 16;
  for (uint8_t i = 0; i < samples; i++) {
    total += analogRead(WATER_ANALOG_PIN);
    delayMicroseconds(300);
  }
  return (int)(total / samples);
}

void calibrateWaterDry() {
  Serial.println("\n[CMD: 'd'] Water dry calibration: keep sensor fully dry.");
  waterRaw = readWaterRawAverage();
  waterDryRaw = waterRaw;
  waterDryReferenceValid = true;
  waterCalibrationValid = false;
  waterCoveragePercent = 0.0f;
  saveWaterDryReference();
  Serial.printf("Saved DRY ADC value: %d. Now wet sensor tracks and send 'w'.\n", waterDryRaw);
}

void calibrateWaterWet() {
  if (!waterDryReferenceValid) {
    Serial.println("\n[CMD: 'w'] Water calibration error: send 'd' first while dry.");
    return;
  }
  waterRaw = readWaterRawAverage();
  waterWetRaw = waterRaw;
  Serial.printf("DRY ADC: %d | WET ADC: %d\n", waterDryRaw, waterWetRaw);

  if (abs(waterWetRaw - waterDryRaw) < 50) {
    waterCalibrationValid = false;
    Serial.println("Water calibration FAILED: delta too small. Check wiring.");
    return;
  }
  waterCalibrationValid = true;
  saveWaterCalibration();
  Serial.println("Water calibration successful and saved in ESP32 Flash!");
}

void updateWaterSensor() {
  const unsigned long now = millis();
  if (now - lastWaterReadMs < WATER_READ_INTERVAL_MS) return;
  lastWaterReadMs = now;
  waterRaw = readWaterRawAverage();

  if (!waterCalibrationValid) {
    waterCoveragePercent = 0.0f;
    return;
  }

  const float denominator = (float)(waterWetRaw - waterDryRaw);
  if (fabs(denominator) < 1.0f) {
    waterCalibrationValid = false;
    waterCoveragePercent = 0.0f;
    return;
  }

  waterCoveragePercent = ((float)(waterRaw - waterDryRaw) / denominator) * 100.0f;
  if (waterCoveragePercent < 0.0f) waterCoveragePercent = 0.0f;
  if (waterCoveragePercent > 100.0f) waterCoveragePercent = 100.0f;
}

// MPU6050 Driver
void writeMPURegister(uint8_t reg, uint8_t value) {
  Wire.beginTransmission(MPU_ADDRESS);
  Wire.write(reg);
  Wire.write(value);
  Wire.endTransmission(true);
}

bool initializeMPU() {
  Wire.begin(MPU_SDA_PIN, MPU_SCL_PIN);
  Wire.beginTransmission(MPU_ADDRESS);
  if (Wire.endTransmission() != 0) return false;

  writeMPURegister(0x6B, 0x00); // Wake up
  delay(100);
  writeMPURegister(0x1C, 0x00); // Accel +/-2g
  writeMPURegister(0x1B, 0x00); // Gyro +/-250 deg/s
  writeMPURegister(0x1A, 0x03); // Low-pass filter
  delay(100);
  return true;
}

bool readMPU6050(float &currentPitch, float &currentRoll, float &currentGyroX, float &currentGyroY) {
  Wire.beginTransmission(MPU_ADDRESS);
  Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0) return false;

  const uint8_t received = Wire.requestFrom((uint8_t)MPU_ADDRESS, (uint8_t)14, (uint8_t)true);
  if (received != 14) {
    while (Wire.available()) Wire.read();
    return false;
  }

  accelXRaw = (int16_t)((Wire.read() << 8) | Wire.read());
  accelYRaw = (int16_t)((Wire.read() << 8) | Wire.read());
  accelZRaw = (int16_t)((Wire.read() << 8) | Wire.read());
  temperatureRaw = (int16_t)((Wire.read() << 8) | Wire.read());
  gyroXRaw = (int16_t)((Wire.read() << 8) | Wire.read());
  gyroYRaw = (int16_t)((Wire.read() << 8) | Wire.read());
  gyroZRaw = (int16_t)((Wire.read() << 8) | Wire.read());

  const float ax = accelXRaw / 16384.0f;
  const float ay = accelYRaw / 16384.0f;
  const float az = accelZRaw / 16384.0f;

  // This MPU6050 is mounted with its X/Y axes exchanged relative to the
  // dashboard orientation: sensor Y is the vessel pitch axis and sensor X
  // is the vessel roll axis.
  currentPitch = atan2f(ay, sqrtf(ax * ax + az * az)) * 180.0f / PI;
  currentRoll = atan2f(-ax, az) * 180.0f / PI;
  currentGyroX = gyroXRaw / 131.0f;
  currentGyroY = gyroYRaw / 131.0f;
  return true;
}

float normalizeAngle(float angle) {
  while (angle > 180.0f) angle -= 360.0f;
  while (angle < -180.0f) angle += 360.0f;
  return angle;
}

bool calibrateMPULevel() {
  Serial.println("\n[CMD: 'm'] Calibrating MPU: Keep model completely level and still...");
  float pitchSum = 0.0f, rollSum = 0.0f, gyroXSum = 0.0f, gyroYSum = 0.0f;
  uint16_t validSamples = 0;

  for (uint16_t i = 0; i < 100; i++) {
    float p, r, gx, gy;
    if (readMPU6050(p, r, gx, gy)) {
      pitchSum += p;
      rollSum += r;
      gyroXSum += gx;
      gyroYSum += gy;
      validSamples++;
    }
    delay(10);
  }

  if (validSamples < 80) {
    Serial.println("MPU calibration FAILED: too few samples.");
    return false;
  }

  pitchZeroOffsetDeg = pitchSum / validSamples;
  rollZeroOffsetDeg = rollSum / validSamples;
  gyroXZeroOffsetDps = gyroXSum / validSamples;
  gyroYZeroOffsetDps = gyroYSum / validSamples;
  pitchDeg = 0.0f;
  rollDeg = 0.0f;
  gyroXRateDps = 0.0f;
  gyroYRateDps = 0.0f;

  Serial.println("MPU level and gyro bias calibration complete!");
  Serial.printf("Pitch offset: %.2f | Roll offset: %.2f\n", pitchZeroOffsetDeg, rollZeroOffsetDeg);
  return true;
}

void updateMPU() {
  float rawPitch, rawRoll, rawGyroX, rawGyroY;
  mpuValid = readMPU6050(rawPitch, rawRoll, rawGyroX, rawGyroY);

  if (mpuValid) {
    pitchDeg = normalizeAngle(rawPitch - pitchZeroOffsetDeg);
    rollDeg = normalizeAngle(rawRoll - rollZeroOffsetDeg);
    gyroXRateDps = rawGyroX - gyroXZeroOffsetDps;
    gyroYRateDps = rawGyroY - gyroYZeroOffsetDps;
    lastMpuReadMs = millis();
  } else if (millis() - lastMpuReadMs > 1000UL) {
    mpuValid = false;
  }
}

// GPS NEO-6M
void updateGPS() {
  while (gpsSerial.available() > 0) {
    gps.encode((char)gpsSerial.read());
  }
  gpsFixValid = gps.location.isValid() && (gps.location.age() < 5000UL);
}

// Ultrasonic Gate Processing
float readUltrasonicDistanceCm(uint8_t trigPin, uint8_t echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(3);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  const unsigned long duration = pulseIn(echoPin, HIGH, ULTRASONIC_TIMEOUT_US);
  if (duration == 0) return -1.0f;
  return duration / 58.0f;
}

void recordEntryEvent() {
  totalEntries++;
  passengerCount++;
  savePassengerCounts();
  Serial.printf("\n*** ENTRY DETECTED: PASSENGER +1 (Total Onboard: %lu, Entries: %lu) ***\n",
                (unsigned long)passengerCount, (unsigned long)totalEntries);
}

void recordExitEvent() {
  totalExits++;
  if (passengerCount > 0) {
    passengerCount--;
  } else {
    unmatchedExitEvents++;
  }
  savePassengerCounts();
  Serial.printf("\n*** EXIT DETECTED: PASSENGER -1 (Total Onboard: %lu, Exits: %lu) ***\n",
                (unsigned long)passengerCount, (unsigned long)totalExits);
}

void processGateDetector(GateDetector &gate, float distanceCm, bool isEntryGate) {
  if (gate.armed) {
    if (distanceCm >= 2.0f && distanceCm <= GATE_DETECT_DISTANCE_CM) {
      if (gate.nearSamples < 255) gate.nearSamples++;
    } else {
      gate.nearSamples = 0;
    }

    if (gate.nearSamples >= 2) {
      gate.armed = false;
      gate.nearSamples = 0;
      gate.clearSamples = 0;
      if (isEntryGate) recordEntryEvent();
      else recordExitEvent();
    }
  } else {
    if (distanceCm < 0.0f || distanceCm >= GATE_CLEAR_DISTANCE_CM) {
      if (gate.clearSamples < 255) gate.clearSamples++;
    } else {
      gate.clearSamples = 0;
    }
    if (gate.clearSamples >= 3) {
      gate.armed = true;
      gate.clearSamples = 0;
      gate.nearSamples = 0;
    }
  }
}

void updatePassengerGates() {
  const unsigned long now = millis();
  if ((int32_t)(now - nextGatePingAtMs) < 0) return;

  if (nextGatePing == PING_ENTRY) {
    entryDistanceCm = readUltrasonicDistanceCm(ENTRY_TRIG_PIN, ENTRY_ECHO_PIN);
    processGateDetector(entryGate, entryDistanceCm, true);
    nextGatePing = PING_EXIT;
  } else {
    exitDistanceCm = readUltrasonicDistanceCm(EXIT_TRIG_PIN, EXIT_ECHO_PIN);
    processGateDetector(exitGate, exitDistanceCm, false);
    nextGatePing = PING_ENTRY;
  }
  nextGatePingAtMs = millis() + GATE_PING_GAP_MS;
}

// Tare Load Cells
void tareLoadCells() {
  Serial.println("\n[CMD: 't'] Taring both load cells. Remove all weight first...");
  if (leftScale.wait_ready_timeout(3000) && rightScale.wait_ready_timeout(3000)) {
    leftScale.tare(20);
    rightScale.tare(20);
    leftWeightG = 0.0f;
    rightWeightG = 0.0f;
    lastLeftScaleReadMs = millis();
    lastRightScaleReadMs = millis();
    Serial.println("Both Left and Right load cells tared successfully.");
  } else {
    Serial.println("Tare failed: Check Left/Right HX711 wiring.");
  }
}

// Reset Passengers
void resetPassengers() {
  totalEntries = 0;
  totalExits = 0;
  passengerCount = 0;
  unmatchedExitEvents = 0;
  entryGate.armed = true; entryGate.nearSamples = 0; entryGate.clearSamples = 0;
  exitGate.armed = true; exitGate.nearSamples = 0; exitGate.clearSamples = 0;
  savePassengerCounts();
  Serial.println("\n[CMD: 'z'] Passenger counters reset to zero and saved in Flash.");
}

// Command dispatcher (used by Serial Monitor and Web Telemetry response)
void executeCommand(char cmd) {
  switch (cmd) {
    case 'd': case 'D':
      setBuzzer(false);
      calibrateWaterDry();
      break;
    case 'w': case 'W':
      setBuzzer(false);
      calibrateWaterWet();
      break;
    case 't': case 'T':
      tareLoadCells();
      break;
    case 'm': case 'M':
      setBuzzer(false);
      calibrateMPULevel();
      break;
    case 'z': case 'Z':
      resetPassengers();
      break;
    default:
      break;
  }
}

void handleSerialCommands() {
  while (Serial.available() > 0) {
    const char c = (char)Serial.read();
    if (c == '\n' || c == '\r') continue;
    executeCommand(c);
  }
}

// ============================================================
// LOCAL WEB DASHBOARD (ESP32 AP + HTTP/AJAX)
// ============================================================
String buildTelemetryJson() {
  const float totalWeightG = leftWeightG + rightWeightG;
  const float differenceG = fabs(leftWeightG - rightWeightG);
  float imbalancePercent = 0.0f;
  if (totalWeightG >= NO_LOAD_THRESHOLD_G) {
    imbalancePercent = (differenceG / totalWeightG) * 100.0f;
  }

  // Construct JSON Payload matching backend schema
  String json = "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"timestamp\":\"" + String(millis()) + "\",";
  json += "\"buzzerState\":\"" + String(buzzerStatus) + "\",";
  json += "\"passengerCount\":" + String(passengerCount) + ",";
  json += "\"entryCount\":" + String(totalEntries) + ",";
  json += "\"exitCount\":" + String(totalExits) + ",";

  // Weights in grams (prototype scale)
  json += "\"leftLoad\":" + String(leftWeightG, 2) + ",";
  json += "\"rightLoad\":" + String(rightWeightG, 2) + ",";
  json += "\"totalLoad\":" + String(totalWeightG, 2) + ",";
  json += "\"loadImbalancePercent\":" + String(imbalancePercent, 1) + ",";
  json += "\"dualHX711Connected\":true,";

  // Angles & Motion
  json += "\"roll\":" + String(rollDeg, 2) + ",";
  json += "\"pitch\":" + String(pitchDeg, 2) + ",";
  json += "\"gyroX\":" + String(gyroXRateDps, 2) + ",";
  json += "\"gyroY\":" + String(gyroYRateDps, 2) + ",";

  // Water
  json += "\"waterLevelRaw\":" + String(waterRaw) + ",";
  json += "\"waterLevelPercent\":" + String(waterCoveragePercent, 1) + ",";
  json += "\"entryDistanceCm\":" + String(entryDistanceCm, 1) + ",";
  json += "\"exitDistanceCm\":" + String(exitDistanceCm, 1) + ",";

  // GPS
  json += "\"gps\":{";
  if (gpsFixValid) {
    json += "\"fixValid\":true,";
    json += "\"latitude\":" + String(gps.location.lat(), 6) + ",";
    json += "\"longitude\":" + String(gps.location.lng(), 6) + ",";
    json += "\"speedKmh\":" + String(gps.speed.isValid() ? gps.speed.kmph() : 0.0, 1) + ",";
    json += "\"course\":" + String(gps.course.isValid() ? gps.course.deg() : 0.0, 1) + ",";
    json += "\"satellites\":" + String(gps.satellites.isValid() ? gps.satellites.value() : 0);
  } else {
    json += "\"fixValid\":false,";
    json += "\"latitude\":null,";
    json += "\"longitude\":null,";
    json += "\"speedKmh\":null,";
    json += "\"course\":null,";
    json += "\"satellites\":" + String(gps.satellites.isValid() ? gps.satellites.value() : 0);
  }
  json += "},";

  // Hardware status
  json += "\"hardwareHealth\":{";
  json += "\"esp32Wifi\":true,";
  json += "\"entryUltrasonic\":" + String(entryDistanceCm >= 0 ? "true" : "false") + ",";
  json += "\"exitUltrasonic\":" + String(exitDistanceCm >= 0 ? "true" : "false") + ",";
  json += "\"loadCellAmplifier\":" + String((leftScaleValid && rightScaleValid) ? "true" : "false") + ",";
  json += "\"mpu6050\":" + String(mpuValid ? "true" : "false") + ",";
  json += "\"waterSensor\":" + String(waterCalibrationValid ? "true" : "false") + ",";
  json += "\"neo6mGps\":" + String(gpsFixValid ? "true" : "false") + ",";
  json += "\"activeBuzzer\":" + String(String(buzzerStatus) != "OFF" ? "true" : "false");
  json += "},";
  json += "\"wifi\":{";
  json += "\"mode\":\"ACCESS_POINT\",";
  json += "\"ssid\":\"" + String(WIFI_SSID) + "\",";
  json += "\"ip\":\"" + WiFi.softAPIP().toString() + "\",";
  json += "\"clients\":" + String(WiFi.softAPgetStationNum());
  json += "}";
  json += "}";
  return json;
}

const char DASHBOARD_HTML[] PROGMEM = R"HTML(
<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Smart Launch ESP32</title>
<style>
:root{color-scheme:dark;font:16px system-ui,sans-serif;background:#0f172a;color:#e2e8f0}
body{margin:0;padding:16px;background:linear-gradient(135deg,#0f172a,#164e63);min-height:100vh}
main{max-width:980px;margin:auto}.card{background:#0f172acc;border:1px solid #334155;border-radius:14px;padding:16px;margin:12px 0}
h1{margin:0 0 6px;font-size:1.55rem}.muted{color:#94a3b8;font-size:.9rem}
.status{display:flex;flex-wrap:wrap;gap:8px}.pill{padding:7px 10px;border-radius:999px;background:#14532d;color:#bbf7d0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px}
.metric{background:#1e293b;border-radius:10px;padding:12px}.label{color:#94a3b8;font-size:.78rem;text-transform:uppercase}
.value{font-size:1.45rem;font-weight:700;margin-top:5px}.actions{display:flex;flex-wrap:wrap;gap:8px}
button{border:0;border-radius:8px;padding:10px 13px;background:#0891b2;color:white;font-weight:700}
button:active{background:#0e7490}code{color:#67e8f9}
@media(max-width:480px){body{padding:9px}.card{padding:12px}}
</style></head><body><main>
<section class="card"><h1>AIoT Smart Launch</h1>
<div class="muted">Local ESP32 sensor dashboard</div><div class="status">
<span class="pill" id="connection">Connecting...</span><span class="pill" id="wifi">AP: --</span></div>
<p class="muted">Connect your device to <b id="ssid">Smart Launch ESP32</b>, then open <code>http://192.168.4.1</code>. No internet or router is required.</p></section>
<section class="card"><h2>Live readings</h2><div class="grid">
<div class="metric"><div class="label">Passengers</div><div class="value" id="passengers">--</div></div>
<div class="metric"><div class="label">Entries / exits</div><div class="value" id="gates">--</div></div>
<div class="metric"><div class="label">Total load</div><div class="value" id="load">--</div></div>
<div class="metric"><div class="label">Left / right load</div><div class="value" id="sides">--</div></div>
<div class="metric"><div class="label">Load imbalance</div><div class="value" id="imbalance">--</div></div>
<div class="metric"><div class="label">Water level</div><div class="value" id="water">--</div></div>
<div class="metric"><div class="label">Roll / pitch</div><div class="value" id="tilt">--</div></div>
<div class="metric"><div class="label">Gyro X / Y</div><div class="value" id="gyro">--</div></div>
<div class="metric"><div class="label">Gate distances</div><div class="value" id="distance">--</div></div>
<div class="metric"><div class="label">GPS</div><div class="value" id="gps">--</div></div>
<div class="metric"><div class="label">Buzzer</div><div class="value" id="buzzer">--</div></div>
</div></section>
<section class="card"><h2>Calibration and controls</h2><div class="actions">
<button onclick="command('d')">Water dry</button><button onclick="command('w')">Water wet</button>
<button onclick="command('t')">Tare loads</button><button onclick="command('m')">Level MPU</button><button onclick="command('z')">Reset passengers</button>
</div><p class="muted" id="message">Updates every second.</p></section>
</main><script>
const $=id=>document.getElementById(id);
function n(v,d=1){return Number.isFinite(Number(v))?Number(v).toFixed(d):'--'}
function update(t){$('connection').textContent='ESP32 connected';$('wifi').textContent=`AP: ${t.wifi.ssid} (${t.wifi.clients} client${t.wifi.clients==1?'':'s'})`;$('ssid').textContent=t.wifi.ssid;
$('passengers').textContent=t.passengerCount;$('gates').textContent=`${t.entryCount} / ${t.exitCount}`;$('load').textContent=`${n(t.totalLoad)} g`;
$('sides').textContent=`${n(t.leftLoad)} / ${n(t.rightLoad)} g`;$('imbalance').textContent=`${n(t.loadImbalancePercent)}%`;$('water').textContent=`${n(t.waterLevelPercent)}% (ADC ${t.waterLevelRaw})`;
$('tilt').textContent=`${n(t.roll)}° / ${n(t.pitch)}°`;$('gyro').textContent=`${n(t.gyroX)} / ${n(t.gyroY)}°/s`;$('distance').textContent=`${n(t.entryDistanceCm)} / ${n(t.exitDistanceCm)} cm`;$('gps').textContent=t.gps.fixValid?`${n(t.gps.latitude,5)}, ${n(t.gps.longitude,5)}`:'Searching';
$('buzzer').textContent=t.buzzerState}
async function poll(){try{const r=await fetch('/api/telemetry',{cache:'no-store'});if(!r.ok)throw Error();update(await r.json())}catch(e){$('connection').textContent='ESP32 connection lost';$('connection').style.background='#7f1d1d'}}
async function command(c){$('message').textContent='Sending command...';try{const r=await fetch('/api/command?cmd='+c,{method:'POST'});$('message').textContent=(await r.json()).message}catch(e){$('message').textContent='Command failed'}}
poll();setInterval(poll,1000);
</script></body></html>
)HTML";

void handleRoot() {
  webServer.sendHeader("Access-Control-Allow-Origin", "*");
  webServer.send_P(200, "text/html", DASHBOARD_HTML);
}

void handleTelemetry() {
  webServer.sendHeader("Access-Control-Allow-Origin", "*");
  webServer.sendHeader("Cache-Control", "no-store");
  webServer.send(200, "application/json", buildTelemetryJson());
}

void handleCommand() {
  String command = webServer.hasArg("cmd") ? webServer.arg("cmd") : "";
  if (command.length() != 1 || String("dDwWtTmMzZ").indexOf(command.charAt(0)) < 0) {
    webServer.send(400, "application/json", "{\"message\":\"Invalid command\"}");
    return;
  }
  executeCommand(command.charAt(0));
  webServer.sendHeader("Access-Control-Allow-Origin", "*");
  webServer.send(200, "application/json", "{\"message\":\"Command accepted\"}");
}

void handleOptions() {
  webServer.sendHeader("Access-Control-Allow-Origin", "*");
  webServer.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  webServer.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  webServer.send(204, "text/plain", "");
}

void setupWebServer() {
  webServer.on("/", HTTP_GET, handleRoot);
  webServer.on("/api/telemetry", HTTP_GET, handleTelemetry);
  webServer.on("/api/command", HTTP_POST, handleCommand);
  webServer.on("/api/telemetry", HTTP_OPTIONS, handleOptions);
  webServer.on("/api/command", HTTP_OPTIONS, handleOptions);
  webServer.onNotFound([]() { webServer.send(404, "text/plain", "Not found"); });
  webServer.begin();
  Serial.println("[Web] Dashboard: http://192.168.4.1/");
}

// Keep the USB telemetry stream for the existing dashboard/diagnostic tooling.
void sendTelemetryToWebServer() {
  const unsigned long now = millis();
  if (now - lastTelemetryMs < TELEMETRY_SEND_INTERVAL_MS) return;
  lastTelemetryMs = now;
  const String json = buildTelemetryJson();

  // Always stream structured JSON line over USB Serial for direct browser Web Serial Bridge
  Serial.println("TELEMETRY_JSON:" + json);
}

// Print Monitoring Report to Serial Monitor
void printMonitoringData() {
  const unsigned long now = millis();
  if (now - lastOutputMs < OUTPUT_INTERVAL_MS) return;
  lastOutputMs = now;

  const float totalWeightG = leftWeightG + rightWeightG;
  const float weightDifferenceG = fabs(leftWeightG - rightWeightG);
  float imbalancePercent = 0.0f;

  const bool validDistribution = leftScaleValid && rightScaleValid &&
      leftWeightG >= 0.0f && rightWeightG >= 0.0f && totalWeightG >= NO_LOAD_THRESHOLD_G;

  if (validDistribution) {
    imbalancePercent = (weightDifferenceG / totalWeightG) * 100.0f;
  }

  Serial.println("\n================================================");
  Serial.println("       AIoT SMART LAUNCH RISK ASSESSMENT");
  Serial.printf(" Wi-Fi AP: %s | Dashboard: http://%s/\n",
                WiFi.softAPgetStationNum() > 0 ? "CLIENT CONNECTED" : "WAITING FOR CLIENT",
                WiFi.softAPIP().toString().c_str());
  Serial.println("================================================");
  Serial.printf("[WEIGHT] Left: %.2fg | Right: %.2fg | Total: %.2fg | Imbalance: %.1f%%\n",
                leftWeightG, rightWeightG, totalWeightG, imbalancePercent);
  Serial.printf("[TILT]   Pitch: %.2f deg | Roll: %.2f deg | Status: %s\n",
                pitchDeg, rollDeg, (mpuValid ? (fabs(rollDeg) > TILT_CRITICAL_DEG ? "HIGH TILT" : "NORMAL") : "IMU ERROR"));
  Serial.printf("[WATER]  ADC: %d | Coverage: %.1f%% | Status: %s\n",
                waterRaw, waterCoveragePercent, (waterCalibrationValid ? (waterCoveragePercent > WATER_WARNING_PERCENT ? "WARNING" : "DRY") : "NOT CALIBRATED"));
  Serial.printf("[GPS]    Status: %s | Lat: %.6f | Lng: %.6f | Sats: %lu\n",
                (gpsFixValid ? "3D FIXED" : "SEARCHING"), (gpsFixValid ? gps.location.lat() : 0.0), (gpsFixValid ? gps.location.lng() : 0.0), (unsigned long)gps.satellites.value());
  Serial.printf("[GATES]  In: %lu | Out: %lu | Onboard Passengers: %lu\n",
                (unsigned long)totalEntries, (unsigned long)totalExits, (unsigned long)passengerCount);
  Serial.println("================================================");
}

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n================================================");
  Serial.println(" AIoT SMART LAUNCH RISK ASSESSMENT - STARTING");
  Serial.println("================================================");

  // Buzzer GPIO 27 (NPN Driver)
  pinMode(BUZZER_PIN, OUTPUT);
  setBuzzer(false);

  // Water ADC (GPIO 34)
  analogReadResolution(12);
  analogSetPinAttenuation(WATER_ANALOG_PIN, ADC_11db);

  // HC-SR04 Pins (Entry: 32/33, Exit: 13/14)
  pinMode(ENTRY_TRIG_PIN, OUTPUT);
  pinMode(ENTRY_ECHO_PIN, INPUT);
  pinMode(EXIT_TRIG_PIN, OUTPUT);
  pinMode(EXIT_ECHO_PIN, INPUT);
  digitalWrite(ENTRY_TRIG_PIN, LOW);
  digitalWrite(EXIT_TRIG_PIN, LOW);

  // Load saved water calibration and passenger counters
  loadSavedData();
  Serial.printf("Saved passenger data loaded: %d passengers onboard.\n", passengerCount);

  // GPS UART2 on GPIO 16 (RX2) and GPIO 17 (TX2)
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("GPS UART2 initialized on GPIO16/17 at 9600 baud.");

  // MPU6050 (I2C on GPIO 21/22)
  Serial.println("Initializing MPU6050 on I2C (SDA=21, SCL=22)...");
  if (!initializeMPU()) {
    Serial.println("WARNING: MPU6050 not detected at 0x68. Check wiring.");
  } else {
    Serial.println("MPU6050 connected.");
    calibrateMPULevel();
  }

  // Left & Right HX711 Setup (Left: 19/18, Right: 25/26)
  leftScale.begin(LEFT_DT_PIN, LEFT_SCK_PIN);
  rightScale.begin(RIGHT_DT_PIN, RIGHT_SCK_PIN);

  Serial.println("Connecting Left HX711 (19/18)...");
  if (leftScale.wait_ready_timeout(2500)) {
    leftScale.set_scale(LEFT_CALIBRATION_FACTOR);
    leftScale.tare(20);
    leftScaleValid = true;
    Serial.println("Left HX711 ready and tared.");
  } else {
    Serial.println("WARNING: Left HX711 not ready.");
  }

  Serial.println("Connecting Right HX711 (25/26)...");
  if (rightScale.wait_ready_timeout(2500)) {
    rightScale.set_scale(RIGHT_CALIBRATION_FACTOR);
    rightScale.tare(20);
    rightScaleValid = true;
    Serial.println("Right HX711 ready and tared.");
  } else {
    Serial.println("WARNING: Right HX711 not ready.");
  }

  // Initial water ADC
  waterRaw = readWaterRawAverage();
  lastWaterReadMs = millis();

  nextGatePing = PING_ENTRY;
  nextGatePingAtMs = millis() + 500;

  // Start the ESP32's independent Wi-Fi hotspot and local dashboard.
  WiFi.mode(WIFI_AP);
  // Keep the AP responsive while sensors are being sampled.
  WiFi.setSleep(false);
  if (!WiFi.softAPConfig(ESP32_IP, GATEWAY_IP, SUBNET_MASK)) {
    Serial.println("[WiFi] Failed to configure access-point IP");
  }
  if (!WiFi.softAP(WIFI_SSID, WIFI_PASSWORD)) {
    Serial.println("[WiFi] Access-point startup failed.");
  } else {
    Serial.printf("\n[WiFi] Hotspot: %s | Password: %s\n", WIFI_SSID, WIFI_PASSWORD);
    Serial.printf("[WiFi] Dashboard: http://%s/\n", WiFi.softAPIP().toString().c_str());
  }
  setupWebServer();

  Serial.println("\nALL SENSORS INITIALIZED.");
  Serial.println("SERIAL COMMANDS AVAILABLE:");
  Serial.println("  'd' = Water DRY calibration");
  Serial.println("  'w' = Water WET calibration");
  Serial.println("  't' = Tare both load cells");
  Serial.println("  'm' = Recalibrate MPU level");
  Serial.println("  'z' = Reset passenger count");
  Serial.println("================================================");
}

// ============================================================
// MAIN LOOP
// ============================================================
void loop() {
  // Serve dashboard requests without blocking sensor processing.
  webServer.handleClient();
  const uint8_t connectedStations = WiFi.softAPgetStationNum();
  if (connectedStations != lastConnectedStations) {
    lastConnectedStations = connectedStations;
    Serial.printf("[WiFi] Connected devices: %u\n", connectedStations);
  }

  // 1. GPS stream
  updateGPS();

  // 2. Serial commands from USB Serial Monitor
  handleSerialCommands();

  // 3. Read Left & Right Load Cells
  if (leftScale.is_ready()) {
    leftWeightG = leftScale.get_units(1);
    lastLeftScaleReadMs = millis();
  }
  if (rightScale.is_ready()) {
    rightWeightG = rightScale.get_units(1);
    lastRightScaleReadMs = millis();
  }
  leftScaleValid = (millis() - lastLeftScaleReadMs < 1500UL);
  rightScaleValid = (millis() - lastRightScaleReadMs < 1500UL);

  if (fabs(leftWeightG) < WEIGHT_ZERO_DEADBAND_G) leftWeightG = 0.0f;
  if (fabs(rightWeightG) < WEIGHT_ZERO_DEADBAND_G) rightWeightG = 0.0f;

  // 4. MPU6050
  updateMPU();

  // 5. Water sensor
  updateWaterSensor();

  // 6. HC-SR04 alternating gates
  updatePassengerGates();

  // 7. Alert calculation for Buzzer (GPIO 27 NPN)
  const float totalWeightG = leftWeightG + rightWeightG;
  const float differenceG = fabs(leftWeightG - rightWeightG);
  const bool validDistribution = leftScaleValid && rightScaleValid &&
      leftWeightG >= 0.0f && rightWeightG >= 0.0f && totalWeightG >= NO_LOAD_THRESHOLD_G;

  float imbalancePercent = 0.0f;
  if (validDistribution) {
    imbalancePercent = (differenceG / totalWeightG) * 100.0f;
  }

  const bool capacityReached = leftScaleValid && rightScaleValid &&
      (leftWeightG >= LOAD_CELL_CAPACITY_G || rightWeightG >= LOAD_CELL_CAPACITY_G);
  const bool nearCapacity = leftScaleValid && rightScaleValid &&
      (leftWeightG >= LOAD_CELL_WARNING_G || rightWeightG >= LOAD_CELL_WARNING_G);

  const bool detectedWater = waterCalibrationValid && (waterCoveragePercent >= WATER_DETECT_PERCENT);
  const bool warningWater = waterCalibrationValid && (waterCoveragePercent >= WATER_WARNING_PERCENT);
  const bool criticalWater = waterCalibrationValid && (waterCoveragePercent >= WATER_CRITICAL_PERCENT);

  const bool warningTilt = mpuValid && (fabs(rollDeg) >= TILT_WARNING_DEG || fabs(pitchDeg) >= TILT_WARNING_DEG);
  const bool criticalTilt = mpuValid && (fabs(rollDeg) >= TILT_CRITICAL_DEG || fabs(pitchDeg) >= TILT_CRITICAL_DEG);

  const bool warningImbalance = validDistribution && (imbalancePercent >= IMBALANCE_WARNING_PERCENT);
  const bool criticalImbalance = validDistribution && (imbalancePercent >= IMBALANCE_CRITICAL_PERCENT);

  const bool criticalAlert = criticalWater || criticalTilt || criticalImbalance || capacityReached;
  const bool warningAlert = warningWater || warningTilt || warningImbalance || nearCapacity;

  updateBuzzer(criticalAlert, warningAlert, detectedWater);

  // 8. Transmit live telemetry to Web Server via HTTP REST POST
  sendTelemetryToWebServer();

  // 9. Serial output once per second
  printMonitoringData();

  delay(2);
}
