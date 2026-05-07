#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <DHT.h>

#include "secrets.h"

const unsigned long SEND_INTERVAL_MS = 10000;

const int ONE_WIRE_BUS = 4;
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

const int DHT_PIN = 5;
DHT dht(DHT_PIN, DHT11);

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting with WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected. IP: ");
  Serial.println(WiFi.localIP());
}

float readTemperature() {
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);

  if (tempC == DEVICE_DISCONNECTED_C) {
    Serial.println("Error: DS18B20 sensor not responding");
    return NAN;
  }

  Serial.printf("Temperature: %.2f °C\n", tempC);
  return tempC;
}

float readHumidity() {
  float humidity = dht.readHumidity();

  if (isnan(humidity)) {
    Serial.println("Error: DHT11 sensor not responding");
    return NAN;
  }

  Serial.printf("Humidity: %.0f %%\n", humidity);
  return humidity;
}

void sendWeather() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("No WiFi - attempting to reconnect");
    connectWiFi();
    return;
  }

  float temperature = readTemperature();
  if (isnan(temperature)) {
    Serial.println("Skipping transmission - invalid temperature reading");
    return;
  }
  temperature = roundf(temperature * 100.0f) / 100.0f;

  float humidity = readHumidity();
  if (isnan(humidity)) {
    Serial.println("Skipping transmission - invalid humidity reading");
    return;
  }


  StaticJsonDocument<128> doc;
  doc["temperature"] = temperature;
  doc["humidity"]    = humidity;

  String payload;
  serializeJson(doc, payload);

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  Serial.print("POST ");
  Serial.println(SERVER_URL);
  Serial.println(payload);

  int code = http.POST(payload);

  if (code > 0) {
    Serial.printf("Response status code: %d\n", code);
    String response = http.getString();
    if (response.length()) {
      Serial.println(response);
    }
  } else {
    Serial.printf("Error: %s\n", http.errorToString(code).c_str());
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(500);

  sensors.begin();
  dht.begin();
  Serial.print("DS18B20 sensors detected: ");
  Serial.println(sensors.getDeviceCount());
  
  connectWiFi();
}

void loop() {
  static unsigned long lastSend = 0;
  if (millis() - lastSend >= SEND_INTERVAL_MS) {
    lastSend = millis();
    sendWeather();
  }
}
