import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, CircleAlert, CircleDot, Pencil } from "lucide-react";
import { celebrate } from "@/components/motion/celebration";
import { AlertBanner, textAreaClass } from "@/components/kit";
import { StepFrame } from "@/components/guided-open/StepFrame";
import { DictationButton } from "@/components/guided-open/DictationButton";
import { PhotoSidesCapture } from "@/components/guided-open/PhotoSidesCapture";
import { CompleteDataSheet } from "@/components/os/CompleteDataSheet";
import type { MissingData, OrderClient } from "@/components/os/types";
import { apiFetch } from "@/lib/api";
import { carTitle, clientLabel } from "@/lib/display";
import { PHOTO_SIDES, type PhotoSide } from "@/lib/guidedOpen";
import { clearPhotos, loadPhotos } from "@/lib/photoStore";
import { nextHint } from "@/lib/wizardMissing";
import { cn } from "@/lib/utils";
import {
  clearFinishDraft,
  emptyFinishState,
  FINISH_STEPS,
  finishMissing,
  loadFinishDraft,
  saveFinishDraft,
  submitFinish,
  VERDICT_LABELS,
  type FinishFiles,
  type FinishProgress,
  type FinishState,
  type FinishStep,
  type FinishVerdict,
} from "@/lib/finishFlow";

type FinishOrder = {
  service_order_id: number;
  status: string;
  client: OrderClient | null;
  car: { brand: string | null; model: string | null; plate: string };
  is_complete: boolean;
  missing_data: MissingData;
  sections: { section_id: number; type: string; status: string }[];
};

const TITLES: Record<FinishStep, { title: string; subtitle?: string }> = {
  verdict: { title: "Como terminou?", subtitle: "Toque numa opção." },
  cause: { title: "Qual era a causa?", subtitle: "Opcional. Entra no laudo do cliente." },
  conclusion: { title: "Como o carro saiu?", subtitle: "Opcional. O cliente lê isso no fechamento." },
  photos: { title: "Fotos de saída", subtitle: "As 4 fotos provam como o carro foi entregue." },
  review: { title: "Conferir e finalizar" },
};

const VERDICT_STYLE: Record<FinishVerdict, { icon: typeof CheckCircle2; className: string }> = {
  resolved: { icon: CheckCircle2, className: "border-brand/50 bg-brand/10 text-brand" },
  partial: { icon: CircleDot, className: "border-warning/50 bg-warning/10 text-warning" },
  not_resolved: { icon: CircleAlert, className: "border-danger/50 bg-danger/10 text-danger" },
};

function safeStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

const emptyFiles = (): FinishFiles => ({ photos: { front: null, rear: null, left: null, right: null }, extraPhotos: [] });

/**
 * Finalizar a OS no mesmo padrão da abertura guiada: uma pergunta por tela, texto guardado como
 * rascunho (o app pode fechar que não perde), fotos de saída pela câmera embutida (guardadas no
 * aparelho) e envio em fila que continua de onde parou se a internet cair.
 */
