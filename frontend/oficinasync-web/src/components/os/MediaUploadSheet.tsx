import { useState } from "react";
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
import { apiFetch } from "@/lib/api";

type MediaUploadSheetProps = {
  sectionId: number | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

const acceptByType: Record<string, string> = {
  photo: "image/*",
  video: "video/*",
  audio: "audio/*",
};

/** Upload de foto/vídeo/áudio numa etapa, com preview antes de enviar. */
export function MediaUploadSheet({ sectionId, onClose, onSaved }: MediaUploadSheetProps) {
  const [type, setType] = useState("photo");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const open = sectionId !== null;

  const reset = () => {
    setType("photo");
    setLabel("");
    setFile(null);
    setPreviewUrl(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFile = (selected: File | null) => {
    setFile(selected);
    setPreviewUrl(selected && selected.type.startsWith("image/") ? URL.createObjectURL(selected) : null);
  };

  const submit = async () => {
    if (!file) {
      toast.error("Escolha um arquivo primeiro.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("section_id", String(sectionId));
    formData.append("type", type);
    formData.append("label", label);

    try {
      setSaving(true);
      await apiFetch("/medias", { method: "POST", body: formData });
      toast.success("Mídia enviada!");
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
          <SheetTitle>Adicionar mídia</SheetTitle>
          <SheetDescription>
            Foto, vídeo ou áudio — vira evidência na história do cliente.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-8">
          <div className="grid grid-cols-3 gap-2">
            {(["photo", "video", "audio"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setType(option);
                  handleFile(null);
                }}
                className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                  type === option
                    ? "border-brand/50 bg-brand/10 text-brand"
                    : "border-input text-muted-foreground hover:bg-muted"
                }`}
              >
                {option === "photo" ? "Foto" : option === "video" ? "Vídeo" : "Áudio"}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Legenda</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: detalhe da falha no chicote"
              className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Arquivo</label>
            <input
              type="file"
              accept={acceptByType[type]}
              capture={type === "photo" ? "environment" : undefined}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand/15 file:px-3 file:py-1 file:text-brand"
            />
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Prévia"
                className="h-40 w-full rounded-xl border border-border object-cover"
              />
            )}
            {file && !previewUrl && (
              <p className="text-xs text-muted-foreground">Selecionado: {file.name}</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              className="h-11 flex-1 bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={submit}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Enviando..." : "Enviar mídia"}
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
