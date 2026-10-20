import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BrandStep, ModelStep, YearStep } from "@/components/guided-open/ChoiceSteps";
import { ClientStep } from "@/components/guided-open/ClientStep";
import { DefectStep, ExtrasStep, KmStep } from "@/components/guided-open/DetailSteps";
import { PhotosStep } from "@/components/guided-open/PhotosStep";
import { PlateStep } from "@/components/guided-open/PlateStep";
import { ReviewStep } from "@/components/guided-open/ReviewStep";
import { StepFrame } from "@/components/guided-open/StepFrame";
import { emptyGuidedFiles, type GuidedFiles } from "@/components/guided-open/types";
import { celebrate } from "@/components/motion/celebration";
import { useDarkTheme } from "@/hooks/useDarkTheme";
import { ApiError, apiFetch } from "@/lib/api";
import {
  buildCarPayload,
  buildOrderPayload,
  emptyGuidedState,
  missingFor,
  stepsFor,
  type GuidedState,
  type PhotoSide,
  type StepId,
} from "@/lib/guidedOpen";
import { intakeQuestions } from "@/lib/intakeQuestions";
import { clearOsDraft, loadGuidedDraft, saveGuidedDraft } from "@/lib/osDraft";
import { onlyDigits } from "@/lib/validators";
import { nextHint } from "@/lib/wizardMissing";

// Mesmos rótulos do wizard antigo: o dashboard usa "Frente do veículo" pra miniatura do card.
const PHOTO_MEDIA_LABELS: Record<PhotoSide, string> = {
  front: "Frente do veículo",
  rear: "Traseira do veículo",
  left: "Lado esquerdo do veículo",
  right: "Lado direito do veículo",
};

const TITLES: Record<StepId, { title: string; subtitle?: string }> = {
  plate: { title: "Qual a placa?" },
  brand: { title: "Qual a marca?" },
  model: { title: "Qual o modelo?" },
  year: { title: "De que ano?" },
  km: { title: "Quanto marca o painel?" },
  extras: { title: "Se souber", subtitle: "Tudo aqui é opcional. Pode pular." },
  defect: { title: "O que o carro tem?", subtitle: "Fica registrado como o carro chegou." },
  client: { title: "O cliente está aqui?" },
  photos: { title: "Fotos do carro", subtitle: "As 4 fotos protegem você se o cliente reclamar de risco." },
  review: { title: "Tudo certo?", subtitle: "Toque num item pra corrigir." },
};

function safeStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function answersText(answers: Record<string, string>): string {
  return intakeQuestions
    .filter((q) => answers[q.key]?.trim())
    .map((q) => `${q.label}\nR: ${answers[q.key].trim()}`)
    .join("\n\n");
}

