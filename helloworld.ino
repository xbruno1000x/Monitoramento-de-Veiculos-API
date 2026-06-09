#include <Arduino.h>
#include <TinyGPSPlus.h>

const int GPS_RX_PIN = 27; // RX do ESP32 <- TX do GPS
const int GPS_TX_PIN = 26; // TX do ESP32 -> RX do GPS
const uint32_t GPS_BAUD = 9600;

HardwareSerial GPSSerial(1);
TinyGPSPlus gps;

void setup() {
  Serial.begin(115200);
  GPSSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("GPS RAW TEST");
}

void loop() {
  while (GPSSerial.available()) {
    char c = GPSSerial.read();
    gps.encode(c);
  }

  if (gps.location.isUpdated()) {
    Serial.print("Lat: ");
    Serial.print(gps.location.lat(), 6);
    Serial.print("  Lon: ");
    Serial.println(gps.location.lng(), 6);
  }
}