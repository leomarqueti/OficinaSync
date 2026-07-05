import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PhotoCaptureButton } from "@/components/tests/PhotoCaptureButton";
import type { AchadoSeverity } from "@/components/tests/testTypes";
import { achadoSeverityLabels, hydrateSpecializedData } from "@/components/tests/testTypes";
import { apiFetch } from "@/lib/api";
import type { MediaItem, TestItem } from "./types";

type AddFindingSheetProps = {
  /** Section alvo; null = sheet fechado. Ignorado quando editingTest é passado. */
  sectionId: number | null;
  /** Achado já existente sendo editado — presente = modo edição (PATCH em vez de POST). */
  editingTest?: TestItem | null;
  sectionMedias?: MediaItem[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

const severities: AchadoSeverity[] = ["baixa", "media", "alta"];

/**
 * Registrar (ou editar) algo que o mecânico encontrou mas o cliente não pediu
 * (ex: lâmpada queimada) — vira um alerta informativo na página do cliente e
 * no laudo.
 */
export function AddFindingSheet({
  sectionId,
  editingTest,
  sectionMedias = [],
  onClose,
  onSaved,
}: AddFindingSheetProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<AchadoSeverity>("media");
  const [mediaId, setMediaId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const open = sectionId !== null || editingTest != null;

  useEffect(() => {
    if (!editingTest || !editingTest.data) return;

    const hydrated = hydrateSpecializedData("achado_adicional", editingTest.data, sectionMedias);
    setTitle(editingTest.title);
    setDescription(String(hydrated.description ?? ""));
    setSeverity((hydrated.severity as AchadoSeverity) ?? "media");
    setMediaId((hydrated.media_id as number | null) ?? null);
    setPreviewUrl((hydrated.previewUrl as string | null) ?? null);
  }, [editingTest, sectionMedias]);

  const close = () => {
    setTitle("");
    setDescription("");
    setSeverity("media");
    setMediaId(null);
    setPreviewUrl(null);
    onClose();
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error("Dê um título curto pro achado antes de salvar.");
      return;
    }

    try {
      setSaving(true);

      if (editingTest) {
        await apiFetch(`/tests/${editingTest.test_id}`, {
          method: "PATCH",
          json: {
            title: title.trim(),
            data: {
              severity,
              description: description.trim(),
              media_id: mediaId,
            },
          },
        });
        toast.success("Achado atualizado!");
      } else {
        await apiFetch("/tests", {
          method: "POST",
          json: {
            section_id: sectionId,
            title: title.trim(),
            test_type: "achado_adicional",
            data: {
              severity,
              description: description.trim(),
              media_id: mediaId,
            },
          },
        });
        toast.success("Achado registrado!");
      }

      close();
      await onSaved();
    } catch {
      // apiFetch já mostrou o toast de erro
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>{editingTest ? "Editar achado" : "Achado adicional"}</SheetTitle>
          <SheetDescription>
            Algo que você notou mas o cliente não pediu — vira um alerta informativo pra ele, sem
            compromisso de aceite.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-8">
          <div className="space-y-2">
            <label className="text-sm font-medium">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Lâmpada de freio queimada"
              className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Severidade</label>
            <div className="grid grid-cols-3 gap-2">
              {severities.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`h-11 rounded-md border text-sm font-medium transition-colors ${
                    severity === s
                      ? "border-brand/50 bg-brand/10 text-brand"
                      : "border-input text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {achadoSeverityLabels[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explique o que foi notado e por que o cliente deveria ficar atento..."
              className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Foto (opcional)</label>
            {sectionId !== null && (
              <PhotoCaptureButton
                sectionId={sectionId}
                label="Adicionar foto"
                mediaLabel={title.trim() || "Achado adicional"}
                previewUrl={previewUrl}
                onUploaded={(id, url) => {
                  setMediaId(id);
                  setPreviewUrl(url);
                }}
              />
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              className="h-11 flex-1 bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={submit}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Salvando..." : editingTest ? "Salvar alterações" : "Registrar achado"}
            </Button>
            <Button className="h-11" variant="outline" onClick={close}>
              Cancelar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
