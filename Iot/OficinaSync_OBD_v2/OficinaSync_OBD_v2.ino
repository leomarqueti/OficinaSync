/*
  ============================================================
  OficinaSync OBD v2 — scanner conectado ao sistema
  ============================================================
  Evolução da v1: em vez de servir uma página local, o ESP32 é
  CLIENTE e EMPURRA os dados pra API do OficinaSync com um token
  de dispositivo (setup uma vez → plug-and-play pra sempre).

  Compatibilidade máxima de carros (prioridade do projeto):
  - ATSP0: protocolo AUTOMÁTICO — CAN 11/29-bit (carros 2010+),
    ISO 9141-2 e KWP2000 lento/rápido (frota BR antiga: Celta,
    Gol, Palio, Uno pré-2010), J1850 PWM/VPW.
  - ATAT2: timing adaptativo — K-line é lenta, timeout fixo curto
    era a causa clássica de "ELM falhou" na v1.
  - Fila de PIDs com desativação automática: carro que não tem
    MAF/nível de combustível/banco 2 não trava o ciclo — depois
    de N falhas seguidas o PID é pulado (libera o barramento
    lento pros que funcionam). UMA consulta pendente por vez.
  - Tensão via ATRV funciona em qualquer carro (é o pino 16).

  Fluxo:
  1ª vez: AP "OficinaSync-OBD-XXXX" → http://192.168.4.1/setup
          → Wi-Fi + token do dispositivo (gera na página Scanner
          do OficinaSync) + dongle (botão "Buscar dongles").
  Depois: liga → conecta Wi-Fi → conecta dongle salvo → empurra
          heartbeat (30s) + leitura (5s) → recebe comandos
          (ler/apagar códigos) na resposta do push.
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
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
static const uint16_t HTTP_PORT        = 80;
static const uint32_t WIFI_TIMEOUT     = 9000;
static const uint32_t WIFI_RETRY_MS    = 8000;
static const uint32_t BT_RETRY_MS      = 15000;
static const uint8_t  ADMIN_KEY_LEN    = 10;
static const uint8_t  AP_PASS_LEN      = 10;

// Push pra nuvem
static const uint32_t HEARTBEAT_MS     = 30000;  // sinal de vida
static const uint32_t READING_MS       = 5000;   // snapshot com carro conectado
static const uint32_t DTC_REFRESH_MS   = 60000;  // releitura periódica de códigos
static const uint32_t HTTP_TIMEOUT_MS  = 8000;

// Ciclo de leitura OBD
static const uint32_t PID_STEP_MS      = 60;     // passo da fila de PIDs
static const uint32_t VOLT_INTERVAL_MS = 5000;   // ATRV entre ciclos
static const uint8_t  PID_MAX_FAILS    = 8;      // falhas seguidas → PID desativado

// Bluetooth discovery
static const uint32_t BT_DISCOVER_MS   = 8000;

// =========================
// OBJETOS
// =========================
WebServer        server(HTTP_PORT);
BluetoothSerial  SerialBT;
ELM327           myELM327;
Preferences      prefs;
WiFiClientSecure secureClient;
WiFiClient       plainClient;

// =========================
// ESTADOS
// =========================
bool wifiOK  = false;
bool apMode  = false;
bool btOK    = false;
bool elmOK   = false;
bool carOK   = false;
bool busyDTC = false;

// =========================
// CONFIG NVS
// =========================
String wifiSsid     = "";
String wifiPass     = "";
String btDevice     = "";      // nome OU MAC do dongle (persistido!)
String btPin        = "1234";
String deviceToken  = "";      // gerado na página Scanner do OficinaSync
String apiUrl       = "https://api.oficinasync.com.br"; // http:// pra bancada
String adminKey     = "";
String apPass       = "";

// =========================
// DADOS OBD
// =========================
float g_volts = NAN;

// Fila de PIDs: uma consulta por vez (padrão robusto do ELMduino),
// com contagem de falhas pra desativar PIDs que o carro não suporta.
typedef float (*PidQueryFn)();
struct PidSlot {
  const char* key;
  PidQueryFn  query;
  float       value;
  uint8_t     fails;
  bool        enabled;
};

float q_rpm()      { return myELM327.rpm(); }
float q_speed()    { return myELM327.kph(); }
float q_temp()     { return myELM327.engineCoolantTemp(); }
float q_load()     { return myELM327.engineLoad(); }
float q_throttle() { return myELM327.throttle(); }
float q_iat()      { return myELM327.intakeAirTemp(); }
float q_maf()      { return myELM327.mafRate(); }
float q_fuel()     { return myELM327.fuelLevel(); }
float q_map()      { return myELM327.manifoldPressure(); }
float q_baro()     { return myELM327.absBaroPressure(); }
float q_timing()   { return myELM327.timingAdvance(); }
float q_stft1()    { return myELM327.shortTermFuelTrimBank_1(); }
float q_ltft1()    { return myELM327.longTermFuelTrimBank_1(); }
float q_stft2()    { return myELM327.shortTermFuelTrimBank_2(); }
float q_ltft2()    { return myELM327.longTermFuelTrimBank_2(); }

PidSlot pids[] = {
  // os essenciais primeiro (existem em praticamente todo carro OBD2)
  { "rpm",      q_rpm,      NAN, 0, true },
  { "speed",    q_speed,    NAN, 0, true },
  { "temp",     q_temp,     NAN, 0, true },
  { "load",     q_load,     NAN, 0, true },
  { "throttle", q_throttle, NAN, 0, true },
  { "iat",      q_iat,      NAN, 0, true },
  { "map",      q_map,      NAN, 0, true },
  { "timing",   q_timing,   NAN, 0, true },
  { "stft1",    q_stft1,    NAN, 0, true },
  { "ltft1",    q_ltft1,    NAN, 0, true },
  // os que carro antigo frequentemente NÃO tem — desativam sozinhos
  { "maf",      q_maf,      NAN, 0, true },
  { "fuel",     q_fuel,     NAN, 0, true },
  { "baro",     q_baro,     NAN, 0, true },
  { "stft2",    q_stft2,    NAN, 0, true },
  { "ltft2",    q_ltft2,    NAN, 0, true },
};
static const uint8_t PID_COUNT = sizeof(pids) / sizeof(pids[0]);
uint8_t pidIndex = 0;
bool    pidInFlight = false;

// Códigos de falha (cache — vai junto em todo push de leitura)
std::vector<String> g_dtcs;
bool g_dtcsValid = false;

// =========================
// TIMERS
// =========================
uint32_t lastWiFiAttempt = 0;
uint32_t lastBtAttempt   = 0;
uint32_t lastPidStep     = 0;
uint32_t lastVoltRead    = 0;
uint32_t lastHeartbeat   = 0;
uint32_t lastReadingPush = 0;
uint32_t lastDtcRefresh  = 0;
uint32_t lastBlink       = 0;
bool     ledState        = false;

// =========================
// ROOT CA — ISRG Root X1 (Let's Encrypt, válido até 2035)
// A API roda atrás do Caddy com certificado Let's Encrypt.
// =========================
static const char ISRG_ROOT_X1[] PROGMEM = R"CERT(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
)CERT";

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
  wifiSsid    = prefs.getString("wifi_ssid", "");
  wifiPass    = prefs.getString("wifi_pass", "");
  btDevice    = prefs.getString("bt_device", "");
  btPin       = prefs.getString("bt_pin", "1234");
  deviceToken = prefs.getString("dev_token", "");
  apiUrl      = prefs.getString("api_url", "https://api.oficinasync.com.br");
  adminKey    = prefs.getString("admin_key", "");
  apPass      = prefs.getString("ap_pass", "");
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

void saveConfig(const String& ssid, const String& pass, const String& token,
                const String& url, const String& bt, const String& pin) {
  prefs.begin("obd", false);
  prefs.putString("wifi_ssid", ssid);
  prefs.putString("wifi_pass", pass);
  prefs.putString("dev_token", token);
  prefs.putString("api_url",   url);
  prefs.putString("bt_device", bt);
  prefs.putString("bt_pin",    pin);
  prefs.end();
}

void factoryReset() {
  prefs.begin("obd", false); prefs.clear(); prefs.end();
  delay(250); ESP.restart();
}

// =========================
// WIFI
// =========================
bool connectWiFiBlocking(uint32_t timeoutMs) {
  if (!wifiSsid.length()) return false;
  apMode = false;
  WiFi.mode(WIFI_STA);
  // CRÍTICO pra coexistência com BT clássico: o rádio é compartilhado.
  WiFi.setSleep(true);
  WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) delay(200);
  wifiOK = (WiFi.status() == WL_CONNECTED);
  if (wifiOK) {
    Serial.println("[WiFi] Conectado! IP: " + WiFi.localIP().toString());
  }
  return wifiOK;
}

void startAPMode() {
  apMode = true; wifiOK = false;
  WiFi.mode(WIFI_AP);
  String apName = makeApName();
  WiFi.softAP(apName.c_str(), apPass.c_str());
  delay(200);
  Serial.println("[AP] SSID: " + apName + " | PASS: " + apPass +
                 " | IP: " + WiFi.softAPIP().toString());
}

void wifiKeepAlive() {
  if (apMode) return;
  if (wifiOK && WiFi.status() == WL_CONNECTED) return;
  wifiOK = false;
  if (millis() - lastWiFiAttempt < WIFI_RETRY_MS) return;
  lastWiFiAttempt = millis();
  Serial.println("[WiFi] Reconectando...");
  WiFi.disconnect();
  if (!connectWiFiBlocking(6000)) { Serial.println("[WiFi] Falhou. Modo AP."); startAPMode(); }
}

// =========================
// ELM RAW
// =========================
String elmSendRaw(const String& cmd, uint32_t timeoutMs = 3000) {
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

// Parser de DTC (modo 03): 4 hex = 2 bytes = 1 código. Tolerante a
// headers/eco: filtra só hex, acha o "43" de resposta e lê pares.
void parseDTCResponse(const String& raw, std::vector<String>& out) {
  String upper = raw;
  upper.toUpperCase();
  if (upper.indexOf("NO DATA") >= 0 || upper.indexOf("UNABLE") >= 0) return;

  String s; s.reserve(raw.length());
  for (char c : raw) if (isxdigit((unsigned char)c)) s += (char)toupper(c);

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
    // evita duplicado (respostas multi-frame podem repetir)
    bool dup = false;
    for (auto& existing : out) if (existing == String(code)) { dup = true; break; }
    if (!dup) out.push_back(String(code));
  }
}

void refreshDTCs() {
  if (!(btOK && elmOK)) return;
  busyDTC = true;
  elmSendRaw("ATS0", 1500);
  String resp = elmSendRaw("03", 6000); // K-line pode demorar
  busyDTC = false;
  g_dtcs.clear();
  parseDTCResponse(resp, g_dtcs);
  g_dtcsValid = true;
  Serial.printf("[DTC] %d codigo(s)\n", (int)g_dtcs.size());
}

void clearDTCs() {
  if (!(btOK && elmOK)) return;
  busyDTC = true;
  elmSendRaw("04", 6000);
  busyDTC = false;
  Serial.println("[DTC] Comando de limpeza enviado");
  delay(500);
  refreshDTCs();
}

// =========================
// BLUETOOTH + ELM
// =========================
bool connectBluetooth(const String& name, const String& pin) {
  Serial.println("[BT] Conectando a: " + name);
  SerialBT.end();
  delay(500);
  WiFi.setSleep(true); // libera o rádio pro BT (correção crítica da v1)
  delay(200);

  if (!SerialBT.begin("ESP32-OBD", true)) {
    Serial.println("[BT] ERRO ao iniciar modo master");
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
      esp_task_wdt_reset();
      connected = SerialBT.connect(mac);
      esp_task_wdt_reset();
    }
  } else {
    esp_task_wdt_reset();
    connected = SerialBT.connect(name.c_str());
    esp_task_wdt_reset();
  }

  btOK = connected && SerialBT.connected();
  Serial.println(btOK ? "[BT] Conectado!" : "[BT] Falhou.");
  return btOK;
}

bool connectELM327() {
  Serial.println("[ELM] Inicializando (protocolo AUTOMATICO, timeout longo p/ K-line)...");
  // protocolo '0' = automático: CAN, ISO 9141-2, KWP2000, J1850.
  // timeout 15s: o init lento da K-line (carros antigos) precisa disso.
  elmOK = myELM327.begin(SerialBT, false, 15000, '0');
  if (elmOK) {
    delay(200);
    elmSendRaw("ATAT2", 1500);              // timing adaptativo agressivo
    String atdp = elmSendRaw("ATDP", 2000); atdp.trim();
    Serial.println("[ELM] Protocolo: " + atdp);
    // reseta a fila de PIDs pro carro novo (o que era "não suportado"
    // no carro anterior pode existir neste)
    for (uint8_t i = 0; i < PID_COUNT; i++) {
      pids[i].value = NAN;
      pids[i].fails = 0;
      pids[i].enabled = true;
    }
    pidIndex = 0;
    pidInFlight = false;
    g_dtcs.clear();
    g_dtcsValid = false;
    refreshDTCs(); // primeira leitura de códigos já na conexão
  } else {
    Serial.println("[ELM] Falhou.");
  }
  return elmOK;
}

void btKeepAlive() {
  if (btOK && SerialBT.connected()) return;
  if (btOK && !SerialBT.connected()) {
    btOK = false; elmOK = false; carOK = false;
    Serial.println("[BT] Conexao perdida.");
  }
  if (!btDevice.length()) return; // sem dongle configurado
  if (millis() - lastBtAttempt < BT_RETRY_MS) return;
  lastBtAttempt = millis();
  Serial.println("[BT] Tentando reconectar (plug-and-play)...");
  if (connectBluetooth(btDevice, btPin)) connectELM327();
}

// =========================
// FILA DE PIDs (uma consulta por vez, com skip adaptativo)
// =========================
void pidStep() {
  if (!(btOK && elmOK) || busyDTC) return;
  if (millis() - lastPidStep < PID_STEP_MS) return;
  lastPidStep = millis();

  // acha o próximo PID habilitado
  uint8_t tries = 0;
  while (!pids[pidIndex].enabled && tries < PID_COUNT) {
    pidIndex = (pidIndex + 1) % PID_COUNT;
    tries++;
  }
  if (tries >= PID_COUNT) return; // nenhum habilitado (improvável)

  PidSlot& slot = pids[pidIndex];
  float v = slot.query();

  if (myELM327.nb_rx_state == ELM_SUCCESS) {
    if (!isnan(v)) slot.value = v;
    slot.fails = 0;
    pidInFlight = false;
    pidIndex = (pidIndex + 1) % PID_COUNT;
  } else if (myELM327.nb_rx_state == ELM_GETTING_MSG) {
    pidInFlight = true; // resposta a caminho — insiste no mesmo PID
  } else {
    // erro/timeout/NO DATA — conta falha; após o limite, desativa
    slot.fails++;
    if (slot.fails >= PID_MAX_FAILS) {
      slot.enabled = false;
      slot.value = NAN;
      Serial.printf("[PID] '%s' nao suportado neste carro — desativado\n", slot.key);
    }
    pidInFlight = false;
    pidIndex = (pidIndex + 1) % PID_COUNT;
  }

  // tensão via ATRV de tempos em tempos (fora da fila — é comando AT)
  if (!pidInFlight && millis() - lastVoltRead > VOLT_INTERVAL_MS) {
    lastVoltRead = millis();
    String v2 = elmSendRaw("ATRV", 1500); v2.trim();
    String only;
    for (char c : v2) if (isdigit((unsigned char)c) || c == '.') only += c;
    if (only.length()) g_volts = only.toFloat();
  }

  // carro "vivo" = pelo menos rpm/velocidade/temp respondendo
  carOK = !isnan(pids[0].value) || !isnan(pids[1].value) || !isnan(pids[2].value);
}

// =========================
// PUSH PRA NUVEM
// =========================
String buildReadingJson() {
  String j = "{";
  if (!isnan(g_volts)) j += "\"voltage\":" + String(g_volts, 1) + ",";
  j += "\"params\":{";
  bool first = true;
  for (uint8_t i = 0; i < PID_COUNT; i++) {
    if (!pids[i].enabled || isnan(pids[i].value)) continue;
    if (!first) j += ",";
    j += "\"" + String(pids[i].key) + "\":" + String(pids[i].value, 1);
    first = false;
  }
  j += "},\"dtcs\":[";
  for (size_t i = 0; i < g_dtcs.size(); i++) {
    if (i) j += ",";
    j += "{\"code\":\"" + g_dtcs[i] + "\"}";
  }
  j += "]}";
  return j;
}

// POST pra API. https:// usa TLS com a root CA embutida;
// http:// (bancada/dev) usa cliente puro.
bool apiPost(const String& path, const String& json, String& respOut) {
  if (!wifiOK || apMode || !deviceToken.length()) return false;

  HTTPClient http;
  String url = apiUrl + path;
  bool began;
  if (url.startsWith("https://")) {
    began = http.begin(secureClient, url);
  } else {
    began = http.begin(plainClient, url);
  }
  if (!began) return false;

  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", deviceToken);

  int code = http.POST(json);
  bool ok = (code == 200 || code == 201);
  if (ok) respOut = http.getString();
  else Serial.printf("[PUSH] %s -> HTTP %d\n", path.c_str(), code);
  http.end();
  return ok;
}

// A resposta do push carrega o comando pendente: {"ok":true,"command":"read_dtc"}
void handleCommandFromResponse(const String& resp) {
  if (resp.indexOf("\"command\":\"read_dtc\"") >= 0) {
    Serial.println("[CMD] read_dtc recebido da nuvem");
    refreshDTCs();
    lastReadingPush = 0; // força push imediato com os códigos frescos
  } else if (resp.indexOf("\"command\":\"clear_dtc\"") >= 0) {
    Serial.println("[CMD] clear_dtc recebido da nuvem");
    clearDTCs();
    lastReadingPush = 0;
  }
}

void pushLoop() {
  if (!wifiOK || apMode || !deviceToken.length()) return;

  // leitura a cada 5s quando tem carro conectado
  if (btOK && elmOK && carOK && millis() - lastReadingPush > READING_MS) {
    lastReadingPush = millis();
    String resp;
    if (apiPost("/obd/reading", buildReadingJson(), resp)) {
      lastHeartbeat = millis(); // leitura também é sinal de vida
      handleCommandFromResponse(resp);
    }
    return; // um push por volta do loop
  }

  // heartbeat a cada 30s (mesmo sem carro — mantém o badge online)
  if (millis() - lastHeartbeat > HEARTBEAT_MS) {
    lastHeartbeat = millis();
    String resp;
    if (apiPost("/obd/heartbeat", "{}", resp)) {
      handleCommandFromResponse(resp);
    }
  }

  // releitura periódica de códigos com carro conectado
  if (btOK && elmOK && carOK && millis() - lastDtcRefresh > DTC_REFRESH_MS) {
    lastDtcRefresh = millis();
    refreshDTCs();
  }
}

// =========================
// PÁGINA LOCAL (setup + status de bancada)
// =========================
bool isAdmin() {
  String hk = server.header("X-Admin-Key");
  String qk = server.hasArg("key") ? server.arg("key") : "";
  return (hk.length() && hk == adminKey) || (qk.length() && qk == adminKey);
}

String setupPage() {
  String ip = apMode ? WiFi.softAPIP().toString() : WiFi.localIP().toString();
  return
    "<!doctype html><html><head><meta charset='utf-8'/>"
    "<meta name='viewport' content='width=device-width,initial-scale=1'/>"
    "<title>OficinaSync OBD v2 — Setup</title>"
    "<style>body{font-family:system-ui;background:#0a0a0a;color:#eaecef;padding:20px}"
    ".card{max-width:560px;margin:auto;background:#141414;border:1px solid #262626;border-radius:16px;padding:16px;margin-bottom:14px}"
    "input,button,select{width:100%;padding:12px;border-radius:10px;border:1px solid #262626;background:#181818;color:#eaecef;margin:6px 0;box-sizing:border-box}"
    "button{cursor:pointer}button.primary{background:#A3E635;color:#111;font-weight:700}"
    "small{color:#8a8f98;display:block;margin:4px 0}label{font-size:13px;color:#8a8f98}"
    ".dev{padding:10px;border:1px solid #262626;border-radius:10px;margin:6px 0;cursor:pointer}"
    ".dev:hover{background:#1c1c1c}.status{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #262626;font-size:14px}"
    ".ok{color:#A3E635}.nok{color:#ff5d5d}</style></head><body>"

    "<div class='card'><h2>OficinaSync OBD v2</h2>"
    "<div class='status'><span>Wi-Fi</span><b class='" + String((wifiOK||apMode)?"ok":"nok") + "'>" + String(wifiOK?"conectado":(apMode?"modo AP":"--")) + "</b></div>"
    "<div class='status'><span>Dongle (BT)</span><b class='" + String(btOK?"ok":"nok") + "'>" + String(btOK?"conectado":"--") + "</b></div>"
    "<div class='status'><span>ELM327</span><b class='" + String(elmOK?"ok":"nok") + "'>" + String(elmOK?"ok":"--") + "</b></div>"
    "<div class='status'><span>Carro</span><b class='" + String(carOK?"ok":"nok") + "'>" + String(carOK?"lendo dados":"--") + "</b></div>"
    "<div class='status'><span>Token</span><b class='" + String(deviceToken.length()?"ok":"nok") + "'>" + String(deviceToken.length()?"configurado":"FALTA") + "</b></div>"
    "<small>IP: " + ip + " · Admin Key (anote!): <b>" + adminKey + "</b></small></div>"

    "<div class='card'><h3>1. Wi-Fi + OficinaSync</h3>"
    "<form method='POST' action='/setup'>"
    "<label>Rede Wi-Fi (SSID)</label><input name='ssid' value='" + htmlEscape(wifiSsid) + "'/>"
    "<label>Senha do Wi-Fi</label><input name='pass' type='password' value='" + htmlEscape(wifiPass) + "'/>"
    "<label>Token do dispositivo (gera na pagina Scanner do OficinaSync)</label>"
    "<input name='token' value='" + htmlEscape(deviceToken) + "' placeholder='cole o token aqui'/>"
    "<label>URL da API (padrao producao; http://IP:3000 pra bancada)</label>"
    "<input name='api' value='" + htmlEscape(apiUrl) + "'/>"
    "<label>Dongle (nome ou MAC — use o buscador abaixo)</label>"
    "<input id='btdev' name='bt' value='" + htmlEscape(btDevice) + "' placeholder='OBDII ou 00:10:CC:...'/>"
    "<label>PIN do dongle (1234 ou 0000)</label><input name='pin' value='" + htmlEscape(btPin) + "'/>"
    "<label>Admin Key</label><input name='key' placeholder='cole a Admin Key'/>"
    "<button class='primary' type='submit'>Salvar e Reiniciar</button></form></div>"

    "<div class='card'><h3>2. Buscar dongles por perto</h3>"
    "<small>Ligue o dongle no carro (ou numa fonte OBD de bancada) e toque em buscar. "
    "Tocar num resultado preenche o campo acima.</small>"
    "<button onclick='scan()'>Buscar dongles (~8s)</button>"
    "<div id='scanout'></div></div>"

    "<div class='card'><h3>Factory reset</h3>"
    "<form method='POST' action='/wipe'>"
    "<input name='key' placeholder='Admin Key'/>"
    "<button type='submit' style='background:#3a1a1a'>APAGAR TUDO E REINICIAR</button></form></div>"

    "<script>"
    "async function scan(){"
    "  const out=document.getElementById('scanout');"
    "  out.innerHTML='<small>Buscando... aguarde ~10s (o BT para de reconectar durante a busca)</small>';"
    "  try{"
    "    const r=await fetch('/bt_scan');const list=await r.json();"
    "    if(!list.length){out.innerHTML='<small>Nenhum aparelho achado. Dongle ligado? Perto?</small>';return;}"
    "    out.innerHTML=list.map(d=>`<div class='dev' onclick=\"pick('${d.mac}')\"><b>${d.name||'(sem nome)'}</b><br/><small>${d.mac}</small></div>`).join('');"
    "  }catch(e){out.innerHTML='<small>Falhou — tente de novo.</small>';}"
    "}"
    "function pick(mac){document.getElementById('btdev').value=mac;window.scrollTo(0,0);}"
    "</script>"
    "</body></html>";
}

void handleRoot()     { server.send(200, "text/html; charset=utf-8", setupPage()); }
void handleSetupGet() { server.send(200, "text/html; charset=utf-8", setupPage()); }

void handleSetupPost() {
  if (server.arg("key") != adminKey) { server.send(403, "text/plain", "Admin Key invalida."); return; }
  if (server.arg("ssid").length() < 1) { server.send(400, "text/plain", "SSID vazio."); return; }
  saveConfig(server.arg("ssid"), server.arg("pass"), server.arg("token"),
             server.arg("api"), server.arg("bt"), server.arg("pin"));
  server.send(200, "text/plain", "Salvo. Reiniciando...");
  delay(400); ESP.restart();
}

void handleWipe() {
  if (server.arg("key") != adminKey) { server.send(403, "text/plain", "Admin Key invalida."); return; }
  server.send(200, "text/plain", "Apagando e reiniciando...");
  delay(400); factoryReset();
}

void handleStatus() {
  String j = "{";
  j += "\"wifi\":" + String(wifiOK?"true":"false") + ",";
  j += "\"ap\":"   + String(apMode?"true":"false") + ",";
  j += "\"bt\":"   + String(btOK?"true":"false") + ",";
  j += "\"elm\":"  + String(elmOK?"true":"false") + ",";
  j += "\"car\":"  + String(carOK?"true":"false") + ",";
  j += "\"token_set\":" + String(deviceToken.length()?"true":"false") + ",";
  j += "\"heap\":" + String(ESP.getFreeHeap());
  j += "}";
  server.send(200, "application/json", j);
}

// Descoberta de dongles: lista nome + MAC dos aparelhos BT próximos.
// Mata a dor da v1 de digitar MAC na mão.
void handleBtScan() {
  Serial.println("[BT] Iniciando discovery...");
  bool wasConnected = btOK;
  if (wasConnected) {
    SerialBT.disconnect();
    btOK = false; elmOK = false; carOK = false;
  }
  SerialBT.end();
  delay(300);
  WiFi.setSleep(true);
  if (!SerialBT.begin("ESP32-OBD", true)) {
    server.send(200, "application/json", "[]");
    return;
  }
  delay(300);

  String j = "[";
  BTScanResults* results = SerialBT.discover(BT_DISCOVER_MS);
  if (results) {
    int n = results->getCount();
    for (int i = 0; i < n; i++) {
      BTAdvertisedDevice* dev = results->getDevice(i);
      if (!dev) continue;
      if (i) j += ",";
      String name = dev->getName().c_str();
      name.replace("\"", "");
      j += "{\"name\":\"" + name + "\",\"mac\":\"" + String(dev->getAddress().toString().c_str()) + "\"}";
    }
    SerialBT.discoverClear();
  }
  j += "]";
  Serial.println("[BT] Discovery: " + j);
  server.send(200, "application/json", j);
  // o btKeepAlive reconecta sozinho no dongle salvo no próximo ciclo
  lastBtAttempt = 0;
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
  Serial.println("OficinaSync OBD v2");
  Serial.println("Admin Key: " + adminKey);
  Serial.println("API: " + apiUrl);
  Serial.println("Token: " + String(deviceToken.length() ? "configurado" : "FALTA (setup!)"));
  Serial.println("Dongle: " + (btDevice.length() ? btDevice : String("nao configurado")));
  Serial.println("====================================");

  secureClient.setCACert(ISRG_ROOT_X1);
  secureClient.setTimeout(HTTP_TIMEOUT_MS / 1000);

  if (!connectWiFiBlocking(WIFI_TIMEOUT)) startAPMode();

  server.on("/",        handleRoot);
  server.on("/setup",   HTTP_GET,  handleSetupGet);
  server.on("/setup",   HTTP_POST, handleSetupPost);
  server.on("/wipe",    HTTP_POST, handleWipe);
  server.on("/status",  handleStatus);
  server.on("/bt_scan", HTTP_GET,  handleBtScan);
  server.begin();

  String ip = apMode ? WiFi.softAPIP().toString() : WiFi.localIP().toString();
  Serial.println("[HTTP] Setup local: http://" + ip);

  // PLUG-AND-PLAY: tudo configurado? conecta no dongle já no boot.
  if (wifiOK && btDevice.length() && deviceToken.length()) {
    Serial.println("[BOOT] Config completa — conectando no dongle...");
    if (connectBluetooth(btDevice, btPin)) connectELM327();
  }
}

void loop() {
  server.handleClient();
  wifiKeepAlive();
  btKeepAlive();
  pidStep();
  pushLoop();

  // LED: aceso = wifi ok; piscando = lendo carro; apagado = sem nada
  if (btOK && elmOK && carOK) {
    if (millis() - lastBlink > 450) {
      lastBlink = millis(); ledState = !ledState;
      digitalWrite(LED_PIN, ledState ? HIGH : LOW);
    }
  } else {
    digitalWrite(LED_PIN, (wifiOK || apMode) ? HIGH : LOW);
  }
}
