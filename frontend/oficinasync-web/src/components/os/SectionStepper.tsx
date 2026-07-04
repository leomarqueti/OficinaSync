import { Check, Plus } from "lucide-react";
import { sectionOrder, sectionLabels, type SectionItem } from "./types";

type SectionStepperProps = {
  sections: SectionItem[];
  /** Clicou numa etapa que ainda não existe → cria. */
  onCreateSection: (type: string) => void;
};

/**
 * Trilha do ciclo da OS: mostra num relance quais etapas existem,
 * quais já foram publicadas pro cliente e quais faltam — e cria as
 * que faltam com um toque. É o "mapa" que guia o mecânico.
 */
export function SectionStepper({ sections, onCreateSection }: SectionStepperProps) {
  const byType = new Map(sections.map((s) => [s.type, s]));

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
      {sectionOrder.map((type) => {
        const section = byType.get(type);
        const label = sectionLabels[type];

        if (!section) {
          return (
            <button
              key={type}
              type="button"
              onClick={() => onCreateSection(type)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-white/20 px-3.5 py-2 text-xs font-medium text-white/40 transition-colors hover:border-brand/50 hover:text-brand"
            >
              <Plus className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        }

        const published = section.status === "published";

        return (
          <a
            key={type}
            href={`#section-${section.section_id}`}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
              published
                ? "border-brand/30 bg-brand/10 text-brand"
                : "border-amber-400/30 bg-amber-400/10 text-amber-300"
            }`}
          >
            {published ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-amber-400" />
            )}
            {label}
          </a>
        );
      })}
    </div>
  );
}
