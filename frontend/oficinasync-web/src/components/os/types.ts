import type { TestTypeCategory } from "@/components/tests/testTypes";

/** Tipos da visão do mecânico (GET /service_orders/:id). */

export type MediaItem = {
  media_id: number;
  type: string;
  bucket: string;
  object_name: string;
  mime_type: string;
  size: number;
  label: string | null;
  created_at: string;
  url?: string;
};

export type TestMeasurement = {
  label: string;
  expected?: string;
  actual: string;
};

export type Verdict = "approved" | "failed" | "inconclusive";

export type TestItem = {
  test_id: number;
  title: string;
  measurements: TestMeasurement[] | null;
  test_type: TestTypeCategory | null;
  data: Record<string, unknown> | null;
  verdict: Verdict | null;
  notes: string | null;
  created_at: string;
};

export type SectionItem = {
  section_id: number;
  type: string;
  status: string;
  notes: string | null;
  published_at: string | null;
  created_at: string;
  medias: MediaItem[];
  tests: TestItem[];
};

export type ServiceOrderData = {
  service_order_id: number;
  status: string;
  client_complaint: string;
  created_at: string;
  finished_at?: string | null;
  promo_video_status?: "none" | "processing" | "ready" | "failed";
  public_token: string;
  public_url: string;
  tenant: { name: string };
  user: { user_id: number; name: string; email: string };
  car: {
    car_id: number;
    brand: string;
    model: string;
    year: number;
    plate: string;
    mileage_in: number;
    color: string;
    fuel_type: string;
  };
  client: { name: string; phone: string; email: string; cpf: string };
  sections: SectionItem[];
};

/** Ordem e rótulos das etapas do ciclo da OS. */

export const sectionOrder = [
  "checkin",
  "obd_scan",
  "diagnosis",
  "repair",
  "preventive",
  "final",
] as const;

export const sectionLabels: Record<string, string> = {
  checkin: "Check-in",
  obd_scan: "Scanner / OBD",
  diagnosis: "Diagnóstico",
  repair: "Reparo",
  preventive: "Inspeção Geral",
  final: "Finalização",
};

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
