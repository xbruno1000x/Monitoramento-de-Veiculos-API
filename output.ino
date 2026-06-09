#define MQTT_MAX_PACKET_SIZE 512

#include <WiFi.h>
#include <PubSubClient.h>
#include <TinyGPSPlus.h>
#include <ArduinoJson.h>
#include <time.h>

// --- Configuracao basica ---
const char* WIFI_SSID = "Bruno_WIFI";
const char* WIFI_PASS = "123456777";

// IP/porta do seu servidor local (na mesma rede do ESP32)
const char* MQTT_HOST = "192.168.3.3";
const uint16_t MQTT_PORT = 1883;

const char* VEICULO_ID = "HOB0898";

// GPS (NEO-6M) em Serial1 (alimentacao via 5V e GND)
const int GPS_RX_PIN = 27;
const int GPS_TX_PIN = 26;
const uint32_t GPS_BAUD = 9600;

const unsigned long SEND_INTERVAL_MS = 1000;
const unsigned long WIFI_RETRY_MS = 5000;
const unsigned long MQTT_RETRY_MS = 3000;
const unsigned long DEBUG_INTERVAL_MS = 2000;

TinyGPSPlus gps;
HardwareSerial GPSSerial(1);

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

unsigned long lastSendMs = 0;
unsigned long lastWifiAttemptMs = 0;
unsigned long lastMqttAttemptMs = 0;
unsigned long lastDebugMs = 0;
bool ntpStarted = false;

String topicDados;
String topicResposta;

void startNtpIfNeeded() {
	if (!ntpStarted && WiFi.status() == WL_CONNECTED) {
		configTime(0, 0, "pool.ntp.org", "time.nist.gov");
		ntpStarted = true;
	}
}

bool isTimeValid() {
	time_t now = time(nullptr);
	return now > 1700000000;
}

String isoTimestamp() {
	time_t now = time(nullptr);
	struct tm timeinfo;
	gmtime_r(&now, &timeinfo);
	char buf[25];
	strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
	return String(buf);
}

bool gpsTimeValid() {
	return gps.date.isValid() && gps.time.isValid() && gps.date.year() >= 2023;
}

String gpsIsoTimestamp() {
	char buf[25];
	snprintf(
		buf,
		sizeof(buf),
		"%04d-%02d-%02dT%02d:%02d:%02dZ",
		gps.date.year(),
		gps.date.month(),
		gps.date.day(),
		gps.time.hour(),
		gps.time.minute(),
		gps.time.second()
	);
	return String(buf);
}

String buildTimestamp() {
	if (gpsTimeValid()) {
		return gpsIsoTimestamp();
	}

	if (isTimeValid()) {
		return isoTimestamp();
	}

	return String("1970-01-01T00:00:00Z");
}

void printDebugStatus() {
	Serial.print("WiFi: ");
	Serial.print(WiFi.status() == WL_CONNECTED ? "OK" : "OFF");
	Serial.print(" | MQTT: ");
	Serial.print(mqttClient.connected() ? "OK" : "OFF");
	Serial.print(" | GPS: ");
	Serial.print(gps.location.isValid() ? "FIX" : "NOFIX");
	Serial.print(" | Sat: ");
	Serial.print(gps.satellites.isValid() ? gps.satellites.value() : 0);
	Serial.print(" | Hora: ");
	Serial.println(gpsTimeValid() || isTimeValid() ? "OK" : "NO");
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
	StaticJsonDocument<256> doc;
	DeserializationError err = deserializeJson(doc, payload, length);
	if (err) {
		Serial.println("Resposta MQTT invalida");
		return;
	}

	bool alerta = doc["alerta"] | false;
	int limite = doc["limite_via"] | 0;
	const char* mensagem = doc["mensagem"] | "";

	Serial.print("Limite: ");
	Serial.print(limite);
	Serial.print(" km/h | Alerta: ");
	Serial.print(alerta ? "SIM" : "NAO");
	Serial.print(" | ");
	Serial.println(mensagem);
}

void ensureWifi() {
	if (WiFi.status() == WL_CONNECTED) return;
	if (millis() - lastWifiAttemptMs < WIFI_RETRY_MS) return;

	lastWifiAttemptMs = millis();
	Serial.println("Conectando WiFi...");
	WiFi.disconnect(true);
	WiFi.begin(WIFI_SSID, WIFI_PASS);
}

void ensureMqtt() {
	if (mqttClient.connected()) return;
	if (WiFi.status() != WL_CONNECTED) return;
	if (millis() - lastMqttAttemptMs < MQTT_RETRY_MS) return;

	lastMqttAttemptMs = millis();
	String clientId = "esp32-" + String((uint32_t)ESP.getEfuseMac(), HEX);

	Serial.println("Conectando MQTT...");
	if (mqttClient.connect(clientId.c_str())) {
		mqttClient.subscribe(topicResposta.c_str());
		Serial.println("MQTT conectado");
	} else {
		Serial.print("Falha MQTT, rc=");
		Serial.println(mqttClient.state());
	}
}

void publishDados(double lat, double lon, double velocidade) {
	StaticJsonDocument<256> doc;
	doc["veiculo_id"] = VEICULO_ID;
	doc["timestamp"] = buildTimestamp();
	doc["lat"] = lat;
	doc["lon"] = lon;
	doc["velocidade"] = velocidade;

	char out[256];
	size_t len = serializeJson(doc, out);

	bool ok = mqttClient.publish(topicDados.c_str(), out, len);
	if (!ok) {
		Serial.println("Falha ao publicar MQTT");
	}
}

void setup() {
	Serial.begin(115200);

	GPSSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

	WiFi.mode(WIFI_STA);
	WiFi.setAutoReconnect(true);
	WiFi.persistent(false);
	WiFi.begin(WIFI_SSID, WIFI_PASS);

	topicDados = String("veiculos/") + VEICULO_ID + "/dados";
	topicResposta = String("veiculos/") + VEICULO_ID + "/resposta";

	mqttClient.setServer(MQTT_HOST, MQTT_PORT);
	mqttClient.setCallback(onMqttMessage);
	mqttClient.setBufferSize(512);
}

void loop() {
	while (GPSSerial.available() > 0) {
		gps.encode(GPSSerial.read());
	}

	ensureWifi();
	startNtpIfNeeded();
	ensureMqtt();
	mqttClient.loop();

	if (millis() - lastDebugMs >= DEBUG_INTERVAL_MS) {
		lastDebugMs = millis();
		printDebugStatus();
	}

	if (!mqttClient.connected()) return;
	if (millis() - lastSendMs < SEND_INTERVAL_MS) return;
	lastSendMs = millis();

	if (!gps.location.isValid()) return;

	double lat = gps.location.lat();
	double lon = gps.location.lng();
	double velocidade = gps.speed.isValid() ? gps.speed.kmph() : 0.0;

	publishDados(lat, lon, velocidade);
}
