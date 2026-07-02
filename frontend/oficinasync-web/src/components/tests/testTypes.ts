export type TestTypeCategory =
  | "compressao_mecanica"
  | "leitura_dtc"
  | "bateria"
  | "injetores_banco";

export const testTypeLabels: Record<TestTypeCategory, string> = {
  compressao_mecanica: "Compressão Mecânica",
  leitura_dtc: "Leitura de DTC",
  bateria: "Bateria",
  injetores_banco: "Injetores no Banco",
};

export const testTypeIcons: Record<TestTypeCategory, string> = {
  compressao_mecanica: "🔧",
  leitura_dtc: "🔍",
  bateria: "🔋",
  injetores_banco: "💉",
};

// Status por item (cilindro/injetor) reaproveita o mesmo vocabulário do veredito geral.
export type ItemStatus = "approved" | "failed" | "inconclusive";

export const itemStatusLabels: Record<ItemStatus, string> = {
  approved: "OK",
  failed: "Crítico",
  inconclusive: "Atenção",
};

export function getItemStatusPillClass(status: ItemStatus | null | undefined) {
  const map: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
    inconclusive: "bg-amber-100 text-amber-700",
  };

  return status ? map[status] ?? "bg-muted text-foreground" : "bg-muted text-foreground";
}

// --- Compressão Mecânica ---

export type CompressaoUnit = "psi" | "bar" | "kgf";

export interface CompressaoCylinder {
  number: number;
  value: string;
  media_id: number | null;
  previewUrl: string | null;
  status: ItemStatus | "";
}

export interface CompressaoMecanicaData {
  tool: string;
  unit: CompressaoUnit;
  specMin: string;
  specMax: string;
  cylinders: CompressaoCylinder[];
}

export function emptyCompressaoData(): CompressaoMecanicaData {
  return {
    tool: "",
    unit: "psi",
    specMin: "",
    specMax: "",
    cylinders: [1, 2, 3, 4].map((number) => ({
      number,
      value: "",
      media_id: null,
      previewUrl: null,
      status: "",
    })),
  };
}

// --- Leitura de DTC ---

export type DtcStatus = "confirmado" | "intermitente" | "passado" | "eliminado";

export const dtcStatusLabels: Record<DtcStatus, string> = {
  confirmado: "Confirmado",
  intermitente: "Intermitente",
  passado: "Passado",
  eliminado: "Eliminado",
};

export function getDtcStatusPillClass(status: DtcStatus) {
  const map: Record<DtcStatus, string> = {
    confirmado: "bg-red-100 text-red-700",
    intermitente: "bg-amber-100 text-amber-700",
    passado: "bg-blue-100 text-blue-700",
    eliminado: "bg-emerald-100 text-emerald-700",
  };

  return map[status] ?? "bg-muted text-foreground";
}

export interface DtcCode {
  code: string;
  description: string;
  module: string;
  status: DtcStatus;
}

export interface LeituraDtcData {
  scanner: string;
  dtcs: DtcCode[];
  systemsOk: string;
}

export function emptyLeituraDtcData(): LeituraDtcData {
  return {
    scanner: "",
    dtcs: [{ code: "", description: "", module: "", status: "confirmado" }],
    systemsOk: "",
  };
}

// --- Bateria ---

export interface BateriaData {
  tool: string;
  tensaoRepouso: string;
  tensaoMinPartida: string;
  tensaoMaxCarga: string;
  quedaTensao: string;
  tempArrefecimento: string;
  resultado: "APROVADA" | "INSPECAO" | "REPROVADA" | "";
}

export function emptyBateriaData(): BateriaData {
  return {
    tool: "",
    tensaoRepouso: "",
    tensaoMinPartida: "",
    tensaoMaxCarga: "",
    quedaTensao: "",
    tempArrefecimento: "",
    resultado: "",
  };
}

// --- Injetores no Banco ---

export type SprayPattern = "OK" | "IRREGULAR" | "ENTUPIDO" | "GOTEJANDO";

export interface InjetorItem {
  number: number;
  value: string;
  sprayPattern: SprayPattern;
}

export interface InjetoresBancoData {
  tool: string;
  pulsos: string;
  unit: "ml" | "cc";
  specMin: string;
  specMax: string;
  fotoAntesMediaId: number | null;
  fotoAntesPreviewUrl: string | null;
  fotoDepoisMediaId: number | null;
  fotoDepoisPreviewUrl: string | null;
  injectors: InjetorItem[];
}

export function emptyInjetoresBancoData(): InjetoresBancoData {
  return {
    tool: "",
    pulsos: "",
    unit: "ml",
    specMin: "",
    specMax: "",
    fotoAntesMediaId: null,
    fotoAntesPreviewUrl: null,
    fotoDepoisMediaId: null,
    fotoDepoisPreviewUrl: null,
    injectors: [1, 2, 3, 4].map((number) => ({
      number,
      value: "",
      sprayPattern: "OK",
    })),
  };
}

export function resolveMediaUrl(
  mediaId: number | null,
  sectionMedias: { media_id: number; url?: string }[],
): string | null {
  if (!mediaId) return null;
  return sectionMedias.find((m) => m.media_id === mediaId)?.url ?? null;
}
