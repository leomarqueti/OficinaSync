import { MessageCircle, ShieldCheck } from "lucide-react";
import type { LightboxMedia } from "@/components/media/Lightbox";
import { checkinPhotos } from "@/lib/osFlow";
import type { SectionItem } from "./types";

/**
 * "Como o carro chegou": fotos da entrada + o que o cliente relatou, sempre no topo da OS.
 * É a prova do mecânico se o cliente reclamar depois ("saiu riscado daí").
 */
export function ArrivalCard({
  complaint,
  sections,
  whatsappUrl,
  onOpenMedia,
}: {
  complaint: string;
  sections: SectionItem[];
  whatsappUrl: string;
  onOpenMedia: (media: LightboxMedia) => void;
}) {
  const photos = checkinPhotos(sections).filter((m) => m.url);
  const intake = sections.find((s) => s.type === "intake");
  const intakeMedia = (intake?.medias ?? []).filter((m) => m.url);

  return (
    <section aria-label="Como o carro chegou" className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold tracking-widest text-white/70">Como o carro chegou</h2>
        <ShieldCheck className="h-5 w-5 text-brand" aria-hidden="true" />
      </div>

      {photos.length > 0 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((m) => (
            <button
              key={m.media_id}
              type="button"
              aria-label={`Ver foto: ${m.label ?? "entrada"}`}
              onClick={() => onOpenMedia({ url: m.url!, mime_type: m.mime_type, label: m.label })}
              className="h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10"
            >
              <img src={m.url} alt="" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-warning">Sem fotos de entrada.</p>
      )}

      <p className="mt-3 whitespace-pre-line text-base text-white/90">{complaint ? `“${complaint}”` : "Sem relato do defeito."}</p>
      {intake?.notes && <p className="mt-2 whitespace-pre-line text-sm text-white/60">{intake.notes}</p>}

      {intakeMedia.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {intakeMedia.map((m) =>
            m.type === "audio" ? (
              <audio key={m.media_id} controls className="w-full">
                <source src={m.url} type={m.mime_type} />
              </audio>
            ) : m.type === "video" ? (
              <video key={m.media_id} controls playsInline preload="metadata" className="max-h-56 w-full rounded-xl">
                <source src={m.url} type={m.mime_type} />
              </video>
            ) : null,
          )}
        </div>
      )}

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-white/15 text-sm font-bold text-white"
      >
        <MessageCircle className="h-5 w-5 text-brand" aria-hidden="true" />
        Mandar link pro cliente no WhatsApp
      </a>
    </section>
  );
}
