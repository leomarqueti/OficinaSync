import type { AntesDepoisData } from "@/components/tests/testTypes";
import { resolveMediaUrl } from "@/components/tests/testTypes";
import { Reveal } from "@/components/motion/Reveal";
import type { LightboxMedia } from "@/components/media/Lightbox";

type StoryAntesDepoisProps = {
  data: AntesDepoisData;
  sectionMedias: { media_id: number; url?: string }[];
  onOpenMedia: (media: LightboxMedia) => void;
};

function BeforeAfterPhoto({
  url,
  label,
  onOpen,
}: {
  url: string;
  label: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block w-full cursor-zoom-in overflow-hidden rounded-2xl border border-white/10"
    >
      <img
        src={url}
        alt={label}
        className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-56"
      />
      <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white backdrop-blur">
        {label}
      </span>
    </button>
  );
}

/** Comparação lado a lado — a prova visual mais direta de que algo mudou. */
export function StoryAntesDepois({ data, sectionMedias, onOpenMedia }: StoryAntesDepoisProps) {
  const fotoAntes =
    resolveMediaUrl(data.fotoAntesMediaId, sectionMedias) ?? data.fotoAntesPreviewUrl;
  const fotoDepois =
    resolveMediaUrl(data.fotoDepoisMediaId, sectionMedias) ?? data.fotoDepoisPreviewUrl;

  return (
    <div className="space-y-3">
      {(fotoAntes || fotoDepois) && (
        <Reveal>
          <div className="grid grid-cols-2 gap-3">
            {fotoAntes && (
              <BeforeAfterPhoto
                url={fotoAntes}
                label="Antes"
                onOpen={() =>
                  onOpenMedia({ url: fotoAntes, mime_type: "image/jpeg", label: "Antes" })
                }
              />
            )}
            {fotoDepois && (
              <BeforeAfterPhoto
                url={fotoDepois}
                label="Depois"
                onOpen={() =>
                  onOpenMedia({ url: fotoDepois, mime_type: "image/jpeg", label: "Depois" })
                }
              />
            )}
          </div>
        </Reveal>
      )}

      {data.description && (
        <p className="text-sm leading-relaxed text-white/70">{data.description}</p>
      )}
    </div>
  );
}
