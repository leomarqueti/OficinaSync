import { useEffect, useState } from "react";
import { celebrate } from "@/components/motion/celebration";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_URL, apiFetch } from "@/lib/api";
import { carTitle, clientLabel } from "@/lib/display";
import { CompleteDataSheet } from "@/components/os/CompleteDataSheet";
import type { MissingData, OrderClient } from "@/components/os/types";
import { toast } from "sonner";

type SectionItem = {
  section_id: number;
  type: string;
  status: string;
};

type ServiceOrderData = {
  service_order_id: number;
  client: OrderClient | null;
  car: {
    brand: string | null;
    model: string | null;
    plate: string;
  };
  is_complete: boolean;
  missing_data: MissingData;
  sections: SectionItem[];
};

export function OsFinishPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<ServiceOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState("");

  const [finalNotes, setFinalNotes] = useState("");

  const [rootCause, setRootCause] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [finalVerdict, setFinalVerdict] = useState("");
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [pendingParts, setPendingParts] = useState(0);

  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [rearPhoto, setRearPhoto] = useState<File | null>(null);
  const [leftPhoto, setLeftPhoto] = useState<File | null>(null);
  const [rightPhoto, setRightPhoto] = useState<File | null>(null);

  const fetchServiceOrder = async () => {
    const token = localStorage.getItem("token");

    if (!token || !id) {
      setError("Dados de acesso não encontrados.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/service_orders/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result?.message ?? "Não foi possível carregar a OS.");
        return;
      }

      setData(result);
    } catch {
      setError("Erro ao carregar a OS.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceOrder();
  }, [id]);

  // peças retiradas sem acerto: só avisa (depois de finalizar, só o escritório consegue acertar)
  useEffect(() => {
    if (!id) return;
    apiFetch<{ parts: { used_quantity: number | null }[] }>(`/service_orders/${id}/internal`, { silent: true })
      .then((r) => setPendingParts(r.parts.filter((p) => p.used_quantity === null).length))
      .catch(() => setPendingParts(0));
  }, [id]);

  const uploadMedia = async (
    sectionId: number,
    file: File,
    label: string,
    token: string,
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("section_id", String(sectionId));
    formData.append("type", "photo");
    formData.append("label", label);

    const response = await fetch(`${API_URL}/medias`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.message ?? `Erro ao enviar ${label}`);
    }

    return result;
  };

  const handleFinish = async () => {
    const token = localStorage.getItem("token");

    if (!token || !id || !data) {
      alert("Dados não encontrados.");
      return;
    }

    // dados pendentes? completa ANTES de subir foto ou publicar etapa — senão a OS fica
    // meio-finalizada se o backend recusar (409).
    if (!data.is_complete) {
      setCompleteOpen(true);
      return;
    }

    if (!frontPhoto || !rearPhoto || !leftPhoto || !rightPhoto) {
      alert("Envie as 4 fotos finais do veículo.");
      return;
    }

    try {
      setFinishing(true);

      let finalSectionId: number | null = null;
      const existingFinalSection = data.sections.find(
        (section) => section.type === "final",
      );

      if (existingFinalSection) {
        finalSectionId = existingFinalSection.section_id;
      } else {
        const createSectionResponse = await fetch(
          `${API_URL}/sections`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              service_order_id: Number(id),
              type: "final",
              notes: finalNotes || "Registro final da entrega do veículo.",
            }),
          },
        );

        const createSectionResult = await createSectionResponse.json();

        if (!createSectionResponse.ok) {
          throw new Error(
            createSectionResult?.message ?? "Erro ao criar section final.",
          );
        }

        finalSectionId = createSectionResult.section_id;
      }

      if (!finalSectionId) {
        throw new Error("Não foi possível determinar a etapa final.");
      }

      await Promise.all([
        uploadMedia(finalSectionId, frontPhoto, "Frente na saída", token),
        uploadMedia(finalSectionId, rearPhoto, "Traseira na saída", token),
        uploadMedia(finalSectionId, leftPhoto, "Lado esquerdo na saída", token),
        uploadMedia(finalSectionId, rightPhoto, "Lado direito na saída", token),
      ]);

      if (
        !existingFinalSection ||
        existingFinalSection.status !== "published"
      ) {
        const publishResponse = await fetch(
          `${API_URL}/sections/${finalSectionId}/publish`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const publishResult = await publishResponse.json();

        if (!publishResponse.ok) {
          throw new Error(
            publishResult?.message ?? "Erro ao publicar a section final.",
          );
        }
      }

      const finishResponse = await fetch(
        `${API_URL}/service_orders/${id}/finish`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            root_cause: rootCause || undefined,
            conclusion: conclusion || undefined,
            final_verdict: finalVerdict || undefined,
          }),
        },
      );

      const finishResult = await finishResponse.json();

      if (!finishResponse.ok) {
        throw new Error(finishResult?.message ?? "Erro ao finalizar OS.");
      }

      celebrate("OS finalizada");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao finalizar a OS.");
    } finally {
      setFinishing(false);
    }
  };

  const handleDownloadReport = async () => {
    const token = localStorage.getItem("token");

    if (!token || !id) {
      alert("Token não encontrado.");
      return;
    }

    try {
      setDownloadingReport(true);

      const response = await fetch(
        `${API_URL}/service_orders/${id}/report.pdf`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        alert(result?.message ?? "Erro ao gerar o laudo em PDF.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `laudo-os-${id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar o laudo em PDF.");
    } finally {
      setDownloadingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-4xl">
          <Card className="rounded-3xl">
            <CardContent className="p-8">
              <p className="text-sm text-muted-foreground">
                Carregando finalização...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-4xl">
          <Card className="rounded-3xl border-red-200">
            <CardContent className="p-8">
              <h1 className="text-xl font-semibold">
                Não foi possível abrir a finalização
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {error || "OS não encontrada."}
              </p>
              <Button
                className="mt-6"
                variant="outline"
                onClick={() => navigate("/dashboard")}
              >
                Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const renderFileInput = (
    label: string,
    setter: (file: File | null) => void,
  ) => (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setter(e.target.files?.[0] ?? null)}
        className="h-12 rounded-xl border-white/12 bg-white/[0.04] text-base placeholder:text-white/50 w-full border px-3 py-2 file:mr-3 file:rounded-md file:border-0 file:bg-lime-100 file:px-3 file:py-1.5 outline-none focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/40"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="rounded-3xl border-0 bg-gradient-to-br from-black via-neutral-950 to-emerald-950 text-white">
          <CardContent className="p-6 md:p-8">
            <h1 className="text-3xl font-bold">
              Finalizar OS #{data.service_order_id}
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Envie as fotos finais do veículo e conclua o serviço.
            </p>

            <div className="mt-4 text-sm text-white/80">
              {clientLabel(data.client?.name)} • {carTitle(data.car)} •{" "}
              {data.car.plate}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Observação final</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={finalNotes}
              onChange={(e) => setFinalNotes(e.target.value)}
              placeholder="Ex: veículo entregue funcionando normalmente, sistema testado e sem falhas."
              className="rounded-xl border-white/12 bg-white/[0.04] text-base placeholder:text-white/50 min-h-[140px] w-full border px-3 py-2 outline-none focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/40"
            />
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Fechamento do laudo</CardTitle>
            <p className="text-sm text-muted-foreground">
              Essas informações entram no PDF do laudo técnico gerado para o cliente.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Causa raiz identificada</label>
              <textarea
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                placeholder="Ex: contaminação por goma decorrente de degradação do combustível."
                className="rounded-xl border-white/12 bg-white/[0.04] text-base placeholder:text-white/50 min-h-[100px] w-full border px-3 py-2 outline-none focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/40"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Conclusão</label>
              <textarea
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                placeholder="Ex: após a substituição das peças, o motor voltou a operar normalmente."
                className="rounded-xl border-white/12 bg-white/[0.04] text-base placeholder:text-white/50 min-h-[100px] w-full border px-3 py-2 outline-none focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/40"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Veredito final</label>
              <select
                value={finalVerdict}
                onChange={(e) => setFinalVerdict(e.target.value)}
                className="h-12 rounded-xl border-white/12 bg-white/[0.04] text-base placeholder:text-white/50 w-full border px-3 py-2 md:w-64 outline-none focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <option value="">Sem veredito ainda</option>
                <option value="resolved">Falha sanada / serviço concluído</option>
                <option value="not_resolved">Não sanado / requer nova avaliação</option>
                <option value="partial">Resolução parcial</option>
              </select>
            </div>

            <Button
              variant="outline"
              onClick={handleDownloadReport}
              disabled={downloadingReport}
            >
              {downloadingReport ? "Gerando PDF..." : "Baixar laudo em PDF"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Fotos finais do veículo</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {renderFileInput("Frente", setFrontPhoto)}
            {renderFileInput("Traseira", setRearPhoto)}
            {renderFileInput("Lado esquerdo", setLeftPhoto)}
            {renderFileInput("Lado direito", setRightPhoto)}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => navigate(`/os/${id}`)}
          >
            Voltar para OS
          </Button>

          {pendingParts > 0 && (
            <div className="w-full rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {pendingParts} peça(s) retirada(s) sem acerto — informe quanto realmente usou antes de finalizar.{" "}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => navigate(`/os/${id}/escritorio`)}
              >
                Acertar agora
              </button>
            </div>
          )}

          <Button
            className="w-full bg-lime-400 text-black hover:bg-lime-500 sm:w-auto"
            onClick={handleFinish}
            disabled={finishing}
          >
            {finishing ? "Finalizando..." : "Finalizar ordem de serviço"}
          </Button>
        </div>
      </div>

      {/* só monta aberto: o sheet liga o tema escuro no body e esta página é clara */}
      {completeOpen && (
      <CompleteDataSheet
        orderId={data.service_order_id}
        open={completeOpen}
        missing={data.missing_data}
        currentClient={data.client}
        onClose={() => setCompleteOpen(false)}
        onCompleted={async () => {
          await fetchServiceOrder();
          toast.success("Dados completos — agora é só finalizar.");
        }}
      />
      )}
    </div>
  );
}
