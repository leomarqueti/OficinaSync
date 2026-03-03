/*
  OficinaSync OBD -- Firmware v4 FINAL (TCC)
  
  Combina:
  OK Base do codigo antigo que funcionava (setPin 2 args, nome "OBDII")
  OK Correcoes BT: esp_task_wdt_reset + resposta HTTP antes do bloqueio
  OK Provisionamento Wi-Fi via AP (sem senha hardcoded)
  OK Admin Key gerada no 1o boot (seguranca basica)
  OK Modo AP fallback automatico se Wi-Fi falhar
  OK Endpoints /snapshot.json e /bt_raw para diagnostico
  OK Parser DTC corrigido (4 bytes por codigo)
  OK UI completa com graficos, cards coloridos e dicionario DTC

  Bibliotecas necessarias:
  - ESP32 by Espressif Systems (Board Manager)
  - ELMduino (Library Manager)
*/

#include <WiFi.h>
#include <WebServer.h>
#include <BluetoothSerial.h>
#include <Preferences.h>
#include <vector>
#include <math.h>
#include "ELMduino.h"
#include "esp_task_wdt.h"

// =========================
// CONFIG GERAL
// =========================
#define LED_PIN 2
static const uint16_t HTTP_PORT      = 80;
static const uint32_t WIFI_TIMEOUT   = 9000;
static const uint32_t WIFI_RETRY_MS  = 8000;
static const uint32_t BT_RETRY_MS    = 5000;
static const uint8_t  ADMIN_KEY_LEN  = 10;
static const uint8_t  AP_PASS_LEN    = 10;

// Intervalos de leitura OBD
static const uint32_t READ_INTERVAL  = 200;
static const uint32_t SLOW_INTERVAL  = 1000;
static const uint32_t TRIM_INTERVAL  = 1500;

// =========================
// OBJETOS
// =========================
WebServer      server(HTTP_PORT);
BluetoothSerial SerialBT;
ELM327         myELM327;
Preferences    prefs;

// =========================
// ESTADOS
// =========================
bool wifiOK  = false;
bool apMode  = false;
bool btOK    = false;
bool elmOK   = false;
bool carOK   = false;
bool busyDTC = false;
bool btAutoReconnect = false;

// =========================
// CONFIG NVS
// =========================
String wifiSsid     = "";
String wifiPass     = "";
String btDeviceName = "OBDII";   // nome padrao -- mais confiavel que MAC
String btPinCode    = "1234";
String adminKey     = "";
String apPass       = "";

// =========================
// DADOS OBD
// =========================
float g_rpm = NAN, g_speed = NAN, g_temp = NAN;
float g_load = NAN, g_throttle = NAN, g_iat = NAN;
float g_maf = NAN, g_fuel = NAN, g_volts = NAN;
float g_map_kpa = NAN, g_barokpa = NAN, g_timing = NAN;
float g_stft1 = NAN, g_ltft1 = NAN, g_stft2 = NAN, g_ltft2 = NAN;

// =========================
// TIMERS
// =========================
uint32_t lastRead        = 0;
uint32_t lastSlowRead    = 0;
uint32_t lastTrimRead    = 0;
uint32_t lastWiFiAttempt = 0;
uint32_t lastBtAttempt   = 0;
uint32_t lastBlink       = 0;
bool     ledState        = false;

// =========================
// UTIL
// =========================
String randomAlphaNum(uint8_t len) {
  static const char* A = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const size_t n = strlen(A);
  String s; s.reserve(len);
  for (uint8_t i = 0; i < len; i++) s += A[(uint32_t)esp_random() % n];
  return s;
}

String makeDeviceSuffix() {
  uint64_t mac = ESP.getEfuseMac();
  String t = String((uint32_t)(mac & 0xFFFFFFFF), HEX);
  t.toUpperCase();
  return t.substring(0, 6);
}

String makeApName() { return "OficinaSync-OBD-" + makeDeviceSuffix(); }

String htmlEscape(const String& in) {
  String o; o.reserve(in.length() + 16);
  for (char c : in) {
    switch (c) {
      case '&': o += "&amp;";  break;
      case '<': o += "&lt;";   break;
      case '>': o += "&gt;";   break;
      case '"': o += "&quot;"; break;
      default:  o += c;
    }
  }
  return o;
}

// =========================
// NVS
// =========================
void loadConfig() {
  prefs.begin("obd", true);
  wifiSsid = prefs.getString("wifi_ssid", "");
  wifiPass = prefs.getString("wifi_pass", "");
  adminKey = prefs.getString("admin_key", "");
  apPass   = prefs.getString("ap_pass",   "");
  prefs.end();

  if (adminKey.length() == 0) {
    adminKey = randomAlphaNum(ADMIN_KEY_LEN);
    prefs.begin("obd", false); prefs.putString("admin_key", adminKey); prefs.end();
  }
  if (apPass.length() == 0) {
    apPass = randomAlphaNum(AP_PASS_LEN);
    prefs.begin("obd", false); prefs.putString("ap_pass", apPass); prefs.end();
  }
}

void saveWiFi(const String& ssid, const String& pass) {
  prefs.begin("obd", false);
  prefs.putString("wifi_ssid", ssid);
  prefs.putString("wifi_pass", pass);
  prefs.end();
  wifiSsid = ssid; wifiPass = pass;
}