export function OsFinishPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const navigate = useNavigate();
  const photoScope = `finish-${orderId}`;

  const [order, setOrder] = useState<FinishOrder | null>(null);
  const [loadError, setLoadError] = useState("");
  const [draft] = useState(() => {
    const storage = safeStorage();
    return storage && orderId ? loadFinishDraft(storage, orderId) : null;
  });
  const [state, setState] = useState<FinishState>(() =>
    draft ? { ...draft.state, photos: emptyFinishState().photos, extraPhotos: 0 } : emptyFinishState(),
  );
  const [step, setStep] = useState<FinishStep>(() => draft?.step ?? "verdict");
  const [files, setFiles] = useState<FinishFiles>(emptyFiles);
  const [submitting, setSubmitting] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [pendingParts, setPendingParts] = useState(0);
  const progress = useRef<FinishProgress>({ uploaded: [] });
  const stateRef = useRef(state);

  const patch = (p: Partial<FinishState>) => {
    const next = { ...stateRef.current, ...p };
    stateRef.current = next;
    setState(next);
  };

  const fetchOrder = useCallback(async () => {
    try {
      setOrder(await apiFetch<FinishOrder>(`/service_orders/${orderId}`, { silent: true }));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Não foi possível carregar a OS.");
    }
  }, [orderId]);

  useEffect(() => {
    void fetchOrder();
    apiFetch<{ parts: { used_quantity: number | null }[] }>(`/service_orders/${orderId}/internal`, { silent: true })
      .then((r) => setPendingParts(r.parts.filter((p) => p.used_quantity === null).length))
      .catch(() => setPendingParts(0));
  }, [fetchOrder, orderId]);

  // fotos de saída já tiradas voltam do aparelho (o app pode ter sido fechado no meio)
  useEffect(() => {
    void loadPhotos(photoScope).then((stored) => {
      const restored: Partial<Record<PhotoSide, File>> = {};
      const photos = { ...stateRef.current.photos };
      for (const side of PHOTO_SIDES) {
        if (stored[side]) {
          restored[side] = stored[side];
          photos[side] = true;
        }
      }
      const extras = Object.keys(stored)
        .filter((k) => k.startsWith("extra-"))
        .sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)))
        .map((k) => stored[k]);
      if (!Object.keys(restored).length && !extras.length) return;
      setFiles((f) => ({ photos: { ...f.photos, ...restored }, extraPhotos: extras }));
      patch({ photos, extraPhotos: extras.length });
    });
  }, [photoScope]);

  // texto e tela vão pro rascunho a cada mudança
  useEffect(() => {
    const storage = safeStorage();
    if (storage && orderId) saveFinishDraft(storage, orderId, { state, step });
  }, [state, step, orderId]);

  const index = FINISH_STEPS.indexOf(step);
  const goNext = () => setStep(FINISH_STEPS[Math.min(index + 1, FINISH_STEPS.length - 1)]);
  const goBack = () => (index === 0 ? navigate(`/os/${orderId}`) : setStep(FINISH_STEPS[index - 1]));

  const submit = async () => {
    if (!order) return;
    // dados do cliente/carro pendentes: completa ANTES de subir foto (o backend recusaria o finalizar)
    if (!order.is_complete) {
      setCompleteOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const finalSection = order.sections.find((s) => s.type === "final") ?? null;
      await submitFinish(orderId, finalSection, stateRef.current, files, progress.current, {
        json: (method, path, body) =>
          apiFetch<Record<string, unknown>>(path, { method, ...(body !== undefined ? { json: body } : {}) }),
        upload: async (file, label, sectionId) => {
          const form = new FormData();
          form.append("file", file);
          form.append("section_id", String(sectionId));
          form.append("type", "photo");
          form.append("label", label);
          await apiFetch("/medias", { method: "POST", body: form });
        },
      });
      const storage = safeStorage();
      if (storage) clearFinishDraft(storage, orderId);
      void clearPhotos(photoScope);
      celebrate("OS finalizada");
      navigate("/dashboard");
    } catch {
      // apiFetch já mostrou o erro; tocar de novo continua de onde parou
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <StepFrame index={0} total={1} title="Não deu pra abrir" onBack={() => navigate("/dashboard")}>
        <p className="text-white/80">{loadError}</p>
      </StepFrame>
    );
  }
  if (!order) {
    return (
      <div className="app-glow flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/30 border-t-brand" aria-label="Carregando" />
      </div>
    );
  }

  const missing = finishMissing(step, state);
  const pendingAll = FINISH_STEPS.filter((st) => st !== "review").flatMap((st) => finishMissing(st, state));

  const next = (() => {
    if (step === "verdict") return undefined; // toque na opção já avança
    if (step === "review") {
      return { label: "Finalizar OS", disabled: submitting || pendingAll.length > 0, hint: nextHint(pendingAll), loading: submitting, onNext: submit };
    }
    if (step === "photos") return { label: "Conferir", disabled: missing.length > 0, hint: nextHint(missing), onNext: goNext };
    return { label: "Continuar", disabled: false, onNext: goNext };
  })();

  const textStep = (field: "rootCause" | "conclusion", label: string, placeholder: string) => (
    <div className="flex flex-col gap-3">
      <DictationButton onText={(t) => patch({ [field]: stateRef.current[field].trim() ? `${stateRef.current[field].trim()} ${t}` : t })} />
      <textarea
        aria-label={label}
        value={state[field]}
        onChange={(e) => patch({ [field]: e.target.value })}
        placeholder={placeholder}
        className={textAreaClass}
      />
    </div>
  );

  return (
    <StepFrame index={index} total={FINISH_STEPS.length} title={TITLES[step].title} subtitle={TITLES[step].subtitle} onBack={goBack} next={next}>
      <p className="-mt-3 mb-4 text-sm text-white/60">
        OS #{order.service_order_id} · {carTitle(order.car)} · <span className="font-mono">{order.car.plate}</span> · {clientLabel(order.client?.name)}
      </p>

      {step === "verdict" && pendingParts > 0 && (
        <div className="mb-4">
          <AlertBanner actionLabel="Acertar agora" onAction={() => navigate(`/os/${orderId}/escritorio`)}>
            {pendingParts} peça(s) retirada(s) sem acerto — informe quanto realmente usou.
          </AlertBanner>
        </div>
      )}

      {step === "verdict" && (
        <div className="flex flex-col gap-3">
          {(Object.keys(VERDICT_LABELS) as FinishVerdict[]).map((v) => {
            const { icon: Icon, className } = VERDICT_STYLE[v];
            return (
              <button
                key={v}
                type="button"
                aria-pressed={state.verdict === v}
                onClick={() => {
                  patch({ verdict: v });
                  goNext();
                }}
                className={cn(
                  "flex min-h-20 items-center gap-4 rounded-2xl border-2 px-5 text-left font-display text-2xl font-extrabold uppercase",
                  state.verdict === v ? className : "border-white/10 bg-white/[0.05] text-white",
                )}
              >
                <Icon className="h-8 w-8 shrink-0" aria-hidden="true" />
                {VERDICT_LABELS[v]}
              </button>
            );
          })}
        </div>
      )}

      {step === "cause" && textStep("rootCause", "Causa", "Ex.: vela gasta e cabo com fuga de corrente.")}
      {step === "conclusion" && textStep("conclusion", "Como o carro saiu", "Ex.: motor voltou a funcionar redondo, testado na rua.")}

      {step === "photos" && (
        <PhotoSidesCapture
          photos={files.photos}
          done={state.photos}
          extraPhotos={files.extraPhotos}
          scope={photoScope}
          onPhoto={(slot, file) => {
            if (slot === "extra") {
              setFiles((f) => ({ ...f, extraPhotos: [...f.extraPhotos, file] }));
              patch({ extraPhotos: stateRef.current.extraPhotos + 1 });
            } else {
              setFiles((f) => ({ ...f, photos: { ...f.photos, [slot]: file } }));
              patch({ photos: { ...stateRef.current.photos, [slot]: true } });
            }
          }}
        />
      )}

      {step === "review" && (
        <div className="flex flex-col gap-3">
          {!order.is_complete && (
            <AlertBanner actionLabel="Completar" onAction={() => setCompleteOpen(true)}>
              Faltam dados do cliente ou do carro. Ao finalizar, o sistema pede pra completar antes de enviar as fotos.
            </AlertBanner>
          )}
          {pendingParts > 0 && (
            <AlertBanner actionLabel="Acertar agora" onAction={() => navigate(`/os/${orderId}/escritorio`)}>
              {pendingParts} peça(s) retirada(s) sem acerto — informe quanto realmente usou.
            </AlertBanner>
          )}
          {(
            [
              ["verdict", "Como terminou", state.verdict ? VERDICT_LABELS[state.verdict] : "—"],
              ["cause", "Causa", state.rootCause.trim() || "Não informada"],
              ["conclusion", "Como o carro saiu", state.conclusion.trim() || "Não informado"],
              [
                "photos",
                "Fotos de saída",
                `${PHOTO_SIDES.filter((s) => state.photos[s]).length} de 4${state.extraPhotos ? ` + ${state.extraPhotos} a mais` : ""}`,
              ],
            ] as [FinishStep, string, string][]
          ).map(([target, label, value]) => (
            <div key={target} className="flex items-start gap-3 rounded-2xl bg-white/[0.05] p-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-widest text-white/60">{label}</p>
                <p className="mt-1 whitespace-pre-line text-base">{value}</p>
              </div>
              <button
                type="button"
                aria-label={`Corrigir: ${label}`}
                onClick={() => setStep(target)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]"
              >
                <Pencil className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* só monta aberto (o sheet mexe no tema do body) */}
      {completeOpen && (
        <CompleteDataSheet
          orderId={order.service_order_id}
          open={completeOpen}
          missing={order.missing_data}
          currentClient={order.client}
          onClose={() => setCompleteOpen(false)}
          onCompleted={async () => {
            await fetchOrder();
            toast.success("Dados completos — agora é só finalizar.");
          }}
        />
      )}
    </StepFrame>
  );
}
