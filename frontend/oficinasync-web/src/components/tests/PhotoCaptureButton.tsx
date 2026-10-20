import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { API_URL } from "@/lib/api";
import { compressImage } from "@/lib/imageCompression";

type PhotoCaptureButtonProps = {
  sectionId: number;
  label: string;
  mediaLabel: string;
  previewUrl?: string | null;
  onUploaded: (mediaId: number, previewUrl: string) => void;
};

export function PhotoCaptureButton({
  sectionId,
  label,
  mediaLabel,
  previewUrl,
  onUploaded,
}: PhotoCaptureButtonProps) {
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    const token = localStorage.getItem("token");

    if (!token) {
      alert("Token não encontrado.");
      return;
    }

    const file = await compressImage(rawFile);
    const localPreview = URL.createObjectURL(file);

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("section_id", String(sectionId));
      formData.append("type", "photo");
      formData.append("label", mediaLabel);

      const response = await fetch(`${API_URL}/medias`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result?.message ?? "Erro ao enviar foto.");
        return;
      }

      onUploaded(result.media_id, localPreview);
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar foto.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Duas portas: câmera (abre direto a câmera no Android) e galeria (fotos já tiradas / arquivos).
  // Com "capture" o Android NÃO deixa escolher da galeria — por isso a galeria é um campo separado.
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label className="flex min-h-[110px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-center hover:bg-muted/40">
        {previewUrl ? (
          <img src={previewUrl} alt={label} className="h-20 w-20 rounded-lg object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-muted text-2xl">📷</div>
        )}
        <span className="text-xs font-medium">{uploading ? "Enviando..." : label}</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          aria-label={`${label}: tirar com a câmera`}
          className="hidden"
          onChange={handleChange}
          disabled={uploading}
        />
      </label>
      <label className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/15 text-xs font-semibold text-white/80 hover:bg-muted/40">
        <ImageIcon className="h-4 w-4" aria-hidden="true" />
        Galeria
        <input
          type="file"
          accept="image/*"
          aria-label={`${label}: escolher da galeria`}
          className="sr-only"
          onChange={handleChange}
          disabled={uploading}
        />
      </label>
    </div>
  );
}