void factoryReset() {
  prefs.begin("obd", false); prefs.clear(); prefs.end();
  delay(250); ESP.restart();
}

// =========================
// SEGURANCA
// =========================
bool isAdmin() {
  String hk = server.header("X-Admin-Key");
  String qk = server.hasArg("key") ? server.arg("key") : "";
  return (hk.length() && hk == adminKey) || (qk.length() && qk == adminKey);
}

// =========================
// WIFI
// =========================
bool connectWiFiBlocking(uint32_t timeoutMs) {
  if (!wifiSsid.length()) return false;
  apMode = false;
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) delay(200);
  wifiOK = (WiFi.status() == WL_CONNECTED);
  if (wifiOK) {
    Serial.println("[WiFi] Conectado!");
    Serial.print("[WiFi] IP: "); Serial.println(WiFi.localIP());
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, HIGH);
  }
  return wifiOK;
}

void startAPMode() {
  apMode = true; wifiOK = false;
  WiFi.mode(WIFI_AP);
  String apName = makeApName();
  WiFi.softAP(apName.c_str(), apPass.c_str());
  delay(200);
  Serial.println("[AP] Modo AP ativo");
  Serial.print("[AP] SSID: "); Serial.println(apName);
  Serial.print("[AP] PASS: "); Serial.println(apPass);
  Serial.print("[AP] IP:   "); Serial.println(WiFi.softAPIP());
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);
}

void wifiKeepAlive() {
  if (apMode) return;
  if (wifiOK && WiFi.status() == WL_CONNECTED) return;
  wifiOK = false;
  if (millis() - lastWiFiAttempt < WIFI_RETRY_MS) return;
  lastWiFiAttempt = millis();
  Serial.println("[WiFi] Tentando reconectar...");
  WiFi.disconnect();
  if (!connectWiFiBlocking(6000)) { Serial.println("[WiFi] Falhou. AP mode."); startAPMode(); }
}

// =========================
// ELM RAW
// =========================
String elmSendRaw(const String& cmd, uint32_t timeoutMs = 2000) {
  String full = cmd;
  if (!full.endsWith("\r")) full += "\r";
  while (SerialBT.available()) SerialBT.read();
  SerialBT.print(full);
  uint32_t start = millis();
  String resp;
  while (millis() - start < timeoutMs) {
    while (SerialBT.available()) {
      char c = (char)SerialBT.read();
      if (c == '>') return resp;
      resp += c;
    }
    delay(5);
  }
  return resp;
}

// OK Parser corrigido: 4 hex chars = 2 bytes = 1 DTC
void parseDTCResponse(const String& hex, std::vector<String>& out) {
  String s; s.reserve(hex.length());
  for (char c : hex) if (isxdigit((unsigned char)c)) s += (char)toupper(c);
  int i = 0;
  while (i + 1 < (int)s.length()) {
    if (s.substring(i, i + 2) == "43") { i += 2; break; }
    i++;
  }
  while (i + 4 <= (int)s.length()) {
    uint8_t A = (uint8_t)strtoul(s.substring(i,   i+2).c_str(), nullptr, 16);
    uint8_t B = (uint8_t)strtoul(s.substring(i+2, i+4).c_str(), nullptr, 16);
    i += 4;
    if (A == 0 && B == 0) continue;
    char sysChar;
    switch ((A & 0xC0) >> 6) {
      case 0: sysChar = 'P'; break; case 1: sysChar = 'C'; break;
      case 2: sysChar = 'B'; break; default: sysChar = 'U';
    }
    char code[6];
    snprintf(code, sizeof(code), "%c%01u%01X%02X", sysChar, (A>>4)&0x3, A&0x0F, B);
    out.push_back(String(code));
  }
}

bool isValidVoltage(float v) { return !isnan(v) && v >= 9.0 && v <= 16.5; }

// =========================
// BLUETOOTH + ELM
// =========================

// CORRECAO PRINCIPAL: WiFi.setSleep(true) libera o radio para o BT usar
bool connectBluetooth(String name, String pin) {
  Serial.println("[BT] Iniciando conexao...");

  // Encerra BT anterior se houver
  SerialBT.end();
  delay(500);

  // CRITICO: permite que Wi-Fi e BT compartilhem o radio sem crash
  WiFi.setSleep(true);
  delay(200);

  if (!SerialBT.begin("ESP32-OBD", true)) {
    Serial.println("[BT] ERRO: falha ao iniciar modo master");
    WiFi.setSleep(false);
    return false;
  }

  SerialBT.setPin(pin.c_str());
  delay(300);

  bool connected = false;

  if (name.length() == 17 && name.charAt(2) == ':' && name.charAt(5) == ':' &&
      name.charAt(8) == ':' && name.charAt(11) == ':' && name.charAt(14) == ':') {
    uint8_t mac[6];
    if (sscanf(name.c_str(), "%hhx:%hhx:%hhx:%hhx:%hhx:%hhx",
               &mac[0],&mac[1],&mac[2],&mac[3],&mac[4],&mac[5]) == 6) {
      Serial.println("[BT] Tentando por MAC: " + name);
      esp_task_wdt_reset();
      connected = SerialBT.connect(mac);
      esp_task_wdt_reset();
    }
  } else {
    Serial.println("[BT] Tentando por nome: " + name);
    esp_task_wdt_reset();
    connected = SerialBT.connect(name.c_str());
    esp_task_wdt_reset();
  }

  btOK = connected && SerialBT.connected();
  Serial.println(btOK
    ? "[BT] Conectado!"
    : "[BT] Falhou. Verifique: dongle ligado? Celular desconectado? PIN correto?");
  return btOK;
}

