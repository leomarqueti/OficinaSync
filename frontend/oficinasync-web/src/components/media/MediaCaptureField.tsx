import { useEffect, useMemo } from "react";
import { Camera, FolderOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioRecorder } from "./AudioRecorder";

export type MediaCaptureType = "photo" | "video" | "audio";

type MediaCaptureFieldProps = {
  type: MediaCaptureType;
  value: File | null;
  onChange: (file: File | null) => void;
};

/**
 * Captura de mídia com escolha explícita entre câmera e arquivo (foto/vídeo)
 * ou gravação direta no navegador (áudio, via AudioRecorder). Controlado —
 * o pai é dono do File, igual ao padrão já usado nas fotos de entrada do wizard.
 */
export function MediaCaptureField({ type, value, onChange }: MediaCaptureFieldProps) {
  const previewUrl = useMemo(() => (value ? URL.createObjectURL(value) : null), [value]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (type === "audio") {
    return <AudioRecorder onRecorded={onChange} />;
  }

  if (value && previewUrl) {
    return (
      <div className="space-y-2">
        {type === "photo" ? (
          <img src={previewUrl} alt="Prévia" className="h-40 w-full rounded-xl object-cover" />
        ) : (
          <video src={previewUrl} controls className="h-40 w-full rounded-xl object-cover" />
        )}
        <Button type="button" variant="outline" className="h-10" onClick={() => onChange(null)}>
          <X className="mr-1.5 h-4 w-4" />
          Remover
        </Button>
      </div>
    );
  }

  const accept = type === "photo" ? "image/*" : "video/*";

  return (
    <div className="flex flex-wrap gap-2">
      <label className="flex h-11 cursor-pointer items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-muted">
        <Camera className="mr-1.5 h-4 w-4" />
        Usar câmera
        <input
          type="file"
          accept={accept}
          capture="environment"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
      <label className="flex h-11 cursor-pointer items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-muted">
        <FolderOpen className="mr-1.5 h-4 w-4" />
        Escolher arquivo
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}
