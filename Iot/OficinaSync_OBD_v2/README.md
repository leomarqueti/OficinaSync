# OficinaSync OBD v2 — guia de bancada

Firmware do scanner próprio: ESP32 conecta no ELM327 via Bluetooth e **empurra**
os dados pra API do OficinaSync com um token de dispositivo. Depois do setup
(uma vez), é plug-and-play: ligou, conectou, apareceu online na página Scanner.

## O que precisa

- ESP32 (o mesmo da v1)
- Dongle ELM327 Bluetooth (clássico, não BLE)
- Arduino IDE com:
  - **Placa**: esp32 by Espressif (Boards Manager) — placa "ESP32 Dev Module"
  - **Biblioteca**: `ELMduino` (Library Manager) — a mesma da v1
  - (WiFi, WiFiClientSecure, HTTPClient, WebServer, BluetoothSerial e
    Preferences já vêm com o core do ESP32)
- **Partition Scheme**: se der erro de "sketch too big", troque em
  Tools → Partition Scheme → **"Huge APP (3MB No OTA)"** — BT clássico + TLS
  deixam o binário grande.

## Passo a passo

### 1. Gerar o token no OficinaSync
Página **Scanner** (sidebar) → "Cadastrar dispositivo" → dá um nome
(ex: "Scanner bancada") → **copia o token** (aparece uma única vez).

### 2. Gravar o firmware
Abre `OficinaSync_OBD_v2.ino` na IDE → seleciona a placa/porta → Upload.
Abre o **Serial Monitor a 115200** — ele mostra a Admin Key e o estado.

### 3. Setup (primeira vez)
- O ESP cria o AP **OficinaSync-OBD-XXXXXX** (senha no Serial Monitor).
- Conecta no AP → abre `http://192.168.4.1`
- Preenche:
  - **Wi-Fi**: a rede da oficina (ou do teste)
  - **Token**: o do passo 1
  - **URL da API**:
    - produção: `https://api.oficinasync.com.br` (padrão)
    - **bancada com backend local**: `http://IP-DO-SEU-PC:3000`
      (o IP da máquina rodando `npm run start:dev` — bem mais fácil de
      depurar; sem TLS)
  - **Dongle**: usa o botão **"Buscar dongles"** — liga o ELM327 numa fonte
    OBD (ou no carro) e toca no resultado da lista. Acabou a era de digitar
    MAC na mão.
  - **PIN**: 1234 (a maioria) — se falhar, tenta 0000
  - **Admin Key**: a do Serial Monitor
- Salvar → reinicia → conecta sozinho.

### 4. Conferir
- **Serial Monitor**: deve mostrar `[BT] Conectado!`, `[ELM] Protocolo: ...`
  e depois nenhum `[PUSH] ... -> HTTP xxx` de erro (silêncio = 200 OK).
- **Página Scanner do OficinaSync**: badge do dispositivo fica **Online**
  (~30s) e, com o carro ligado, o painel "Ao vivo" começa a se mexer.
- Botão **"Ler códigos agora"** na tela do Scanner → o Serial mostra
  `[CMD] read_dtc recebido da nuvem` → códigos aparecem na tela.

## Compatibilidade de carros (o que o firmware faz por baixo)

| Situação | O que acontece |
|---|---|
| Carro 2010+ (CAN) | conecta rápido, ~10 leituras/s |
| Carro antigo (ISO 9141/KWP — Celta, Gol, Palio, Uno pré-2010) | o init demora 5–15s (normal! é o protocolo K-line) — o timeout do firmware já espera isso |
| Carro sem MAF/nível de combustível/banco 2 | o PID falha 8x seguidas e é **desativado sozinho** — não trava o resto (Serial mostra `[PID] 'maf' nao suportado`) |
| Dongle com PIN diferente | troca o PIN no setup (1234 → 0000 → 6789) |
| Protocolo detectado | comando `ATDP` aparece no Serial na conexão (ex: "ISO 9141-2" ou "CAN 11/500") |

## Troubleshooting

- **`[BT] Falhou`**: dongle ligado? Celular pareado nele antes? (desconecta
  do celular — o ELM só aceita 1 conexão). Tenta pelo MAC via "Buscar dongles".
- **`[ELM] Falhou`** com BT ok: carro com ignição ligada? Em carro K-line,
  espera 15s — o init é lento mesmo. Se persistir, dongle pode ser clone
  ruim (alguns clones v2.1 mentem o protocolo; teste em carro CAN primeiro).
- **`[PUSH] /obd/reading -> HTTP 401`**: token errado/revogado — gera outro
  na página Scanner e refaz o setup.
- **Push falha só em HTTPS** (funciona em http local): certificado — confirma
  que a API é a de produção com Let's Encrypt. Heap baixo também derruba TLS:
  confira `heap` em `http://IP-DO-ESP/status` (precisa de ~50KB livres).
- **Factory reset**: página de setup → "APAGAR TUDO" (pede a Admin Key), ou
  regrava o firmware.

## O que mudou da v1

- ESP é **cliente** (push HTTPS) em vez de servidor local — integra com o
  sistema de qualquer lugar, sem mixed content, sem digitar IP.
- Nome/MAC + PIN do dongle **persistem no NVS** → reconecta sozinho no boot.
- Protocolo **automático** (ATSP0) + timing adaptativo (ATAT2) + fila de PIDs
  com skip → funciona do Celta 2006 ao Onix 2024.
- Descoberta Bluetooth na página de setup (`/bt_scan`).
- A página local virou só setup/status — o painel de verdade é a tela
  **Scanner** do OficinaSync (tempo real, gráficos, ler/apagar códigos).
