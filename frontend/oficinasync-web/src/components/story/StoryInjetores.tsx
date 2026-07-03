import { motion, useReducedMotion } from "motion/react";
import type { InjetoresBancoData } from "@/components/tests/testTypes";
import { resolveMediaUrl } from "@/components/tests/testTypes";
import { CountUp } from "@/components/motion/CountUp";
import { Reveal } from "@/components/motion/Reveal";
import type { LightboxMedia } from "@/components/media/Lightbox";
import { SprayChip } from "./chips";

type StoryInjetoresProps = {
  data: InjetoresBancoData;
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

/**
 * Injetores no banco: o antes/depois lado a lado (a prova mais
 * persuasiva que existe) + volumes medidos por injetor.
 */
export function StoryInjetores({ data, sectionMedias, onOpenMedia }: StoryInjetoresProps) {
  const reduced = useReducedMotion();
  const specMax = parseFloat(data.specMax) || 0;

  const fotoAntes =
    resolveMediaUrl(data.fotoAntesMediaId, sectionMedias) ?? data.fotoAntesPreviewUrl;
  const fotoDepois =
    resolveMediaUrl(data.fotoDepoisMediaId, sectionMedias) ?? data.fotoDepoisPreviewUrl;

  return (
    <div className="space-y-4">
      {(data.tool || data.pulsos || data.specMin || data.specMax) && (
        <p className="text-xs text-white/40">
          {data.tool && `Equipamento: ${data.tool}`}
          {data.pulsos && ` · ${data.pulsos} pulsos`}
          {(data.specMin || data.specMax) &&
            ` · Especificado: ${data.specMin || "—"}–${data.specMax || "—"} ${data.unit}`}
        </p>
      )}

      {(fotoAntes || fotoDepois) && (
        <Reveal>
          <div className="grid grid-cols-2 gap-3">
            {fotoAntes && (
              <BeforeAfterPhoto
                url={fotoAntes}
                label="Antes"
                onOpen={() =>
                  onOpenMedia({
                    url: fotoAntes,
                    mime_type: "image/jpeg",
                    label: "Injetores — antes da limpeza/substituição",
                  })
                }
              />
            )}
            {fotoDepois && (
              <BeforeAfterPhoto
                url={fotoDepois}
                label="Depois"
                onOpen={() =>
                  onOpenMedia({
                    url: fotoDepois,
                    mime_type: "image/jpeg",
                    label: "Injetores — depois do serviço",
                  })
                }
              />
            )}
          </div>
        </Reveal>
      )}

      <div className="space-y-2">
        {data.injectors.map((inj, index) => {
          const value = parseFloat(inj.value) || 0;
          const ratio = specMax > 0 ? Math.min(value / specMax, 1) : 0;

          return (
            <div
              key={index}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <span className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                Inj. {inj.number}
              </span>

              {specMax > 0 && (
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-brand"
                    initial={{ width: reduced ? `${ratio * 100}%` : 0 }}
                    whileInView={{ width: `${ratio * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
                  />
                </div>
              )}

              <span className="w-20 shrink-0 text-right text-sm font-bold text-white">
                <CountUp value={inj.value} decimals={0} />{" "}
                <span className="font-medium text-white/50">{data.unit}</span>
              </span>

              <SprayChip pattern={inj.sprayPattern} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
