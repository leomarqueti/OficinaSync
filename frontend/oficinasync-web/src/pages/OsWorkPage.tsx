import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clapperboard,
  Copy,
  ExternalLink,
  FileText,
  Flag,
  Loader2,
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
import { SectionStepper } from "@/components/os/SectionStepper";
import { SectionCard } from "@/components/os/SectionCard";
import { IntakeCard } from "@/components/os/IntakeCard";
import { AddTestSheet } from "@/components/os/AddTestSheet";
import { AddFindingSheet } from "@/components/os/AddFindingSheet";
import { MediaUploadSheet } from "@/components/os/MediaUploadSheet";
import { EditNotesSheet } from "@/components/os/EditNotesSheet";
import { EditTestSheet } from "@/components/os/EditTestSheet";
import { CreateSectionSheet } from "@/components/os/CreateSectionSheet";
import {
  sectionOrder,
  type SectionItem,
  type ServiceOrderData,
  type TestItem,
} from "@/components/os/types";

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
  const [editingFinding, setEditingFinding] = useState<{ test: TestItem; sectionId: number } | null>(
    null,
  );
  const [createSectionType, setCreateSectionType] = useState<string | null>(null);

  // confirmações e ações longas
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [triggeringVideo, setTriggeringVideo] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<LightboxMedia | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!id) return;

    try {
      const result = await apiFetch<ServiceOrderData>(`/service_orders/${id}`, {
        silent: true,
      });
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

  const intakeSection = useMemo(
    () => data?.sections.find((s) => s.type === "intake") ?? null,
    [data],
  );

  const orderedSections = useMemo(() => {
    if (!data?.sections) return [];
    const order = (type: string) => {
      const i = sectionOrder.indexOf(type as (typeof sectionOrder)[number]);
      return i === -1 ? 99 : i;
    };
    return data.sections
      .filter((s) => s.type !== "intake")
      .sort((a, b) => order(a.type) - order(b.type));
  }, [data]);

  const promoVideoMedia = useMemo(
    () =>
      data?.sections
        .flatMap((s) => s.medias)
        .find((m) => m.label === "Vídeo de divulgação" && m.url),
    [data],
  );

  /* ------------------------- ações ------------------------- */

  const runConfirm = async () => {
    if (!confirm) return;

    try {
      setConfirmBusy(true);

      if (confirm.kind === "publish") {
        await apiFetch(`/sections/${confirm.section.section_id}/publish`, {
          method: "PATCH",
        });
        toast.success("Etapa publicada — o cliente já pode ver!");
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
    await navigator.clipboard.writeText(data.public_url);
    toast.success("Link copiado! É só mandar pro cliente.");
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
      <div className="dark flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-brand" />
          <p className="text-sm text-muted-foreground">Carregando a OS...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Não foi possível abrir esta OS
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {error || "Ordem de serviço não encontrada."}
          </p>
          <Button className="mt-6" variant="outline" onClick={() => navigate("/dashboard")}>
            Voltar para o dashboard
          </Button>
        </div>
      </div>
    );
  }

  const chip = statusChip[data.status] ?? statusChip.open;
  const videoStatus = data.promo_video_status ?? "none";

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
        {/* ---------- cabeçalho ---------- */}
        <header className="space-y-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              OS #{data.service_order_id}
            </h1>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${chip.className}`}
            >
              {chip.label}
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{data.client.name}</span>
            {" · "}
            {data.car.brand} {data.car.model} ·{" "}
            <span className="font-mono">{data.car.plate}</span>
            {" · "}
            {data.mileage_in.toLocaleString("pt-BR")} km
          </p>

          {/* ações principais */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button
              variant="outline"
              className="h-11"
              onClick={() => window.open(data.public_url, "_blank")}
            >
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Página do cliente
            </Button>
            <Button variant="outline" className="h-11" onClick={copyClientLink}>
              <Copy className="mr-1.5 h-4 w-4" />
              Copiar link
            </Button>
            <Button
              variant="outline"
              className="h-11"
              onClick={downloadReport}
              disabled={downloadingReport}
            >
              {downloadingReport ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-1.5 h-4 w-4" />
              )}
              {downloadingReport ? "Gerando..." : "Laudo PDF"}
            </Button>

            {videoStatus === "ready" && promoVideoMedia?.url ? (
              <Button
                variant="outline"
                className="h-11"
                onClick={() => window.open(promoVideoMedia.url, "_blank")}
              >
                <Clapperboard className="mr-1.5 h-4 w-4" />
                Baixar vídeo
              </Button>
            ) : (
              <Button
                variant="outline"
                className="h-11"
                onClick={generatePromoVideo}
                disabled={triggeringVideo || videoStatus === "processing"}
              >
                {videoStatus === "processing" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Clapperboard className="mr-1.5 h-4 w-4" />
                )}
                {videoStatus === "processing"
                  ? "Gerando vídeo..."
                  : videoStatus === "failed"
                    ? "Vídeo falhou — tentar de novo"
                    : "Gerar vídeo"}
              </Button>
            )}

            <Button
              className="col-span-2 h-11 bg-brand text-brand-foreground hover:bg-brand/90 sm:ml-auto"
              onClick={() => navigate(`/os/${data.service_order_id}/finalizar`)}
            >
              <Flag className="mr-1.5 h-4 w-4" />
              Finalizar OS
            </Button>
          </div>
        </header>

        {/* ---------- contexto ---------- */}
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Defeito relatado
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
            {data.client_complaint || "Sem relato informado."}
          </p>
        </div>

        {/* ---------- relato do cliente (foto/vídeo/áudio/roteiro) ---------- */}
        {intakeSection && (
          <IntakeCard section={intakeSection} onOpenMedia={setLightboxMedia} />
        )}

        {/* ---------- trilha das etapas ---------- */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Etapas do serviço — toque numa etapa tracejada pra criar
          </p>
          <SectionStepper sections={orderedSections} onCreateSection={setCreateSectionType} />
        </div>

        {/* ---------- etapas ---------- */}
        {orderedSections.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Nenhuma etapa ainda — comece criando o Check-in na trilha acima.
          </div>
        ) : (
          <div className="space-y-5">
            {orderedSections.map((section) => (
              <SectionCard
                key={section.section_id}
                section={section}
                publishing={
                  confirmBusy &&
                  confirm?.kind === "publish" &&
                  confirm.section.section_id === section.section_id
                }
                onAddMedia={() => setAddMediaSectionId(section.section_id)}
                onAddTest={() => setAddTestSectionId(section.section_id)}
                onAddFinding={() => setAddFindingSectionId(section.section_id)}
                onEditNotes={() => setEditNotesSection(section)}
                onEditTest={(test) => {
                  if (test.test_type === "achado_adicional") {
                    setEditingFinding({ test, sectionId: section.section_id });
                  } else {
                    setEditTest({ test, sectionId: section.section_id });
                  }
                }}
                onDeleteTest={(test) => setConfirm({ kind: "delete-test", test })}
                onPublish={() => setConfirm({ kind: "publish", section })}
                onOpenMedia={setLightboxMedia}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---------- sheets ---------- */}
      <AddTestSheet
        sectionId={addTestSectionId}
        onClose={() => setAddTestSectionId(null)}
        onSaved={fetchOrder}
      />
      <AddFindingSheet
        sectionId={addFindingSectionId ?? editingFinding?.sectionId ?? null}
        editingTest={editingFinding?.test ?? null}
        sectionMedias={
          orderedSections.find((s) => s.section_id === editingFinding?.sectionId)?.medias ?? []
        }
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
      <EditNotesSheet
        section={editNotesSection}
        onClose={() => setEditNotesSection(null)}
        onSaved={fetchOrder}
      />
      <EditTestSheet
        test={editTest?.test ?? null}
        sectionId={editTest?.sectionId ?? null}
        sectionMedias={
          orderedSections.find((s) => s.section_id === editTest?.sectionId)?.medias ?? []
        }
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
              {confirm?.kind === "publish" ? "Publicar esta etapa?" : "Excluir este teste?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "publish"
                ? "Ela vai aparecer imediatamente na página do cliente, com as fotos e testes registrados."
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
              {confirm?.kind === "publish" ? "Publicar" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Lightbox media={lightboxMedia} onClose={() => setLightboxMedia(null)} />
    </div>
  );
}
