// Envio da abertura guiada, em ordem e RETOMÁVEL: se algo cai no meio (4G), tocar "Abrir OS" de novo
// continua de onde parou — nada é criado duas vezes e foto já enviada não sobe de novo.
// Uploads vão um de cada vez: o servidor aceita só 4 envios simultâneos no total.
import { buildCarPayload, buildOrderPayload, type GuidedState, type PhotoSide } from "./guidedOpen";
import { intakeQuestions } from "./intakeQuestions";
import { onlyDigits } from "./validators";

export type SubmitFiles = {
  photos: Record<PhotoSide, File | null>;
  extraPhotos: File[];
  audio: File | null;
  video: File | null;
};

export type SubmitProgress = {
  clientId?: number;
  carId?: number;
  carPatched?: boolean;
  orderId?: number;
  intakeId?: number;
  intakePublished?: boolean;
  checkinId?: number;
  checkinPublished?: boolean;
  /** rótulos de mídia já enviados (não reenviar) */
  uploaded: string[];
};

export const emptySubmitProgress = (): SubmitProgress => ({ uploaded: [] });

export type SubmitDeps = {
  json: (method: "POST" | "PATCH", path: string, body?: unknown) => Promise<Record<string, unknown>>;
  upload: (file: File, label: string, sectionId: number, type: "photo" | "video" | "audio") => Promise<void>;
};

// Mesmos rótulos do wizard antigo: o dashboard usa "Frente do veículo" pra miniatura do card.
export const PHOTO_MEDIA_LABELS: Record<PhotoSide, string> = {
  front: "Frente do veículo",
  rear: "Traseira do veículo",
  left: "Lado esquerdo do veículo",
  right: "Lado direito do veículo",
};

function answersText(answers: Record<string, string>): string {
  return intakeQuestions
    .filter((q) => answers[q.key]?.trim())
    .map((q) => `${q.label}\nR: ${answers[q.key].trim()}`)
    .join("\n\n");
}

/**
 * Cria (se ainda não criou) cliente → carro → OS → etapa do relato → etapa de check-in com as fotos,
 * gravando cada passo em `progress`. Erro do cliente (ex.: CPF de outro) sobe como exceção da `deps.json`.
 */
export async function submitGuidedOpen(
  state: GuidedState,
  files: SubmitFiles,
  progress: SubmitProgress,
  deps: SubmitDeps,
): Promise<{ orderId: number }> {
  const uploadOnce = async (file: File, label: string, sectionId: number, type: "photo" | "video" | "audio") => {
    if (progress.uploaded.includes(label)) return;
    await deps.upload(file, label, sectionId, type);
    progress.uploaded.push(label);
  };

  let clientId: number | null = state.clientPresent ? state.client.client_id : null;
  if (state.clientPresent && clientId === null) {
    if (!progress.clientId) {
      const c = state.client;
      const res = await deps.json("POST", "/clients", {
        name: c.name.trim(),
        phone: c.phone,
        ...(c.cpf ? { cpf: onlyDigits(c.cpf) } : {}),
        ...(c.email.trim() ? { email: c.email.trim() } : {}),
        ...(c.address.trim() ? { address: c.address.trim() } : {}),
      });
      progress.clientId = res.client_id as number;
    }
    clientId = progress.clientId;
  }

  const carPayload = buildCarPayload(state);
  if (!progress.carId) {
    if (carPayload && "create" in carPayload) {
      const car = await deps.json("POST", "/cars", { ...carPayload.create, ...(clientId ? { client_id: clientId } : {}) });
      progress.carId = car.car_id as number;
    } else {
      progress.carId = state.match!.car_id;
    }
  }
  if (!progress.carPatched && carPayload && "patch" in carPayload) {
    await deps.json("PATCH", `/cars/${carPayload.patch.car_id}`, carPayload.patch.body);
    progress.carPatched = true;
  }

  if (!progress.orderId) {
    const order = await deps.json("POST", "/service_orders", buildOrderPayload(state, progress.carId, clientId));
    progress.orderId = order.service_order_id as number;
  }
  const orderId = progress.orderId;

  const notes = answersText(state.answers);
  if (notes || files.audio || files.video) {
    if (!progress.intakeId) {
      const intake = await deps.json("POST", "/sections", { service_order_id: orderId, type: "intake", notes: notes || null });
      progress.intakeId = intake.section_id as number;
    }
    if (files.audio) await uploadOnce(files.audio, "Áudio do defeito", progress.intakeId, "audio");
    if (files.video) await uploadOnce(files.video, "Vídeo do defeito", progress.intakeId, "video");
    if (!progress.intakePublished) {
      await deps.json("PATCH", `/sections/${progress.intakeId}/publish`);
      progress.intakePublished = true;
    }
  }

  if (!progress.checkinId) {
    const checkin = await deps.json("POST", "/sections", {
      service_order_id: orderId,
      type: "checkin",
      notes: "Registro fotográfico da entrada do veículo.",
    });
    progress.checkinId = checkin.section_id as number;
  }
  for (const side of Object.keys(PHOTO_MEDIA_LABELS) as PhotoSide[]) {
    const file = files.photos[side];
    if (file) await uploadOnce(file, PHOTO_MEDIA_LABELS[side], progress.checkinId, "photo");
  }
  for (const [i, file] of files.extraPhotos.entries()) {
    await uploadOnce(file, `Detalhe adicional ${i + 1}`, progress.checkinId, "photo");
  }
  if (!progress.checkinPublished) {
    await deps.json("PATCH", `/sections/${progress.checkinId}/publish`);
    progress.checkinPublished = true;
  }

  return { orderId };
}
