#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include "secrets.h"

const unsigned long SEND_INTERVAL_MS = 10000;


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

void sendWeather() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("No WiFi - attempting to reconnect");
    connectWiFi();
    return;
  }

  StaticJsonDocument<128> doc;
  doc["temperature"] = 21.50;
  doc["humidity"]    = 51;

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

  connectWiFi();
}

void loop() {
  static unsigned long lastSend = 0;
  if (millis() - lastSend >= SEND_INTERVAL_MS) {
    lastSend = millis();
    sendWeather();
  }
}
