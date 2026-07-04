/**
 * Roteiro de triagem opcional na abertura da OS — perguntas curtas que dão
 * um norte pro mecânico antes de começar a mexer no carro. Totalmente
 * pulável (cliente com pressa não precisa responder nada disso).
 */
export type IntakeQuestion = {
  key: string;
  label: string;
  type: "text" | "select";
  options?: string[];
};

export const intakeQuestions: IntakeQuestion[] = [
  {
    key: "uso",
    label: "Qual o uso do veículo?",
    type: "select",
    options: ["Cidade", "Estrada", "Aplicativo/Uber", "Cidade e estrada"],
  },
  {
    key: "temperatura",
    label: "O problema acontece com o carro frio, quente, ou tanto faz?",
    type: "select",
    options: ["Frio", "Quente", "Tanto faz"],
  },
  {
    key: "quando_comecou",
    label: "Há quanto tempo o carro apresenta esse problema?",
    type: "text",
  },
  {
    key: "momento",
    label: "Em que momento ou situação o sintoma aparece?",
    type: "text",
  },
  {
    key: "apos_evento",
    label: "Começou depois de abastecer ou de algum serviço/manutenção?",
    type: "text",
  },
  {
    key: "tentou_resolver",
    label: "Já tentou resolver antes? Onde e o que foi feito?",
    type: "text",
  },
];
