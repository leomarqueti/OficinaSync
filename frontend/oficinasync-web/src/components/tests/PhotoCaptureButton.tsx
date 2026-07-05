import { useState } from "react";
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

  return (
    <label className="flex min-h-[110px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-center hover:bg-muted/40">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={label}
          className="h-20 w-20 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-muted text-2xl">
          📷
        </div>
      )}
      <span className="text-xs font-medium">
        {uploading ? "Enviando..." : label}
      </span>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
        disabled={uploading}
      />
    </label>
  );
}
