import { motion, useReducedMotion } from "motion/react";
import type { CompressaoMecanicaData } from "@/components/tests/testTypes";
import { resolveMediaUrl } from "@/components/tests/testTypes";
import { CountUp } from "@/components/motion/CountUp";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import type { LightboxMedia } from "@/components/media/Lightbox";
import { Chip } from "./chips";
import { itemStatusColor, itemStatusLabel } from "./statusMaps";

const barColor: Record<string, string> = {
  emerald: "bg-emerald-400",
  red: "bg-red-400",
  amber: "bg-amber-400",
  neutral: "bg-white/40",
};

type StoryCompressaoProps = {
  data: CompressaoMecanicaData;
  sectionMedias: { media_id: number; url?: string }[];
  onOpenMedia: (media: LightboxMedia) => void;
};

/**
 * Compressão como "medidores" por cilindro: foto da leitura, valor que
 * sobe, barra proporcional ao especificado e status colorido — a prova
 * técnica mais visual do laudo.
 */
export function StoryCompressao({ data, sectionMedias, onOpenMedia }: StoryCompressaoProps) {
  const reduced = useReducedMotion();
  const specMax = parseFloat(data.specMax) || 0;

  return (
    <div className="space-y-4">
      {(data.specMin || data.specMax || data.tool) && (
        <p className="text-xs text-white/40">
          {(data.specMin || data.specMax) &&
            `Especificado pelo fabricante: ${data.specMin || "—"}–${data.specMax || "—"} ${data.unit}`}
          {data.tool && (data.specMin || data.specMax) && " · "}
          {data.tool && `Equipamento: ${data.tool}`}
        </p>
      )}

      <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {data.cylinders.map((cyl, index) => {
          const url = resolveMediaUrl(cyl.media_id, sectionMedias) ?? cyl.previewUrl;
          const value = parseFloat(cyl.value) || 0;
          const ratio = specMax > 0 ? Math.min(value / specMax, 1) : 0;
          const color = itemStatusColor(cyl.status || null);

          return (
            <StaggerItem
              key={index}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
            >
              {url ? (
                <button
                  type="button"
                  className="block h-28 w-full cursor-zoom-in"
                  onClick={() =>
                    onOpenMedia({
                      url,
                      mime_type: "image/jpeg",
                      label: `Cilindro ${cyl.number} — leitura de compressão`,
                    })
                  }
                >
                  <img
                    src={url}
                    alt={`Cilindro ${cyl.number}`}
                    className="h-28 w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </button>
              ) : (
                <div className="flex h-28 w-full items-center justify-center bg-white/[0.02] text-xs text-white/30">
                  Cilindro {cyl.number}
                </div>
              )}

              <div className="space-y-2 p-3 text-center">
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                  Cilindro {cyl.number}
                </p>
                <p className="text-xl font-bold text-white">
                  <CountUp value={cyl.value} decimals={0} />{" "}
                  <span className="text-sm font-medium text-white/50">{data.unit}</span>
                </p>

                {specMax > 0 && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className={`h-full rounded-full ${barColor[color]}`}
                      initial={{ width: reduced ? `${ratio * 100}%` : 0 }}
                      whileInView={{ width: `${ratio * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
                    />
                  </div>
                )}

                {cyl.status && (
                  <Chip color={color}>{itemStatusLabel[cyl.status] ?? cyl.status}</Chip>
                )}
              </div>
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}