bool connectELM327() {
  Serial.println("[ELM] Inicializando...");
  elmOK = myELM327.begin(SerialBT, true, 2000);
  if (elmOK) {
    delay(200);
    String ati  = elmSendRaw("ATI",  1500); ati.trim();
    String atrv = elmSendRaw("ATRV", 1500); atrv.trim();
    String atdp = elmSendRaw("ATDP", 1500); atdp.trim();
    Serial.println("[ELM] ATI:  " + ati);
    Serial.println("[ELM] ATRV: " + atrv);
    Serial.println("[ELM] ATDP: " + atdp);
    Serial.println("[ELM] Pronto!");
  } else {
    Serial.println("[ELM] Falhou.");
  }
  return elmOK;
}

void disconnectBT() {
  SerialBT.disconnect();
  SerialBT.end();
  btOK = false; elmOK = false; btAutoReconnect = false;
  WiFi.setSleep(false); // restaura performance do Wi-Fi
}

void btKeepAlive() {
  if (btOK && SerialBT.connected()) return;
  if (btOK && !SerialBT.connected()) { btOK = false; elmOK = false; }
  if (!btAutoReconnect) return;
  if (millis() - lastBtAttempt < BT_RETRY_MS) return;
  lastBtAttempt = millis();
  Serial.println("[BT] Tentando reconectar...");
  if (connectBluetooth(btDeviceName, btPinCode)) connectELM327();
}

// =========================
// OBD READ
// =========================
void readOBD() {
  if (busyDTC) return;

  float r    = myELM327.rpm();               if (!isnan(r)    && r    >= 0)  g_rpm      = r;
  float s    = myELM327.kph();               if (!isnan(s)    && s    >= 0)  g_speed    = s;
  float t    = myELM327.engineCoolantTemp(); if (!isnan(t)    && t    > -40) g_temp     = t;
  float load = myELM327.engineLoad();        if (!isnan(load) && load >= 0)  g_load     = load;
  float thr  = myELM327.throttle();          if (!isnan(thr)  && thr  >= 0)  g_throttle = thr;
  float iat  = myELM327.intakeAirTemp();     if (!isnan(iat))                g_iat      = iat;

  if (millis() - lastSlowRead > SLOW_INTERVAL) {
    lastSlowRead = millis();
    float maf  = myELM327.mafRate();   if (!isnan(maf)  && maf  >= 0) g_maf  = maf;
    float fuel = myELM327.fuelLevel(); if (!isnan(fuel) && fuel >= 0) g_fuel = fuel;
    String v = elmSendRaw("ATRV", 1500); v.trim();
    String only;
    for (char c : v) if (isdigit((unsigned char)c) || c == '.') only += c;
    if (only.length()) g_volts = only.toFloat();
  }

  if (millis() - lastTrimRead > TRIM_INTERVAL) {
    lastTrimRead = millis();
    float map  = myELM327.manifoldPressure();       if (!isnan(map))  g_map_kpa = map;
    float baro = myELM327.absBaroPressure();              if (!isnan(baro)) g_barokpa = baro;
    float adv  = myELM327.timingAdvance();                if (!isnan(adv))  g_timing  = adv;
    float s1   = myELM327.shortTermFuelTrimBank_1();      if (!isnan(s1))   g_stft1   = s1;
    float l1   = myELM327.longTermFuelTrimBank_1();       if (!isnan(l1))   g_ltft1   = l1;
    float s2   = myELM327.shortTermFuelTrimBank_2();      if (!isnan(s2))   g_stft2   = s2;
    float l2   = myELM327.longTermFuelTrimBank_2();       if (!isnan(l2))   g_ltft2   = l2;
  }

  carOK = !(isnan(g_rpm) && isnan(g_speed) && isnan(g_temp));
}

// =========================
// PAGINAS HTML
// =========================
String setupPage() {
  String ip     = apMode ? WiFi.softAPIP().toString() : WiFi.localIP().toString();
  String apName = makeApName();
  return
    "<!doctype html><html><head><meta charset='utf-8'/>"
    "<meta name='viewport' content='width=device-width,initial-scale=1'/>"
    "<title>Setup Wi-Fi</title>"
    "<style>body{font-family:system-ui;background:#0f0f11;color:#eaecef;padding:20px}"
    ".card{max-width:560px;margin:auto;background:#1a1c1f;border:1px solid #2a2d31;border-radius:16px;padding:16px}"
    "input,button{width:100%;padding:12px;border-radius:10px;border:1px solid #2a2d31;background:#121317;color:#eaecef;margin:6px 0}"
    "small{color:#8a8f98;display:block;margin:4px 0}hr{border-color:#2a2d31}</style></head><body>"
    "<div class='card'><h2>Configurar Wi-Fi</h2>"
    "<small>IP atual: " + ip + "</small>"
    "<small>AP: <b>" + apName + "</b> | Senha AP: <b>" + apPass + "</b></small>"
    "<small>Admin Key (anote!): <b>" + adminKey + "</b></small>"
    "<form method='POST' action='/setup'>"
    "<label>SSID</label><input name='ssid' value='" + htmlEscape(wifiSsid) + "' placeholder='Nome da rede'/>"
    "<label>Senha</label><input name='pass' type='password' value='" + htmlEscape(wifiPass) + "'/>"
    "<label>Admin Key</label><input name='key' placeholder='Cole a Admin Key aqui'/>"
    "<button type='submit'>Salvar e Reiniciar</button></form>"
    "<hr/><form method='POST' action='/wipe'>"
    "<label>Factory Reset</label><input name='key' placeholder='Admin Key'/>"
    "<button type='submit' style='background:#3a1a1a'>APAGAR TUDO E REINICIAR</button></form>"
    "<div style='margin-top:12px'><a href='/' style='color:#eaecef'><- Voltar</a></div>"
    "</div></body></html>";
}

