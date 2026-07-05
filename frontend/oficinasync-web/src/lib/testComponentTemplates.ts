export type ComponentTestTemplate = {
  title: string;
  measurements: { label: string; expected?: string }[];
};

/**
 * Modelos de teste por componente (sensor/atuador) — pré-preenchem título +
 * linhas de medição do teste genérico (alimentação/sinal/aterramento etc.),
 * poupando o mecânico de digitar tudo toda vez. Cobre os componentes mais
 * comuns num carro flex; qualquer outro continua no formulário livre.
 */
export const componentTestTemplates: ComponentTestTemplate[] = [
  {
    title: "Sensor MAP (pressão do coletor)",
    measurements: [
      { label: "Alimentação", expected: "5V" },
      { label: "Sinal (varia com aceleração)" },
      { label: "Aterramento (massa)" },
    ],
  },
  {
    title: "Sensor MAF (fluxo de ar)",
    measurements: [
      { label: "Alimentação", expected: "5V ou 12V" },
      { label: "Sinal (varia com fluxo de ar)" },
      { label: "Aterramento (massa)" },
    ],
  },
  {
    title: "Sensor TPS (posição da borboleta)",
    measurements: [
      { label: "Alimentação", expected: "5V" },
      { label: "Sinal (cresce com a abertura)" },
      { label: "Aterramento (massa)" },
    ],
  },
  {
    title: "Sensor de rotação (CKP)",
    measurements: [
      { label: "Alimentação (se hall)", expected: "5V ou 12V" },
      { label: "Sinal / forma de onda" },
      { label: "Resistência da bobina (se indutivo)" },
    ],
  },
  {
    title: "Sensor de fase (CMP)",
    measurements: [
      { label: "Alimentação", expected: "5V ou 12V" },
      { label: "Sinal (pulso por volta do comando)" },
    ],
  },
  {
    title: "Sonda lambda",
    measurements: [
      { label: "Alimentação do aquecedor", expected: "12V" },
      { label: "Sinal (oscila)", expected: "0.1V–0.9V" },
      { label: "Aterramento do sinal" },
    ],
  },
  {
    title: "Sensor de temperatura do motor (ECT)",
    measurements: [
      { label: "Alimentação", expected: "5V" },
      { label: "Resistência a frio" },
      { label: "Resistência a quente" },
    ],
  },
  {
    title: "Sensor de detonação (knock)",
    measurements: [
      { label: "Sinal (sem alimentação — piezoelétrico)" },
      { label: "Resistência do sensor" },
    ],
  },
  {
    title: "Sensor de roda ABS",
    measurements: [
      { label: "Alimentação (se ativo)", expected: "12V" },
      { label: "Sinal (varia com giro da roda)" },
      { label: "Resistência da bobina (se passivo)" },
    ],
  },
  {
    title: "Bico injetor (elétrico)",
    measurements: [
      { label: "Alimentação no chicote", expected: "12V" },
      { label: "Resistência da bobina" },
      { label: "Acionamento (sinal do módulo)" },
    ],
  },
  {
    title: "Bobina de ignição",
    measurements: [
      { label: "Alimentação", expected: "12V" },
      { label: "Sinal de acionamento (do módulo)" },
      { label: "Resistência primária/secundária" },
    ],
  },
  {
    title: "Válvula IAC / motor de passo (marcha lenta)",
    measurements: [
      { label: "Alimentação", expected: "12V" },
      { label: "Sinal de acionamento (pulsos do módulo)" },
      { label: "Resistência das bobinas" },
    ],
  },
  {
    title: "Bomba de combustível",
    measurements: [
      { label: "Alimentação no conector", expected: "12V" },
      { label: "Pressão da linha" },
      { label: "Vazão (tempo pra encher recipiente)" },
    ],
  },
  {
    title: "Relé (ventilador/bomba/etc.)",
    measurements: [
      { label: "Alimentação da bobina", expected: "12V" },
      { label: "Continuidade dos contatos" },
      { label: "Acionamento (sinal de comando)" },
    ],
  },
  {
    title: "Motor de partida",
    measurements: [
      { label: "Alimentação direto na bateria", expected: "12V" },
      { label: "Consumo de corrente" },
      { label: "Acionamento do solenoide" },
    ],
  },
];
