#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>

#include "secrets.h"

const unsigned long SEND_INTERVAL_MS = 10000;
const unsigned long DISPLAY_INTERVAL_MS = 1000;

const int ONE_WIRE_BUS = 4;
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

const int DHT_PIN = 5;
DHT dht(DHT_PIN, DHT11);

const int OLED_RESET= -1;
const uint8_t OLED_ADDRESS = 0x3C;
Adafruit_SH1106G display(128, 64, &Wire, OLED_RESET);

float lastTemperature = NAN;
float lastHumidity    = NAN;

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

void displayWeatherOnScreen(float temperature, float humidity) {
  char buf[24];

  display.clearDisplay();
  display.setTextColor(SH110X_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  if (isnan(temperature)) {
    display.print("Temperature: --");
  } else {
    snprintf(buf, sizeof(buf), "Temperature: %.2f", temperature);
    display.print(buf);
    int16_t x = display.getCursorX();
    int16_t y = display.getCursorY();
    display.drawCircle(x + 4, y + 1, 1, SH110X_WHITE);
    display.setCursor(x + 9, y);
    display.print("C");
  }

  display.setCursor(0, 25);
  if (isnan(humidity)) {
    display.print("Humidity: --");
  } else {
    snprintf(buf, sizeof(buf), "Humidity: %.0f %%", humidity);
    display.print(buf);
  }

  display.display();
}

void sendWeather() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("No WiFi - attempting to reconnect");
    connectWiFi();
    return;
  }

  if (isnan(lastTemperature)) {
    Serial.println("Skipping transmission - invalid temperature reading");
    return;
  }
  float temperature = roundf(lastTemperature * 100.0f) / 100.0f;

  if (isnan(lastHumidity)) {
    Serial.println("Skipping transmission - invalid humidity reading");
    return;
  }

  JsonDocument doc;
  doc["temperature"] = temperature;
  doc["humidity"]    = lastHumidity;

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

  Wire.begin(21, 22);
  display.begin(OLED_ADDRESS, true);
  display.clearDisplay();
  display.setTextColor(SH110X_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.display();

  sensors.begin();
  dht.begin();
  Serial.print("DS18B20 sensors detected: ");
  Serial.println(sensors.getDeviceCount());

  connectWiFi();
}

void loop() {
  static unsigned long lastRead = 0;
  static unsigned long lastSend = 0;
  unsigned long now = millis();

  if (now - lastRead >= DISPLAY_INTERVAL_MS) {
    lastRead = now;
    displayWeatherOnScreen(lastTemperature = readTemperature(), lastHumidity    = readHumidity());
  }

  if (now - lastSend >= SEND_INTERVAL_MS) {
    lastSend = now;
    sendWeather();
  }
}