/** Abertura de OS guiada: uma pergunta por tela, começando pela placa. */
export function GuidedOpenPage() {
  useDarkTheme();
  const navigate = useNavigate();
  const [draft] = useState(() => {
    const storage = safeStorage();
    return storage ? loadGuidedDraft(storage) : null;
  });
  const [state, setState] = useState<GuidedState>(() => draft?.state ?? emptyGuidedState());
  // fotos não ficam no rascunho: quem já tinha passado delas volta pra tela das fotos
  const [stepId, setStepId] = useState<StepId>(() => (draft?.step === "review" ? "photos" : draft?.step ?? "plate"));
  const [files, setFiles] = useState<GuidedFiles>(emptyGuidedFiles);
  const [submitting, setSubmitting] = useState(false);
  // o que já foi criado num envio que falhou no meio — tocar de novo não repete
  const created = useRef<{ clientId?: number; carId?: number; orderId?: number }>({});

  const steps = stepsFor(state);
  const index = Math.max(0, steps.indexOf(stepId));
  const current = steps[index];

  // fotos/áudio/vídeo não entram no rascunho: ao recuperar, volta pras fotos se já tinha passado delas
  const draftToastShown = useRef(false);
  useEffect(() => {
    if (!draft || draftToastShown.current) return;
    draftToastShown.current = true;
    patch({ photos: { front: false, rear: false, left: false, right: false }, extraPhotos: 0, hasAudio: false, hasVideo: false });
    toast("Rascunho recuperado", {
      description: "Continuamos de onde você parou. Fotos, áudio e vídeo precisam ser feitos de novo.",
      duration: 10000,
      action: {
        label: "Começar do zero",
        onClick: () => {
          const storage = safeStorage();
          if (storage) clearOsDraft(storage);
          window.location.reload();
        },
      },
    });
  }, [draft]);

  useEffect(() => {
    const storage = safeStorage();
    if (storage && state.plate.trim()) saveGuidedDraft(storage, { state, step: current });
  }, [state, current]);

  // estado mais recente: telas que mudam o estado e já avançam no mesmo toque (placa reconhecida,
  // marca/modelo/ano) precisam que o "próximo" seja calculado com o estado novo
  const stateRef = useRef(state);
  const patch = (p: Partial<GuidedState>) => {
    const nextState = { ...stateRef.current, ...p };
    stateRef.current = nextState;
    setState(nextState);
  };
  const goNext = () =>
    setStepId((prev) => {
      const list = stepsFor(stateRef.current);
      const i = list.indexOf(prev);
      return list[Math.min(i + 1, list.length - 1)];
    });
  const goBack = () => {
    if (index === 0) {
      navigate("/dashboard");
      return;
    }
    setStepId(steps[index - 1]);
  };

  const upload = async (file: File, label: string, sectionId: number, type: "photo" | "video" | "audio") => {
    const form = new FormData();
    form.append("file", file);
    form.append("section_id", String(sectionId));
    form.append("type", type);
    form.append("label", label);
    await apiFetch("/medias", { method: "POST", body: form });
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      let clientId: number | null = state.clientPresent ? state.client.client_id : null;
      if (state.clientPresent && clientId === null) {
        if (!created.current.clientId) {
          const c = state.client;
          try {
            const res = await apiFetch<{ client_id: number }>("/clients", {
              method: "POST",
              silent: true,
              json: {
                name: c.name.trim(),
                phone: c.phone,
                ...(c.cpf ? { cpf: onlyDigits(c.cpf) } : {}),
                ...(c.email.trim() ? { email: c.email.trim() } : {}),
                ...(c.address.trim() ? { address: c.address.trim() } : {}),
              },
            });
            created.current.clientId = res.client_id;
          } catch (err) {
            const existing = err instanceof ApiError ? (err.body as { existing_client?: { client_id: number; name: string } })?.existing_client : undefined;
            if (existing) {
              toast.error(`Este CPF já é do cliente ${existing.name}.`, {
                duration: 15000,
                action: { label: "Usar esse cadastro", onClick: () => patch({ client: { ...state.client, client_id: existing.client_id, name: existing.name } }) },
              });
            } else {
              toast.error(err instanceof Error ? err.message : "Não foi possível salvar o cliente.");
            }
            return;
          }
        }
        clientId = created.current.clientId ?? null;
      }

      if (!created.current.carId) {
        const carPayload = buildCarPayload(state);
        if (carPayload && "create" in carPayload) {
          const car = await apiFetch<{ car_id: number }>("/cars", {
            method: "POST",
            json: { ...carPayload.create, ...(clientId ? { client_id: clientId } : {}) },
          });
          created.current.carId = car.car_id;
        } else {
          if (carPayload && "patch" in carPayload) {
            await apiFetch(`/cars/${carPayload.patch.car_id}`, { method: "PATCH", json: carPayload.patch.body });
          }
          created.current.carId = state.match!.car_id;
        }
      }
      const carId = created.current.carId;

      if (!created.current.orderId) {
        const order = await apiFetch<{ service_order_id: number }>("/service_orders", {
          method: "POST",
          json: buildOrderPayload(state, carId, clientId),
        });
        created.current.orderId = order.service_order_id;
      }
      const orderId = created.current.orderId;

      const notes = answersText(state.answers);
      if (notes || files.audio || files.video) {
        const intake = await apiFetch<{ section_id: number }>("/sections", {
          method: "POST",
          json: { service_order_id: orderId, type: "intake", notes: notes || null },
        });
        await Promise.all([
          files.audio ? upload(files.audio, "Áudio do defeito", intake.section_id, "audio") : null,
          files.video ? upload(files.video, "Vídeo do defeito", intake.section_id, "video") : null,
        ]);
        await apiFetch(`/sections/${intake.section_id}/publish`, { method: "PATCH" });
      }

      const checkin = await apiFetch<{ section_id: number }>("/sections", {
        method: "POST",
        json: { service_order_id: orderId, type: "checkin", notes: "Registro fotográfico da entrada do veículo." },
      });
      await Promise.all([
        ...(Object.keys(PHOTO_MEDIA_LABELS) as PhotoSide[]).map((side) =>
          files.photos[side] ? upload(files.photos[side] as File, PHOTO_MEDIA_LABELS[side], checkin.section_id, "photo") : null,
        ),
        ...files.extraPhotos.map((file, i) => upload(file, `Detalhe adicional ${i + 1}`, checkin.section_id, "photo")),
      ]);
      await apiFetch(`/sections/${checkin.section_id}/publish`, { method: "PATCH" });

      const storage = safeStorage();
      if (storage) clearOsDraft(storage);
      celebrate("OS aberta");
      navigate(`/os/${orderId}`);
    } catch {
      // apiFetch já mostrou o erro; o que foi criado fica guardado em `created` pra não repetir
    } finally {
      setSubmitting(false);
    }
  };

  const missing = missingFor(current, state);
  const ownerConfirm =
    current === "client" && state.clientPresent === true && state.match?.owner != null && state.client.client_id === state.match.owner.client_id;

  const next = (() => {
    if (current === "plate" || current === "brand" || current === "model" || current === "year") return undefined;
    if (current === "client" && (state.clientPresent === null || ownerConfirm)) return undefined;
    if (current === "review") {
      // defesa: nada que é obrigatório pode faltar na hora de abrir (ex.: rascunho recuperado sem fotos)
      const pending = steps.filter((st) => st !== "review").flatMap((st) => missingFor(st, state));
      return { label: "Abrir OS", disabled: submitting || pending.length > 0, hint: nextHint(pending), loading: submitting, onNext: submit };
    }
    if (current === "photos") return { label: "Conferir", disabled: missing.length > 0, hint: nextHint(missing), onNext: goNext };
    if (current === "extras") return { label: "Continuar", disabled: false, onNext: goNext };
    return { disabled: missing.length > 0, hint: nextHint(missing), onNext: goNext };
  })();

  const stepProps = { state, onChange: patch, onNext: goNext };
  const fileProps = { ...stepProps, files, onFiles: (p: Partial<GuidedFiles>) => setFiles((f) => ({ ...f, ...p })) };

  const title =
    current === "model" && state.brand ? `Qual ${state.brand}?` : TITLES[current].title;

  return (
    <StepFrame index={index} total={steps.length} title={title} subtitle={TITLES[current].subtitle} onBack={goBack} next={next}>
      {current === "plate" && <PlateStep {...stepProps} />}
      {current === "brand" && <BrandStep {...stepProps} />}
      {current === "model" && <ModelStep {...stepProps} />}
      {current === "year" && <YearStep {...stepProps} />}
      {current === "km" && <KmStep {...stepProps} />}
      {current === "extras" && <ExtrasStep {...stepProps} />}
      {current === "defect" && <DefectStep {...fileProps} />}
      {current === "client" && <ClientStep {...stepProps} />}
      {current === "photos" && <PhotosStep {...fileProps} />}
      {current === "review" && <ReviewStep state={state} files={files} onEdit={(step) => setStepId(step)} />}
    </StepFrame>
  );
}