const char* PAGE_HTML =
  "\n"
  "<!DOCTYPE html><html lang=\"pt-br\">\n"
  "<head><meta charset=\"utf-8\"/>\n"
  "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/>\n"
  "<title>ESP32 OBD Monitor</title>\n"
  "<style>\n"
  ":root{--bg:#0f0f11;--panel:#1a1c1f;--muted:#8a8f98;--ok:#27d17f;--warn:#ffb020;--bad:#ff5d5d;--card:#17181b;--stroke:#2a2d31}\n"
  "*{box-sizing:border-box}\n"
  "body{margin:0;background:var(--bg);color:#eaecef;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial}\n"
  ".wrapper{padding:20px;max-width:1250px;margin:auto}\n"
  ".topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}\n"
  ".topbar a{color:#eaecef;font-size:14px;margin-left:14px;text-decoration:none;opacity:.7}\n"
  ".topbar a:hover{opacity:1}\n"
  ".grid{display:grid;grid-template-columns:300px 1fr;gap:18px}\n"
  ".panel{background:var(--panel);border:1px solid var(--stroke);border-radius:18px;padding:14px}\n"
  "h1{font-weight:700;margin:0 0 14px;font-size:20px}\n"
  ".status .row{display:flex;justify-content:space-between;padding:8px 10px;border-radius:12px;background:var(--card);margin-bottom:8px;border:1px dashed var(--stroke)}\n"
  ".badge{font-weight:700}.ok{color:var(--ok)}.nok{color:var(--bad)}\n"
  "small{color:var(--muted)}\n"
  ".form-bt{display:grid;grid-template-columns:1fr 100px;gap:8px;margin-bottom:8px}\n"
  ".form-bt2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}\n"
  "input,button{border-radius:12px;border:1px solid var(--stroke);background:#121317;color:#eaecef;padding:10px;font-size:14px}\n"
  "button{cursor:pointer}button.primary{background:#2b2f37}\n"
  ".cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}\n"
  ".card{background:var(--card);border:1px solid var(--stroke);border-radius:22px;padding:18px;display:flex;flex-direction:column;justify-content:space-between;min-height:150px;transition:box-shadow .2s}\n"
  ".card h3{margin:0 0 10px;font-weight:700}.big{font-size:44px;line-height:1.1;font-weight:800}\n"
  ".label{font-size:13px;color:var(--muted)}\n"
  ".card.ok{box-shadow:0 0 0 2px var(--ok) inset}\n"
  ".card.warn{box-shadow:0 0 0 2px var(--warn) inset}\n"
  ".card.bad{box-shadow:0 0 0 2px var(--bad) inset}\n"
  ".kv{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}\n"
  ".kv .item{background:#0f1013;border:1px solid var(--stroke);border-radius:12px;padding:10px;font-size:14px}\n"
  ".kv .item b{display:block;font-size:12px;color:var(--muted);margin-bottom:6px}\n"
  ".list{background:#0f1013;border:1px solid var(--stroke);border-radius:14px;padding:10px;height:110px;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas;font-size:13px}\n"
  ".charts{display:grid;gap:16px;margin-top:16px}\n"
  ".chart-card{background:var(--card);border:1px solid var(--stroke);border-radius:18px;padding:12px}\n"
  "canvas{width:100%;height:200px}\n"
  "@media(max-width:1100px){.grid{grid-template-columns:1fr}.cards{grid-template-columns:1fr}}\n"
  "</style>\n"
  "</head><body>\n"
  "<div class=\"wrapper\">\n"
  "  <div class=\"topbar\">\n"
  "    <h2 style=\"margin:0\">OficinaSync OBD</h2>\n"
  "    <div>\n"
  "      <a href=\"/setup\"> Setup Wi-Fi</a>\n"
  "      <a href=\"/snapshot.json\" target=\"_blank\"> Snapshot</a>\n"
  "    </div>\n"
  "  </div>\n"
  "\n"
  "  <div class=\"grid\">\n"
  "    <!-- ESQUERDA -->\n"
  "    <div class=\"panel\">\n"
  "      <h1>Conexao Bluetooth</h1>\n"
  "      <div class=\"form-bt\">\n"
  "        <input id=\"dev\" placeholder=\"Nome ou MAC\" value=\"OBDII\"/>\n"
  "        <input id=\"pin\" placeholder=\"PIN\" value=\"1234\"/>\n"
  "      </div>\n"
  "      <div class=\"form-bt2\">\n"
  "        <button class=\"primary\" onclick=\"conectar()\">Conectar</button>\n"
  "        <button onclick=\"desconectar()\">Desconectar</button>\n"
  "      </div>\n"
  "\n"
  "      <div class=\"status\">\n"
  "        <div class=\"row\">Wi-Fi/AP <span class=\"badge\" id=\"wifi\">...</span></div>\n"
  "        <div class=\"row\">Bluetooth <span class=\"badge\" id=\"bt\">...</span></div>\n"
  "        <div class=\"row\">ELM327 <span class=\"badge\" id=\"elm\">...</span></div>\n"
  "        <div class=\"row\">Carro <span class=\"badge\" id=\"car\">...</span></div>\n"
  "        <div class=\"row\">IP <span id=\"ip\" style=\"font-size:13px\">...</span></div>\n"
  "      </div>\n"
  "\n"
  "      <div style=\"margin-top:10px\"><small>Log:</small>\n"
  "        <div class=\"list\" id=\"log\">Aguardando...</div>\n"
  "      </div>\n"
  "\n"
  "      <div style=\"height:14px\"></div>\n"
  "      <h1>Codigos de Falha (DTC)</h1>\n"
  "      <div style=\"display:flex;gap:8px;margin-bottom:8px\">\n"
  "        <button onclick=\"lerDTC()\">Ler DTCs</button>\n"
  "        <button onclick=\"apagarDTC()\">Apagar DTCs</button>\n"
  "      </div>\n"
  "      <div class=\"list\" id=\"dtc_box\">--</div>\n"
  "\n"
  "      <div style=\"height:14px\"></div>\n"
  "      <h1>Dados Extras</h1>\n"
  "      <div class=\"kv\">\n"
  "        <div class=\"item\"><b>Carga motor</b><span id=\"load\">--</span></div>\n"
  "        <div class=\"item\"><b>Borboleta</b><span id=\"throttle\">--</span></div>\n"
  "        <div class=\"item\"><b>Temp. admissao</b><span id=\"iat\">--</span></div>\n"
  "        <div class=\"item\"><b>MAF</b><span id=\"maf\">--</span></div>\n"
  "        <div class=\"item\"><b>Combustivel</b><span id=\"fuel\">--</span></div>\n"
  "        <div class=\"item\"><b>Tensao ECU</b><span id=\"volts\">--</span></div>\n"
  "        <div class=\"item\"><b>MAP (kPa)</b><span id=\"map\">--</span></div>\n"
  "        <div class=\"item\"><b>BARO (kPa)</b><span id=\"baro\">--</span></div>\n"
  "        <div class=\"item\"><b>Avanco ign.</b><span id=\"timing\">--</span></div>\n"
  "        <div class=\"item\"><b>STFT B1</b><span id=\"stft1\">--</span></div>\n"
  "        <div class=\"item\"><b>LTFT B1</b><span id=\"ltft1\">--</span></div>\n"
  "        <div class=\"item\"><b>STFT B2</b><span id=\"stft2\">--</span></div>\n"
  "        <div class=\"item\"><b>LTFT B2</b><span id=\"ltft2\">--</span></div>\n"
  "      </div>\n"
  "    </div>\n"
  "\n"
  "    <!-- DIREITA -->\n"
  "    <div class=\"panel\">\n"
  "      <h1>Painel do Veiculo</h1>\n"
  "      <div class=\"cards\">\n"
  "        <div class=\"card\" id=\"card-temp\">\n"
  "          <div><div class=\"label\">Temperatura</div><h3>Refrigerante</h3></div>\n"
  "          <div class=\"big\" id=\"temp\">--</div>\n"
  "        </div>\n"
  "        <div class=\"card\" id=\"card-rpm\">\n"
  "          <div><div class=\"label\">Rotacao</div><h3>RPM</h3></div>\n"
  "          <div class=\"big\" id=\"rpm\">--</div>\n"
  "        </div>\n"
  "        <div class=\"card\" id=\"card-speed\">\n"
  "          <div><div class=\"label\">Velocidade</div><h3>km/h</h3></div>\n"
  "          <div class=\"big\" id=\"speed\">--</div>\n"
  "        </div>\n"
  "      </div>\n"
  "      <div class=\"charts\">\n"
  "        <div class=\"chart-card\"><b style=\"color:var(--muted)\">RPM</b><canvas id=\"cRPM\"></canvas></div>\n"
  "        <div class=\"chart-card\"><b style=\"color:var(--muted)\">Velocidade (km/h)</b><canvas id=\"cSpd\"></canvas></div>\n"
  "        <div class=\"chart-card\"><b style=\"color:var(--muted)\">Temperatura (oC)</b><canvas id=\"cTmp\"></canvas></div>\n"
  "      </div>\n"
  "    </div>\n"
  "  </div>\n"
  "</div>\n"
  "\n"
  "<script src=\"https://cdn.jsdelivr.net/npm/chart.js\"></script>\n"
  "<script>\n"
  "const DTC_DB={\n"
  "  P0100:\"MAF - mau funcionamento\",P0101:\"MAF - faixa/desempenho\",\n"
  "  P0115:\"Sensor temp. liquido\",P0171:\"Mistura pobre (B1)\",P0172:\"Mistura rica (B1)\",\n"
  "  P0300:\"Falha ignicao aleatoria\",P0301:\"Falha cilindro 1\",P0302:\"Falha cilindro 2\",\n"
  "  P0335:\"Sensor virabrequim\",P0340:\"Sensor comando\",P0401:\"EGR - fluxo insuficiente\",\n"
  "  P0420:\"Catalisador (B1)\",P0430:\"Catalisador (B2)\",P0442:\"EVAP - vazamento\",\n"
  "  P0700:\"Transmissao\",U0100:\"Perda com ECM/PCM\"\n"
  "};\n"
  "const explain=c=>DTC_DB[c]||({P:\"Powertrain\",C:\"Chassi\",B:\"Carroceria\",U:\"Rede\"}[c[0]]||\"--\");\n"
  "\n"
  "const setLog=t=>document.getElementById('log').textContent=t;\n"
  "function badge(id,ok){const e=document.getElementById(id);e.textContent=ok?'OK':'--';e.className='badge '+(ok?'ok':'nok');}\n"
  "function cardLevel(id,v,rOk,rWarn){\n"
  "  const e=document.getElementById(id);e.classList.remove('ok','warn','bad');\n"
  "  if(v==null||isNaN(v))return;\n"
  "  if(v>=rOk[0]&&v<=rOk[1])e.classList.add('ok');\n"
  "  else if(v>=rWarn[0]&&v<=rWarn[1])e.classList.add('warn');\n"
  "  else e.classList.add('bad');\n"
  "}\n"
  "\n"
  "function mkChart(id){\n"
  "  return new Chart(document.getElementById(id),{\n"
  "    type:'line',\n"
  "    data:{labels:[],datasets:[{data:[],fill:false,tension:0.25,borderColor:'#27d17f',pointRadius:0}]},\n"
  "    options:{animation:false,responsive:true,scales:{x:{display:false},y:{beginAtZero:true,grid:{color:'#2a2d31'}}},plugins:{legend:{display:false}}}\n"
  "  });\n"
  "}\n"
  "const cRPM=mkChart('cRPM'),cSpd=mkChart('cSpd'),cTmp=mkChart('cTmp');\n"
  "function push(chart,v,max=60){\n"
  "  chart.data.labels.push('');\n"
  "  chart.data.datasets[0].data.push(v??null);\n"
  "  if(chart.data.labels.length>max){chart.data.labels.shift();chart.data.datasets[0].data.shift();}\n"
  "  chart.update('none');\n"
  "}\n"
  "\n"
  "async function conectar(){\n"
  "  const dev=document.getElementById('dev').value.trim();\n"
  "  const pin=document.getElementById('pin').value.trim();\n"
  "  setLog('Conectando a \"'+dev+'\"... aguarde ~15s');\n"
  "  try{\n"
  "    const r=await fetch('/connect',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:`name=${encodeURIComponent(dev)}&pin=${encodeURIComponent(pin)}`});\n"
  "    setLog(await r.text());\n"
  "  }catch(e){setLog('Timeout -- verifique o status em alguns segundos.');}\n"
  "}\n"
  "\n"
  "async function desconectar(){\n"
  "  const r=await fetch('/disconnect',{method:'POST'});\n"
  "  setLog(await r.text());\n"
  "}\n"
  "\n"
  "async function lerDTC(){\n"
  "  document.getElementById('dtc_box').textContent='Lendo...';\n"
  "  const r=await fetch('/dtc').then(r=>r.json()).catch(()=>null);\n"
  "  if(!r||!r.ok){document.getElementById('dtc_box').textContent='Erro: '+(r?.err||'ELM nao conectado');return;}\n"
  "  document.getElementById('dtc_box').textContent=r.codes?.length?r.codes.map(c=>`${c} -- ${explain(c)}`).join('\\n'):'Nenhum DTC.';\n"
  "}\n"
  "\n"
  "async function apagarDTC(){\n"
  "  if(!confirm('Apagar todos os DTCs?'))return;\n"
  "  setLog('Apagando DTCs...');\n"
  "  const r=await fetch('/clear_dtc').then(r=>r.json()).catch(()=>null);\n"
  "  setLog(r?.ok?'DTCs apagados.':'Falhou ao apagar.');\n"
  "  lerDTC();\n"
  "}\n"
  "\n"
  "async function tick(){\n"
  "  const[s,d]=await Promise.all([\n"
  "    fetch('/status').then(r=>r.json()).catch(()=>null),\n"
  "    fetch('/data').then(r=>r.json()).catch(()=>null)\n"
  "  ]);\n"
  "  if(s){\n"
  "    const e=document.getElementById('wifi');\n"
  "    e.textContent=(s.wifi||s.ap)?'OK':'--';\n"
  "    e.className='badge '+((s.wifi||s.ap)?'ok':'nok');\n"
  "    badge('bt',s.bt);badge('elm',s.elm);badge('car',s.car);\n"
  "    document.getElementById('ip').textContent=s.ip+(s.ap?' (AP)':'');\n"
  "  }\n"
  "  if(d){\n"
  "    const rpm=d.rpm!=null?Number(d.rpm):null;\n"
  "    const spd=d.speed!=null?Number(d.speed):null;\n"
  "    const tmp=d.temp!=null?Number(d.temp):null;\n"
  "    document.getElementById('rpm').textContent  =rpm!=null?rpm+' rpm':'--';\n"
  "    document.getElementById('speed').textContent=spd!=null?spd+' km/h':'--';\n"
  "    document.getElementById('temp').textContent =tmp!=null?tmp+' oC':'--';\n"
  "    cardLevel('card-rpm',  rpm,[0,3000],[3000,5000]);\n"
  "    cardLevel('card-speed',spd,[0,80],  [80,120]);\n"
  "    cardLevel('card-temp', tmp,[0,95],  [95,105]);\n"
  "    push(cRPM,rpm);push(cSpd,spd);push(cTmp,tmp);\n"
  "    const set=(id,v,suf)=>{if(v!=null)document.getElementById(id).textContent=Number(v).toFixed(1)+suf;};\n"
  "    set('load',    d.load,     ' %');\n"
  "    set('throttle',d.throttle, ' %');\n"
  "    set('iat',     d.iat,      ' oC');\n"
  "    set('maf',     d.maf,      ' g/s');\n"
  "    set('fuel',    d.fuel,     ' %');\n"
  "    set('volts',   d.volts,    ' V');\n"
  "    set('map',     d.map,      '');\n"
  "    set('baro',    d.baro,     '');\n"
  "    set('timing',  d.timing,   ' o');\n"
  "    set('stft1',   d.stft1,    ' %');\n"
  "    set('ltft1',   d.ltft1,    ' %');\n"
  "    set('stft2',   d.stft2,    ' %');\n"
  "    set('ltft2',   d.ltft2,    ' %');\n"
  "  }\n"
  "}\n"
  "setInterval(tick,450);tick();\n"
  "</script>\n"
  "</body></html>\n"
  "\n";


