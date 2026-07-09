/**
 * Catálogo de descrições de códigos de falha OBD-II — portado e expandido do
 * DTC_DB do firmware v1 (Iot/OficinaSync_OBD_v1). Cobre os códigos mais comuns
 * na oficina; qualquer código fora da lista cai na descrição genérica por
 * prefixo (P/C/B/U). Só frontend — fácil de estender conforme aparecerem.
 */
const DTC_DB: Record<string, string> = {
  // Ar / mistura
  P0100: "Sensor MAF — mau funcionamento do circuito",
  P0101: "Sensor MAF — faixa/desempenho",
  P0102: "Sensor MAF — sinal baixo",
  P0103: "Sensor MAF — sinal alto",
  P0105: "Sensor MAP — mau funcionamento do circuito",
  P0106: "Sensor MAP — faixa/desempenho",
  P0110: "Sensor de temp. do ar de admissão (IAT) — circuito",
  P0113: "Sensor IAT — sinal alto",
  P0115: "Sensor de temp. do líquido de arrefecimento — circuito",
  P0116: "Sensor de temp. do motor — faixa/desempenho",
  P0117: "Sensor de temp. do motor — sinal baixo",
  P0118: "Sensor de temp. do motor — sinal alto",
  P0120: "Sensor TPS — mau funcionamento do circuito",
  P0121: "Sensor TPS — faixa/desempenho",
  P0130: "Sonda lambda (B1S1) — circuito",
  P0131: "Sonda lambda (B1S1) — tensão baixa",
  P0133: "Sonda lambda (B1S1) — resposta lenta",
  P0135: "Aquecedor da sonda lambda (B1S1) — circuito",
  P0171: "Mistura pobre (banco 1)",
  P0172: "Mistura rica (banco 1)",
  P0174: "Mistura pobre (banco 2)",
  P0175: "Mistura rica (banco 2)",

  // Ignição / falhas de combustão
  P0300: "Falha de ignição aleatória/múltipla",
  P0301: "Falha de ignição — cilindro 1",
  P0302: "Falha de ignição — cilindro 2",
  P0303: "Falha de ignição — cilindro 3",
  P0304: "Falha de ignição — cilindro 4",
  P0305: "Falha de ignição — cilindro 5",
  P0306: "Falha de ignição — cilindro 6",
  P0325: "Sensor de detonação (knock) — circuito",
  P0335: "Sensor de rotação (CKP) — circuito",
  P0336: "Sensor de rotação (CKP) — faixa/desempenho",
  P0340: "Sensor de fase (CMP) — circuito",
  P0341: "Sensor de fase (CMP) — faixa/desempenho",

  // Combustível / EVAP / EGR
  P0230: "Bomba de combustível — circuito primário",
  P0401: "EGR — fluxo insuficiente",
  P0403: "EGR — circuito de controle",
  P0420: "Eficiência do catalisador abaixo do limite (banco 1)",
  P0430: "Eficiência do catalisador abaixo do limite (banco 2)",
  P0440: "Sistema EVAP — mau funcionamento",
  P0442: "Sistema EVAP — vazamento pequeno",
  P0455: "Sistema EVAP — vazamento grande",
  P0462: "Sensor de nível de combustível — sinal baixo",

  // Marcha lenta / elétrica
  P0505: "Controle de marcha lenta — mau funcionamento",
  P0506: "Marcha lenta abaixo do esperado",
  P0507: "Marcha lenta acima do esperado",
  P0562: "Tensão do sistema baixa",
  P0563: "Tensão do sistema alta",

  // Transmissão / rede
  P0700: "Sistema de controle da transmissão — falha",
  P0715: "Sensor de rotação da turbina — circuito",
  U0100: "Perda de comunicação com ECM/PCM",
  U0101: "Perda de comunicação com TCM",
  U0121: "Perda de comunicação com módulo ABS",
  U0140: "Perda de comunicação com BCM",
};

const prefixDescriptions: Record<string, string> = {
  P: "Powertrain (motor/transmissão)",
  C: "Chassi (freios/suspensão/direção)",
  B: "Carroceria (airbag/vidros/conforto)",
  U: "Rede de comunicação (módulos)",
};

/** Descrição do código, ou fallback genérico pelo prefixo. */
export function describeDtc(code: string): string {
  const normalized = code.trim().toUpperCase();
  return (
    DTC_DB[normalized] ??
    prefixDescriptions[normalized.charAt(0)] ??
    "Código não catalogado"
  );
}
