import { MessageCircleMore } from "lucide-react";
import type { LightboxMedia } from "@/components/media/Lightbox";
import { formatDateTime, type MediaItem, type SectionItem } from "./types";

type IntakeCardProps = {
  section: SectionItem;
  onOpenMedia: (media: LightboxMedia) => void;
};

function IntakeMediaThumb({
  media,
  onOpen,
}: {
  media: MediaItem;
  onOpen: (m: LightboxMedia) => void;
}) {
  if (!media.url) return null;

  if (media.type === "photo") {
    return (
      <button
        type="button"
        className="group relative block h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-border"
        onClick={() => onOpen({ url: media.url!, mime_type: media.mime_type, label: media.label })}
      >
        <img
          src={media.url}
          alt={media.label ?? "Mídia do cliente"}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </button>
    );
  }

  if (media.type === "video") {
    return (
      <video controls playsInline preload="metadata" className="h-40 w-full max-w-xs rounded-xl border border-border">
        <source src={media.url} type={media.mime_type} />
      </video>
    );
  }

  return (
    <div className="w-full max-w-xs rounded-xl border border-border bg-muted/30 p-3">
      <audio controls className="w-full">
        <source src={media.url} type={media.mime_type} />
      </audio>
    </div>
  );
}

/**
 * Relato original do cliente na abertura da OS — texto, foto, vídeo, áudio e
 * roteiro de triagem, tudo do jeito que ele mesmo passou. Só leitura: é o que
 * o cliente disse, não cabe ao mecânico editar aqui.
 */
export function IntakeCard({ section, onOpenMedia }: IntakeCardProps) {
  const photos = section.medias.filter((m) => m.type === "photo");
  const others = section.medias.filter((m) => m.type !== "photo");

  return (
    <div className="rounded-3xl border border-brand/20 bg-brand/[0.03] p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand">
          <MessageCircleMore className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-foreground">Relato do cliente</h3>
          <p className="text-xs text-muted-foreground">
            Coletado na abertura em {formatDateTime(section.created_at)}
          </p>
        </div>
      </div>

      {section.notes && (
        <p className="mb-4 whitespace-pre-line rounded-2xl bg-muted/30 p-4 text-sm leading-relaxed text-foreground/90">
          {section.notes}
        </p>
      )}

      {(photos.length > 0 || others.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {photos.map((media) => (
            <IntakeMediaThumb key={media.media_id} media={media} onOpen={onOpenMedia} />
          ))}
          {others.map((media) => (
            <IntakeMediaThumb key={media.media_id} media={media} onOpen={onOpenMedia} />
          ))}
        </div>
      )}
    </div>
  );
}