// =========================
// HANDLERS
// =========================
void handleRoot()     { server.send(200, "text/html; charset=utf-8", PAGE_HTML); }
void handleSetupGet() { server.send(200, "text/html; charset=utf-8", setupPage()); }

void handleSetupPost() {
  if (server.arg("key") != adminKey) { server.send(403,"text/plain","Admin Key invalida."); return; }
  if (server.arg("ssid").length() < 1) { server.send(400,"text/plain","SSID vazio."); return; }
  saveWiFi(server.arg("ssid"), server.arg("pass"));
  server.send(200,"text/plain","Salvo. Reiniciando...");
  delay(400); ESP.restart();
}

void handleWipe() {
  if (server.arg("key") != adminKey) { server.send(403,"text/plain","Admin Key invalida."); return; }
  server.send(200,"text/plain","Apagando e reiniciando...");
  delay(400); factoryReset();
}

void handleStatus() {
  String ip = apMode ? WiFi.softAPIP().toString() : WiFi.localIP().toString();
  String j = "{";
  j += "\"wifi\":"  + String(wifiOK?"true":"false") + ",";
  j += "\"ap\":"    + String(apMode?"true":"false")  + ",";
  j += "\"bt\":"    + String(btOK?"true":"false")    + ",";
  j += "\"elm\":"   + String(elmOK?"true":"false")   + ",";
  j += "\"car\":"   + String(carOK?"true":"false")   + ",";
  j += "\"ip\":\"" + ip + "\"}";
  server.send(200, "application/json", j);
}

