import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Activity,
  ArrowLeft,
  Boxes,
  ClipboardList,
  Clapperboard,
  Copy,
  ExternalLink,
  FileText,
  Flag,
  Loader2,
  MoreHorizontal,
  Plus,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { API_URL, apiFetch } from "@/lib/api";
import { useDarkTheme } from "@/hooks/useDarkTheme";
import { Lightbox, type LightboxMedia } from "@/components/media/Lightbox";
import { ArrivalCard } from "@/components/os/ArrivalCard";
import { MoreActionsSheet, type MoreAction } from "@/components/os/MoreActionsSheet";
import { SpeakSheet } from "@/components/os/SpeakSheet";
import { AllDoneCard, StepNowCard, StepProgress, StepRow } from "@/components/os/StepNow";
import { AddTestSheet } from "@/components/os/AddTestSheet";
import { AddFindingSheet } from "@/components/os/AddFindingSheet";
import { MediaUploadSheet } from "@/components/os/MediaUploadSheet";
import { EditNotesSheet } from "@/components/os/EditNotesSheet";
import { CompleteDataSheet } from "@/components/os/CompleteDataSheet";
import { carTitle, clientLabel, kmLabel } from "@/lib/display";
import { whatsappShareUrl } from "@/lib/whatsapp";
import { EditTestSheet } from "@/components/os/EditTestSheet";
import { celebrate } from "@/components/motion/celebration";
import { CreateSectionSheet } from "@/components/os/CreateSectionSheet";
import {
  sectionLabels,
  visibleStepTypes,
  type SectionItem,
  type ServiceOrderData,
  type TestItem,
} from "@/components/os/types";
import { currentStep, listedSections, mainSteps, MAIN_STEPS } from "@/lib/osFlow";

