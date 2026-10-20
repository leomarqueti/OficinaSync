// Regras da abertura de OS guiada (uma pergunta por tela): quais telas aparecem,
// o que falta pra continuar e o que é enviado ao backend. Sem React — testado em ui-tests/unit.
import { e164ToDigits, isValidCpf, isValidPhone, isValidPlate, isValidYear, onlyDigits } from "./validators";

export type StepId = "plate" | "brand" | "model" | "year" | "km" | "extras" | "defect" | "client" | "photos" | "review";
export type PhotoSide = "front" | "rear" | "left" | "right";

/** Resposta de GET /cars/by-plate/:plate. */
export type PlateMatch = {
  car_id: number;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  fuel_type: string | null;
  color: string | null;
  chassis: string | null;
  last_mileage: number | null;
  owner: { client_id: number; name: string } | null;
};

export type GuidedClient = { client_id: number | null; name: string; phone: string; cpf: string; email: string; address: string };

export type GuidedState = {
  plate: string;
  /** carro já cadastrado escolhido na tela da placa */
  match: PlateMatch | null;
  /** "Não, é outro carro": a placa existe, mas o cadastro está errado — abre as telas pra corrigir */
  correcting: boolean;
  brand: string;
  model: string;
  year: string;
  km: string;
  fuel: string;
  color: string;
  chassis: string;
  defect: string;
  answers: Record<string, string>;
  hasAudio: boolean;
  hasVideo: boolean;
  clientPresent: boolean | null;
  client: GuidedClient;
  photos: Record<PhotoSide, boolean>;
  extraPhotos: number;
};

export const STEP_ORDER: StepId[] = ["plate", "brand", "model", "year", "km", "extras", "defect", "client", "photos", "review"];