void handleData() {
  String j = "{";
  auto f = [&](const char* k, float v, int d) {
    j += "\""; j += k; j += "\":";
    j += isnan(v) ? "null" : String(v, d);
    j += ",";
  };
  f("rpm",g_rpm,0); f("speed",g_speed,0); f("temp",g_temp,0);
  f("load",g_load,1); f("throttle",g_throttle,1); f("iat",g_iat,0);
  f("maf",g_maf,1); f("fuel",g_fuel,1); f("volts",g_volts,1);
  f("map",g_map_kpa,0); f("baro",g_barokpa,0); f("timing",g_timing,1);
  f("stft1",g_stft1,1); f("ltft1",g_ltft1,1); f("stft2",g_stft2,1);
  j += "\"ltft2\":" + (isnan(g_ltft2)?String("null"):String(g_ltft2,1)) + "}";
  server.send(200, "application/json", j);
}

// OK Responde HTTP antes de bloquear no connect
void handleConnect() {
  if (!server.hasArg("name") || !server.hasArg("pin")) {
    server.send(400, "text/plain", "Parametros ausentes"); return;
  }
  btDeviceName    = server.arg("name");
  btPinCode       = server.arg("pin");
  btAutoReconnect = true;
  disconnectBT();
  delay(300);

  server.send(200, "text/plain", "Conectando... aguarde ~15s e verifique o status.");
  server.client().flush();
  delay(100);

  btOK  = connectBluetooth(btDeviceName, btPinCode);
  elmOK = btOK ? connectELM327() : false;

  if (btOK && elmOK) Serial.println("[OK] BT + ELM prontos!");
  else if (btOK)     Serial.println("[AVISO] BT OK mas ELM falhou");
  else               Serial.println("[ERRO] BT nao conectou");
}

