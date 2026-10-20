import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BigButton, textAreaClass } from "@/components/kit";
import { AudioRecorder } from "@/components/media/AudioRecorder";
import { DictationButton } from "@/components/guided-open/DictationButton";
import { apiFetch } from "@/lib/api";
import { appendNotes } from "@/lib/osFlow";
import { sectionLabels, type SectionItem } from "./types";

/**
 * "Falar": o mecânico fala (vira texto, grátis pelo navegador), escreve, ou só grava o áudio.
 * O texto SOMA na explicação da etapa (o cliente lê); o áudio vira mídia da etapa.
 * A etapa é criada na hora se ainda não existe (`ensureSection`).
 */
export function SpeakSheet({
  open,
  stepType,
  section,
  ensureSection,
  onClose,
  onSaved,
}: {
  open: boolean;
  stepType: string;
  section: SectionItem | null;
  ensureSection: () => Promise<number>;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [text, setText] = useState("");
  const [audio, setAudio] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setText("");
    setAudio(null);
    onClose();
  };

  const save = async () => {
    try {
      setSaving(true);
      const sectionId = await ensureSection();
      if (text.trim()) {
        await apiFetch(`/sections/${sectionId}`, { method: "PATCH", json: { notes: appendNotes(section?.notes ?? null, text) } });
      }
      if (audio) {
        const form = new FormData();
        form.append("file", audio);
        form.append("section_id", String(sectionId));
        form.append("type", "audio");
        form.append("label", "Áudio do mecânico");
        await apiFetch("/medias", { method: "POST", body: form });
      }
      toast.success("Guardado na etapa.");
      close();
      await onSaved();
    } catch {
      // apiFetch já mostrou o erro
    } finally {
      setSaving(false);
    }
  };

  const empty = !text.trim() && !audio;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Falar — {sectionLabels[stepType] ?? stepType}</SheetTitle>
          <SheetDescription>Conte o que você viu ou fez. O cliente lê o texto.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4 pb-8">
          <DictationButton onText={(t) => setText((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t))} />
          <textarea
            aria-label="O que você viu ou fez"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex.: bateria fraca, deu 11,2V no teste."
            className={textAreaClass}
          />
          <div className="rounded-2xl border border-white/10 p-3">
            <p className="mb-2 text-sm font-semibold text-white/80">Ou só grave um áudio</p>
            <AudioRecorder onRecorded={setAudio} />
          </div>
          <BigButton onClick={save} disabled={saving || empty} hint={empty ? "Fale, escreva ou grave um áudio." : undefined}>
            {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
            {saving ? "Salvando..." : "Salvar"}
          </BigButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
