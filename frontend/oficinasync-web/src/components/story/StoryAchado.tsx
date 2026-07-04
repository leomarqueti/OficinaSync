import { AlertTriangle } from "lucide-react";
import type { AchadoAdicionalData } from "@/components/tests/testTypes";
import { achadoSeverityLabels, resolveMediaUrl } from "@/components/tests/testTypes";
import type { LightboxMedia } from "@/components/media/Lightbox";

type StoryAchadoProps = {
  data: AchadoAdicionalData;
  sectionMedias: { media_id: number; url?: string }[];
  onOpenMedia: (media: LightboxMedia) => void;
};

const severityStyles: Record<string, string> = {
  baixa: "border-blue-400/30 bg-blue-400/10 text-blue-300",
  media: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  alta: "border-red-400/30 bg-red-400/10 text-red-300",
};

/** Achado extra que o mecânico encontrou — alerta o cliente sem prometer nada, só informa. */
export function StoryAchado({ data, sectionMedias, onOpenMedia }: StoryAchadoProps) {
  const photoUrl = resolveMediaUrl(data.media_id, sectionMedias) ?? data.previewUrl;

  return (
    <div className="space-y-3">
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
          severityStyles[data.severity] ?? severityStyles.media
        }`}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Atenção {achadoSeverityLabels[data.severity]}
      </span>

      {data.description && (
        <p className="text-sm leading-relaxed text-white/70">{data.description}</p>
      )}

      {photoUrl && (
        <button
          type="button"
          onClick={() => onOpenMedia({ url: photoUrl, mime_type: "image/jpeg", label: "Achado" })}
          className="group block w-full max-w-xs cursor-zoom-in overflow-hidden rounded-2xl border border-white/10"
        >
          <img
            src={photoUrl}
            alt="Achado adicional"
            className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </button>
      )}
    </div>
  );
}