void handleDisconnect() {
  disconnectBT();
  server.send(200, "text/plain", "Desconectado.");
}

void handleDTC() {
  if (!(btOK && elmOK)) {
    server.send(200,"application/json","{\"ok\":false,\"err\":\"ELM nao conectado\"}"); return;
  }
  busyDTC = true;
  elmSendRaw("ATS0");
  String resp = elmSendRaw("03", 3000);
  busyDTC = false;
  std::vector<String> codes;
  parseDTCResponse(resp, codes);
  String j = "{\"ok\":true,\"codes\":[";
  for (size_t i = 0; i < codes.size(); ++i) {
    j += "\"" + codes[i] + "\"";
    if (i + 1 < codes.size()) j += ",";
  }
  j += "]}";
  server.send(200, "application/json", j);
}

void handleClearDTC() {
  if (!(btOK && elmOK)) { server.send(200,"application/json","{\"ok\":false}"); return; }
  busyDTC = true;
  String resp = elmSendRaw("04", 3000);
  busyDTC = false;
  server.send(200,"application/json", String("{\"ok\":") + (resp.length()?"true":"false") + "}");
}

void handleSnapshot() {
  String ip = apMode ? WiFi.softAPIP().toString() : WiFi.localIP().toString();
  String j = "{";
  j += "\"wifi\":"  + String(wifiOK?"true":"false") + ",";
  j += "\"ap\":"    + String(apMode?"true":"false")  + ",";
  j += "\"bt\":"    + String(btOK?"true":"false")    + ",";
  j += "\"elm\":"   + String(elmOK?"true":"false")   + ",";
  j += "\"car\":"   + String(carOK?"true":"false")   + ",";
  j += "\"ip\":\"" + ip + "\",";
  j += "\"data\":{";
  j += "\"rpm\":"   + (isnan(g_rpm)?String("null"):String(g_rpm,0))   + ",";
  j += "\"speed\":" + (isnan(g_speed)?String("null"):String(g_speed,0)) + ",";
  j += "\"temp\":"  + (isnan(g_temp)?String("null"):String(g_temp,0)) + ",";
  j += "\"volts\":" + (isnan(g_volts)?String("null"):String(g_volts,1));
  j += "}}";
  server.send(200, "application/json", j);
}