const statusChip: Record<string, { label: string; className: string }> = {
  open: { label: "Em aberto", className: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
  in_progress: { label: "Em andamento", className: "border-blue-400/30 bg-blue-400/10 text-blue-300" },
  done: { label: "Concluída", className: "border-brand/30 bg-brand/10 text-brand" },
  cancelled: { label: "Cancelada", className: "border-red-400/30 bg-red-400/10 text-red-300" },
};

type Confirm =
  | { kind: "publish"; section: SectionItem }
  | { kind: "delete-test"; test: TestItem }
  | null;

/**
 * Tela da OS "uma etapa por vez": como o carro chegou (sempre no topo), a etapa da vez com 4 botões
 * grandes e "Pronto, mostrar ao cliente", e as etapas feitas embaixo. O resto fica em "Mais ações".
 * Spec: docs/superpowers/specs/2026-10-20-tela-da-os-modo-simples-design.md
 */
export function OsWorkPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  useDarkTheme();

  const [data, setData] = useState<ServiceOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // sheets (um por vez, cada um dono do próprio formulário)
  const [addTestSectionId, setAddTestSectionId] = useState<number | null>(null);
  const [addFindingSectionId, setAddFindingSectionId] = useState<number | null>(null);
  const [addMediaSectionId, setAddMediaSectionId] = useState<number | null>(null);
  const [editNotesSection, setEditNotesSection] = useState<SectionItem | null>(null);
  const [editTest, setEditTest] = useState<{ test: TestItem; sectionId: number } | null>(null);
  const [editingFinding, setEditingFinding] = useState<{ test: TestItem; sectionId: number } | null>(null);
  const [createSectionType, setCreateSectionType] = useState<string | null>(null);
  const [speakOpen, setSpeakOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [ensuring, setEnsuring] = useState(false);

  // confirmações e ações longas
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [canSeeSheet, setCanSeeSheet] = useState(false);
  const [triggeringVideo, setTriggeringVideo] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<LightboxMedia | null>(null);

  // scanner OBD da oficina — a coleta só aparece com um dongle online
  const [obdDevices, setObdDevices] = useState<{ device_id: number; name: string; online: boolean }[]>([]);
  const [capturingObd, setCapturingObd] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch<{ can: { see_sheet: boolean } }>(`/service_orders/${id}/internal`, { silent: true })
      .then((r) => setCanSeeSheet(r.can.see_sheet))
      .catch(() => setCanSeeSheet(false));
  }, [id]);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      const result = await apiFetch<ServiceOrderData>(`/service_orders/${id}`, { silent: true });
      setData(result);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a OS.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // polling do vídeo de divulgação enquanto processa
  useEffect(() => {
    if (data?.promo_video_status !== "processing") return;
    const interval = setInterval(fetchOrder, 4000);
    return () => clearInterval(interval);
  }, [data?.promo_video_status, fetchOrder]);

  // status dos scanners OBD
  useEffect(() => {
    const loadDevices = async () => {
      try {
        setObdDevices(await apiFetch<{ device_id: number; name: string; online: boolean }[]>("/obd/devices", { silent: true }));
      } catch {
        // sem scanner cadastrado / sem permissão — a opção simplesmente não aparece
      }
    };
    loadDevices();
    const interval = setInterval(loadDevices, 15000);
    return () => clearInterval(interval);
  }, []);

  const onlineObdDevice = useMemo(() => obdDevices.find((device) => device.online) ?? null, [obdDevices]);

  const sections = useMemo(() => data?.sections ?? [], [data]);
  const steps = useMemo(() => mainSteps(sections), [sections]);
  const stepNow = useMemo(() => {
    const type = currentStep(sections);
    return type ? (steps.find((st) => st.type === type) ?? null) : null;
  }, [sections, steps]);
  const listed = useMemo(() => listedSections(sections), [sections]);
  const findSection = (sectionId: number | null | undefined) => sections.find((x) => x.section_id === sectionId);

  const promoVideoMedia = useMemo(
    () => sections.flatMap((s) => s.medias).find((m) => m.label === "Vídeo de divulgação" && m.url),
    [sections],
  );

  /* ------------------------- ações ------------------------- */

  // a etapa da vez nasce no primeiro toque (Falar/Foto/Teste/Achado) — sem passo de "criar etapa"
  const ensureCurrentSection = async (): Promise<number> => {
    if (!data || !stepNow) throw new Error("sem etapa da vez");
    if (stepNow.section) return stepNow.section.section_id;
    const created = await apiFetch<{ section_id: number }>("/sections", {
      method: "POST",
      json: { service_order_id: data.service_order_id, type: stepNow.type },
    });
    await fetchOrder();
    return created.section_id;
  };

  const withCurrentSection = async (open: (sectionId: number) => void) => {
    try {
      setEnsuring(true);
      open(await ensureCurrentSection());
    } catch {
      // apiFetch já mostrou o erro
    } finally {
      setEnsuring(false);
    }
  };

  const captureObd = async () => {
    if (!onlineObdDevice || !data) return;
    try {
      setCapturingObd(true);
      await apiFetch("/obd/capture", {
        method: "POST",
        json: { device_id: onlineObdDevice.device_id, service_order_id: data.service_order_id },
      });
      toast.success("Leitura OBD anexada à etapa Scanner/OBD!");
      await fetchOrder();
    } catch {
      // apiFetch já mostrou o toast de erro (ex: leitura antiga demais)
    } finally {
      setCapturingObd(false);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    try {
      setConfirmBusy(true);
      if (confirm.kind === "publish") {
        await apiFetch(`/sections/${confirm.section.section_id}/publish`, { method: "PATCH" });
        celebrate("O cliente já pode ver");
      } else {
        await apiFetch(`/tests/${confirm.test.test_id}`, { method: "DELETE" });
        toast.success("Teste excluído.");
      }
      setConfirm(null);
      await fetchOrder();
    } catch {
      // apiFetch já mostrou o toast de erro
    } finally {
      setConfirmBusy(false);
    }
  };

  const copyClientLink = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.public_url);
      toast.success("Link copiado! É só mandar pro cliente.");
    } catch {
      // alguns celulares bloqueiam a cópia automática — mostra o link pra copiar na mão
      toast.error("Não deu pra copiar automático", {
        description: `Segure o dedo no link e copie: ${data.public_url}`,
        duration: 15000,
      });
    }
  };

  const downloadReport = async () => {
    const token = localStorage.getItem("token");
    if (!token || !id) return;
    try {
      setDownloadingReport(true);
      const response = await fetch(`${API_URL}/service_orders/${id}/report.pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        toast.error("Não foi possível gerar o laudo agora.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `laudo-os-${id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Laudo gerado!");
    } catch {
      toast.error("Sem conexão com o servidor.");
    } finally {
      setDownloadingReport(false);
    }
  };

  const generatePromoVideo = async () => {
    if (!id) return;
    try {
      setTriggeringVideo(true);
      await apiFetch(`/service_orders/${id}/promo-video`, { method: "POST" });
      toast.success("Gerando o vídeo — isso leva alguns minutos.");
      await fetchOrder();
    } catch {
      // apiFetch já mostrou o toast de erro
    } finally {
      setTriggeringVideo(false);
    }
  };

  /* ------------------------- estados ------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-brand" />
          <p className="text-sm text-muted-foreground">Carregando a OS...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold text-foreground">Não foi possível abrir esta OS</h1>
          <p className="mt-3 text-sm text-muted-foreground">{error || "Ordem de serviço não encontrada."}</p>
          <Button className="mt-6 h-12" variant="outline" onClick={() => navigate("/dashboard")}>
            Voltar para o início
          </Button>
        </div>
      </div>
    );
  }

  const chip = statusChip[data.status] ?? statusChip.open;
  const videoStatus = data.promo_video_status ?? "none";
  const whatsappUrl = whatsappShareUrl({
    phone: data.client?.phone,
    clientName: data.client?.name,
    carName: carTitle(data.car),
    link: data.public_url,
  });

  const handlers = {
    onEditNotes: (section: SectionItem) => setEditNotesSection(section),
    onEditTest: (section: SectionItem, test: TestItem) =>
      test.test_type === "achado_adicional"
        ? setEditingFinding({ test, sectionId: section.section_id })
        : setEditTest({ test, sectionId: section.section_id }),
    onDeleteTest: (test: TestItem) => setConfirm({ kind: "delete-test", test }),
    onOpenMedia: setLightboxMedia,
  };
  const isPublishing = (section: SectionItem | null) =>
    Boolean(section && confirmBusy && confirm?.kind === "publish" && confirm.section.section_id === section.section_id);

  const existingTypes = new Set(sections.map((x) => x.type));
  const mainTypes: readonly string[] = MAIN_STEPS;
  const extraTypesToCreate = visibleStepTypes(existingTypes, import.meta.env.VITE_FEATURE_OBD === "true").filter(
    (type) => !mainTypes.includes(type) && !existingTypes.has(type),
  );

  const videoActions: MoreAction[] =
    videoStatus === "ready" && promoVideoMedia?.url
      ? [{ label: "Baixar vídeo", icon: <Clapperboard />, onClick: () => window.open(promoVideoMedia.url, "_blank") }]
      : data.features?.promo_video
        ? [
            {
              label: videoStatus === "failed" ? "Vídeo falhou — tentar de novo" : "Gerar vídeo",
              icon: videoStatus === "processing" ? <Loader2 className="animate-spin" /> : <Clapperboard />,
              detail: videoStatus === "processing" ? "Gerando..." : undefined,
              onClick: generatePromoVideo,
              disabled: triggeringVideo || videoStatus === "processing",
            },
          ]
        : [];

  const moreActions: MoreAction[] = [
    { label: "Página do cliente", icon: <ExternalLink />, onClick: () => window.open(data.public_url, "_blank") },
    { label: "Copiar link", icon: <Copy />, onClick: copyClientLink },
    {
      label: "Laudo PDF",
      icon: downloadingReport ? <Loader2 className="animate-spin" /> : <FileText />,
      onClick: downloadReport,
      disabled: downloadingReport,
    },
    ...videoActions,
    ...(onlineObdDevice
      ? [
          { label: "Coletar dados OBD", icon: <Radio />, onClick: captureObd, disabled: capturingObd },
          { label: "Scanner ao vivo", icon: <Activity />, onClick: () => navigate(`/scanner?os=${data.service_order_id}`) },
        ]
      : []),
    { label: "Peças e equipe", icon: <Boxes />, onClick: () => navigate(`/os/${data.service_order_id}/escritorio`) },
    ...(canSeeSheet
      ? [{ label: "Ficha do escritório", icon: <ClipboardList />, onClick: () => navigate(`/os/${data.service_order_id}/ficha`) }]
      : []),
    ...extraTypesToCreate.map((type) => ({
      label: `Nova etapa: ${sectionLabels[type]}`,
      icon: <Plus />,
      onClick: () => setCreateSectionType(type),
    })),
    ...(data.status !== "done"
      ? [{ label: "Finalizar OS", icon: <Flag />, onClick: () => navigate(`/os/${data.service_order_id}/finalizar`) }]
      : []),
  ];

  return (
    <div className="text-foreground">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-4">
        {/* ---------- topo ---------- */}
        <header className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Voltar"
            onClick={() => navigate("/dashboard")}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06]"
          >
            <ArrowLeft className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl leading-tight">{carTitle(data.car)}</h1>
            <p className="truncate text-sm text-white/70">
              <span className="font-mono text-base font-bold text-white">{data.car.plate}</span> · OS #{data.service_order_id} ·{" "}
              {clientLabel(data.client?.name)} · {kmLabel(data.mileage_in)}
            </p>
          </div>
          {(data.status === "done" || data.status === "cancelled") && (
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${chip.className}`}>{chip.label}</span>
          )}
          <button
            type="button"
            aria-label="Mais ações"
            onClick={() => setMoreOpen(true)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06]"
          >
            <MoreHorizontal className="h-6 w-6" aria-hidden="true" />
          </button>
        </header>

        {!data.is_complete && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-300">Dados pendentes</p>
              <p className="truncate text-xs text-foreground/80">
                {[...data.missing_data.client, ...data.missing_data.car].map((i) => i.label).join(", ")}
              </p>
            </div>
            <Button variant="outline" className="h-12 shrink-0" onClick={() => setCompleteOpen(true)}>
              Completar dados
            </Button>
          </div>
        )}

        <ArrivalCard
          complaint={data.client_complaint}
          sections={sections}
          whatsappUrl={whatsappUrl}
          onOpenMedia={setLightboxMedia}
        />

        <StepProgress steps={steps} />

        {stepNow ? (
          <StepNowCard
            key={stepNow.type}
            step={stepNow}
            position={MAIN_STEPS.indexOf(stepNow.type) + 1}
            total={MAIN_STEPS.length}
            busy={ensuring}
            publishing={isPublishing(stepNow.section)}
            onSpeak={() => setSpeakOpen(true)}
            onMedia={() => withCurrentSection(setAddMediaSectionId)}
            onTest={() => withCurrentSection(setAddTestSectionId)}
            onFinding={() => withCurrentSection(setAddFindingSectionId)}
            onPublish={() => stepNow.section && setConfirm({ kind: "publish", section: stepNow.section })}
            handlers={handlers}
          />
        ) : (
          <AllDoneCard
            done={data.status === "done"}
            whatsappUrl={whatsappUrl}
            downloadingReport={downloadingReport}
            onFinish={() => navigate(`/os/${data.service_order_id}/finalizar`)}
            onReport={downloadReport}
          />
        )}

        {/* ---------- etapas feitas e extras ---------- */}
        {listed.length > 0 && (
          <div className="flex flex-col gap-2">
            {listed.map((section) => (
              <StepRow
                key={section.section_id}
                section={section}
                label={sectionLabels[section.type] ?? section.type}
                publishing={isPublishing(section)}
                onAddMedia={() => setAddMediaSectionId(section.section_id)}
                onAddTest={() => setAddTestSectionId(section.section_id)}
                onAddFinding={() => setAddFindingSectionId(section.section_id)}
                onPublish={() => setConfirm({ kind: "publish", section })}
                handlers={handlers}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---------- sheets ---------- */}
      <CompleteDataSheet
        orderId={data.service_order_id}
        open={completeOpen}
        missing={data.missing_data}
        currentClient={data.client}
        onClose={() => setCompleteOpen(false)}
        onCompleted={fetchOrder}
      />
      {stepNow && (
        <SpeakSheet
          open={speakOpen}
          stepType={stepNow.type}
          section={stepNow.section}
          ensureSection={ensureCurrentSection}
          onClose={() => setSpeakOpen(false)}
          onSaved={fetchOrder}
        />
      )}
      <MoreActionsSheet open={moreOpen} onClose={() => setMoreOpen(false)} actions={moreActions} />
      <AddTestSheet
        sectionId={addTestSectionId}
        carId={data.car.car_id}
        onClose={() => setAddTestSectionId(null)}
        onSaved={fetchOrder}
      />
      <AddFindingSheet
        sectionId={addFindingSectionId ?? editingFinding?.sectionId ?? null}
        editingTest={editingFinding?.test ?? null}
        sectionMedias={findSection(editingFinding?.sectionId)?.medias ?? []}
        onClose={() => {
          setAddFindingSectionId(null);
          setEditingFinding(null);
        }}
        onSaved={fetchOrder}
      />
      <MediaUploadSheet
        sectionId={addMediaSectionId}
        onClose={() => setAddMediaSectionId(null)}
        onSaved={fetchOrder}
      />
      <EditNotesSheet section={editNotesSection} onClose={() => setEditNotesSection(null)} onSaved={fetchOrder} />
      <EditTestSheet
        test={editTest?.test ?? null}
        sectionId={editTest?.sectionId ?? null}
        sectionMedias={findSection(editTest?.sectionId)?.medias ?? []}
        onClose={() => setEditTest(null)}
        onSaved={fetchOrder}
      />
      <CreateSectionSheet
        serviceOrderId={data.service_order_id}
        sectionType={createSectionType}
        onClose={() => setCreateSectionType(null)}
        onSaved={fetchOrder}
      />

      {/* ---------- confirmações ---------- */}
      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "publish" ? "Mostrar esta etapa ao cliente?" : "Excluir este teste?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "publish"
                ? "Ela aparece na hora na página do cliente, com o texto, as fotos e os testes."
                : `"${confirm?.kind === "delete-test" ? confirm.test.title : ""}" será removido do laudo e da página do cliente. Essa ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmBusy}
              onClick={(e) => {
                e.preventDefault();
                runConfirm();
              }}
              className={
                confirm?.kind === "delete-test"
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-brand text-brand-foreground hover:bg-brand/90"
              }
            >
              {confirmBusy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {confirm?.kind === "publish" ? "Mostrar" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Lightbox media={lightboxMedia} onClose={() => setLightboxMedia(null)} />
    </div>
  );
}
