import type { Role } from "./me";

export const TOUR_VERSION = 2;

export type TourStep = { title: string; text: string; target?: string };

export const tourKey = (userId: number) => `oficinasync_tour_v${TOUR_VERSION}_${userId}`;

export const shouldShowTour = (storage: Pick<Storage, "getItem">, userId: number) =>
  storage.getItem(tourKey(userId)) === null;

export const markTourDone = (storage: Pick<Storage, "setItem">, userId: number) =>
  storage.setItem(tourKey(userId), "1");

export const resetTour = (storage: Pick<Storage, "removeItem">, userId: number) =>
  storage.removeItem(tourKey(userId));

const common: TourStep[] = [
  {
    title: "Bem-vindo ao OficinaSync",
    text: "Aqui você abre a OS, registra o serviço com fotos e o cliente acompanha por um link. Vamos ver o essencial em 1 minuto.",
  },
  {
    title: "Abrir uma OS",
    text: "Toque em \"Nova OS\" — no celular do mecânico é o botão verde \"+ Carro\", embaixo. Se o cliente já foi embora, use a \"Abertura rápida\": só a placa é obrigatória, o resto você completa depois.",
    target: "[data-tour='new-os']",
  },
];

const byRole: Record<Role, TourStep[]> = {
  mechanic: [
    { title: "Registrar o serviço", text: "Dentro da OS, crie as etapas (diagnóstico, reparo...), tire fotos e explique com suas palavras. O cliente lê isso." },
    { title: "Peças usadas", text: "Em \"Peças e equipe\", registre as peças que você pegou no estoque (tire foto da caixa se não tiver código). No final, informe só o que realmente usou." },
    { title: "Quem ajudou", text: "Se um colega ajudou, marque quem ajudou, com o quê e quanto (%). O que sobrar fica com você — é a base da comissão." },
    { title: "Finalizar", text: "Quando terminar, toque em \"Finalizar OS\". O escritório recebe a ficha com tudo que precisa." },
  ],
  receptionist: [
    { title: "Completar dados", text: "OS aberta rápido fica com \"Dados pendentes\". Toque em \"Completar dados\" quando o cliente chegar ou ligar." },
    { title: "Ficha do escritório", text: "Em cada OS, abra a \"Ficha do escritório\": peças, serviços, equipe e anotações, prontos para copiar para o outro sistema." },
    { title: "Anotações internas", text: "Use as anotações do escritório para o que o cliente não pode ver (forma de pagamento, combinados)." },
    { title: "Link do cliente", text: "Copie o link da página do cliente e mande no WhatsApp para ele acompanhar o serviço." },
  ],
  owner: [
    { title: "Sua equipe", text: "Em \"Equipe\", convide cada funcionário por e-mail. Cada um tem a própria conta e vê só o que precisa." },
    { title: "Ficha do escritório", text: "Cada OS tem uma ficha com peças (código e foto da caixa), serviços, equipe e anotações — pronta para lançar no outro sistema." },
    { title: "Comissões", text: "Em \"Comissões\" você vê, por período, a porcentagem de cada funcionário nas OS concluídas." },
    { title: "Responsável da OS", text: "Quem abre a OS é o responsável e distribui as porcentagens. Você pode trocar o responsável ou ajustar tudo pela tela de Peças e equipe." },
  ],
};

export function tourSteps(role: Role): TourStep[] {
  return [...common, ...byRole[role]].slice(0, 6);
}