// Diagnostico: testa comunicacao raw com o dongle
void handleBtRaw() {
  if (!btOK) { server.send(200,"text/plain","BT offline"); return; }
  String r = elmSendRaw("ATI", 2000); r.trim();
  server.send(200, "text/plain", r.length() ? r : "(sem resposta do dongle)");
}

// =========================
// SETUP / LOOP
// =========================
void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  loadConfig();

  Serial.println("====================================");
  Serial.println("OficinaSync OBD v4 -- TCC");
  Serial.print("Admin Key: "); Serial.println(adminKey);
  Serial.print("AP Pass:   "); Serial.println(apPass);
  Serial.println("====================================");

  if (!connectWiFiBlocking(WIFI_TIMEOUT)) startAPMode();

  server.on("/",            handleRoot);
  server.on("/setup",       HTTP_GET,  handleSetupGet);
  server.on("/setup",       HTTP_POST, handleSetupPost);
  server.on("/wipe",        HTTP_POST, handleWipe);
  server.on("/status",      handleStatus);
  server.on("/data",        handleData);
  server.on("/connect",     HTTP_POST, handleConnect);
  server.on("/disconnect",  HTTP_POST, handleDisconnect);
  server.on("/dtc",         handleDTC);
  server.on("/clear_dtc",   handleClearDTC);
  server.on("/snapshot.json", HTTP_GET, handleSnapshot);
  server.on("/bt_raw",      HTTP_GET,  handleBtRaw);
  server.begin();

  Serial.println("[HTTP] Servidor iniciado.");
  String ip = apMode ? WiFi.softAPIP().toString() : WiFi.localIP().toString();
  Serial.println("Acesse: http://" + ip);
}

void loop() {
  server.handleClient();
  wifiKeepAlive();
  btKeepAlive();

  if (btOK) {
    if (millis() - lastBlink > 450) {
      lastBlink = millis(); ledState = !ledState;
      digitalWrite(LED_PIN, ledState ? HIGH : LOW);
    }
  } else {
    digitalWrite(LED_PIN, (wifiOK || apMode) ? HIGH : LOW);
  }

  if (btOK && elmOK && !busyDTC && millis() - lastRead > READ_INTERVAL) {
    lastRead = millis();
    readOBD();
  }
}

/*
  COMO USAR:
  1a vez (sem Wi-Fi salvo):
    -> ESP cria AP "OficinaSync-OBD-XXXXXX"
    -> Senha do AP e Admin Key aparecem no Serial Monitor
    -> Conecta no AP -> abre http://192.168.4.1/setup
    -> Salva SSID + senha + Admin Key -> reinicia

  Com Wi-Fi salvo:
    -> Abre http://IP_DO_ESP
    -> Campo "Nome ou MAC": use "OBDII" (nome) ou "00:10:CC:4F:36:03" (MAC)
    -> PIN: 1234 -> clica Conectar -> aguarda ~15s
    -> BT + ELM devem ficar OK no status

  Diagnostico:
    -> /bt_raw    -- testa comunicacao raw (deve retornar "ELM327 vX.X")
    -> /snapshot.json -- dump completo do estado atual
*/