export const PHOTO_SIDES: PhotoSide[] = ["front", "rear", "left", "right"];
export const PHOTO_LABELS: Record<PhotoSide, string> = {
  front: "da frente",
  rear: "da traseira",
  left: "do lado esquerdo",
  right: "do lado direito",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emptyGuidedState(): GuidedState {
  return {
    plate: "",
    match: null,
    correcting: false,
    brand: "",
    model: "",
    year: "",
    km: "",
    fuel: "",
    color: "",
    chassis: "",
    defect: "",
    answers: {},
    hasAudio: false,
    hasVideo: false,
    clientPresent: null,
    client: { client_id: null, name: "", phone: "", cpf: "", email: "", address: "" },
    photos: { front: false, rear: false, left: false, right: false },
    extraPhotos: 0,
  };
}

export const normalizePlate = (plate: string) => plate.toUpperCase().replace(/[^A-Z0-9]/g, "");

export function resolvePlateMatch(
  matches: PlateMatch[],
): { kind: "none" } | { kind: "one"; match: PlateMatch } | { kind: "many"; matches: PlateMatch[] } {
  if (matches.length === 0) return { kind: "none" };
  if (matches.length === 1) return { kind: "one", match: matches[0] };
  return { kind: "many", matches };
}

/**
 * Mudou a placa: o carro reconhecido deixa de valer. Se o cliente tinha vindo do dono daquele carro,
 * ele também sai (senão o dono do carro antigo viraria dono do carro novo).
 */
export function editPlate(state: GuidedState, plate: string): GuidedState {
  const ownerId = state.match?.owner?.client_id ?? null;
  const clientFromOwner = ownerId !== null && state.client.client_id === ownerId;
  return {
    ...state,
    plate,
    match: null,
    correcting: false,
    ...(clientFromOwner ? { client: { ...emptyGuidedState().client }, clientPresent: null } : {}),
  };
}

/** Preenche o estado com o carro reconhecido (o KM vem do último conhecido; o mecânico confere). */
export function applyMatch(state: GuidedState, match: PlateMatch): GuidedState {
  return {
    ...state,
    match,
    correcting: false,
    brand: match.brand ?? "",
    model: match.model ?? "",
    year: match.year != null ? String(match.year) : "",
    fuel: match.fuel_type ?? "",
    color: match.color ?? "",
    chassis: match.chassis ?? "",
    km: match.last_mileage != null ? String(match.last_mileage) : "",
    client: match.owner
      ? { ...state.client, client_id: match.owner.client_id, name: match.owner.name }
      : state.client,
  };
}

/** Ordem fixa; carro reconhecido pula o que o cadastro já tem (o KM de hoje sempre é perguntado). */
export function stepsFor(state: GuidedState): StepId[] {
  const m = state.match;
  if (!m || state.correcting) return [...STEP_ORDER];
  return STEP_ORDER.filter((step) => {
    if (step === "brand") return !m.brand;
    if (step === "model") return !m.model;
    if (step === "year") return m.year == null;
    if (step === "extras") return !(m.fuel_type && m.color && m.chassis);
    return true;
  });
}

/** O que falta pra liberar o "Continuar" daquela tela ([] = pode seguir). */
export function missingFor(step: StepId, s: GuidedState): string[] {
  switch (step) {
    case "plate":
      return isValidPlate(s.plate) ? [] : ["placa válida"];
    case "brand":
      return s.brand.trim() ? [] : ["marca"];
    case "model":
      return s.model.trim() ? [] : ["modelo"];
    case "year":
      return isValidYear(s.year) ? [] : ["ano"];
    case "km":
      return onlyDigits(s.km) ? [] : ["KM do painel"];
    case "defect":
      return s.defect.trim().length >= 5 ? [] : ["descrever o defeito (5 letras ou mais)"];
    case "client": {
      if (s.clientPresent === null) return ["dizer se o cliente está aqui"];
      if (s.clientPresent === false || s.client.client_id !== null) return [];
      const missing: string[] = [];
      if (s.client.name.trim().length < 2) missing.push("nome");
      if (!isValidPhone(e164ToDigits(s.client.phone))) missing.push("telefone");
      if (s.client.cpf && !isValidCpf(s.client.cpf)) missing.push("CPF válido");
      if (s.client.email.trim() && !emailRegex.test(s.client.email)) missing.push("e-mail válido");
      return missing;
    }
    case "photos":
      return PHOTO_SIDES.filter((side) => !s.photos[side]).map((side) => `foto ${PHOTO_LABELS[side]}`);
    default:
      return [];
  }
}

type CarFields = { brand?: string; model?: string; year?: number; fuel_type?: string; color?: string; chassis?: string };

function carFields(s: GuidedState): CarFields {
  const out: CarFields = {};
  if (s.brand.trim()) out.brand = s.brand.trim();
  if (s.model.trim()) out.model = s.model.trim();
  if (isValidYear(s.year)) out.year = Number(s.year);
  if (s.fuel) out.fuel_type = s.fuel;
  if (s.color.trim()) out.color = s.color.trim();
  if (s.chassis.trim()) out.chassis = s.chassis.trim().toUpperCase();
  return out;
}

/**
 * Carro novo → create (placa normalizada, só o que foi preenchido). Carro reconhecido → patch só
 * com o que mudou (nunca cria carro repetido); null quando não mudou nada.
 */
export function buildCarPayload(
  s: GuidedState,
): { create: Record<string, unknown> } | { patch: { car_id: number; body: Record<string, unknown> } } | null {
  const fields = carFields(s);
  if (!s.match) {
    const km = onlyDigits(s.km);
    return { create: { plate: normalizePlate(s.plate), ...fields, ...(km ? { mileage_in: Number(km) } : {}) } };
  }
  const m = s.match;
  const current: CarFields = {
    brand: m.brand ?? undefined,
    model: m.model ?? undefined,
    year: m.year ?? undefined,
    fuel_type: m.fuel_type ?? undefined,
    color: m.color ?? undefined,
    chassis: m.chassis ?? undefined,
  };
  const changed = Object.fromEntries(
    Object.entries(fields).filter(([key, value]) => current[key as keyof CarFields] !== value),
  );
  return Object.keys(changed).length > 0 ? { patch: { car_id: m.car_id, body: changed } } : null;
}

/** Corpo do POST /service_orders. Cliente: o informado; se ausente e o carro tem dono, o dono. */
export function buildOrderPayload(
  s: GuidedState,
  carId: number,
  clientId: number | null,
): { car_id: number; client_id?: number; client_complaint: string; mileage_in: number } {
  const owner = s.clientPresent === false ? s.match?.owner?.client_id ?? null : null;
  const id = clientId ?? owner;
  return {
    car_id: carId,
    ...(id != null ? { client_id: id } : {}),
    client_complaint: s.defect.trim(),
    mileage_in: Number(onlyDigits(s.km)),
  };
}
