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
  emptyGuidedState,
  missingFor,
  stepsFor,
  type GuidedState,
  type StepId,
} from "@/lib/guidedOpen";
import { clearOsDraft, loadGuidedDraft, saveGuidedDraft } from "@/lib/osDraft";
import { emptySubmitProgress, submitGuidedOpen, type SubmitProgress } from "@/lib/guidedSubmit";
import { nextHint } from "@/lib/wizardMissing";

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
  // o que já foi criado/enviado num envio que falhou no meio — tocar de novo continua de onde parou
  const progress = useRef<SubmitProgress>(emptySubmitProgress());

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

  const submit = async () => {
    setSubmitting(true);
    try {
      const { orderId } = await submitGuidedOpen(state, files, progress.current, {
        json: (method, path, body) =>
          apiFetch<Record<string, unknown>>(path, { method, ...(body !== undefined ? { json: body } : {}), silent: path === "/clients" }),
        upload: async (file, label, sectionId, type) => {
          const form = new FormData();
          form.append("file", file);
          form.append("section_id", String(sectionId));
          form.append("type", type);
          form.append("label", label);
          await apiFetch("/medias", { method: "POST", body: form });
        },
      });
      const storage = safeStorage();
      if (storage) clearOsDraft(storage);
      celebrate("OS aberta");
      navigate(`/os/${orderId}`);
    } catch (err) {
      // CPF de outro cliente: oferece o cadastro existente (os outros erros o apiFetch já mostrou)
      const existing = err instanceof ApiError ? (err.body as { existing_client?: { client_id: number; name: string } })?.existing_client : undefined;
      if (existing) {
        toast.error(`Este CPF já é do cliente ${existing.name}.`, {
          duration: 15000,
          action: {
            label: "Usar esse cadastro",
            onClick: () => patch({ client: { ...stateRef.current.client, client_id: existing.client_id, name: existing.name } }),
          },
        });
      } else if (err instanceof ApiError && err.status === 409) {
        toast.error(err.message);
      }
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
      {current === "review" && (
        <ReviewStep
          state={state}
          files={files}
          onEdit={(step) => {
            // editar o cliente reabre "o cliente está aqui?" (ele pode ter chegado depois)
            if (step === "client") patch({ clientPresent: null });
            setStepId(step);
          }}
        />
      )}
    </StepFrame>
  );
}
