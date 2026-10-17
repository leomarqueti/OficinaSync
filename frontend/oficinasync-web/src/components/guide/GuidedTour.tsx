import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TourStep } from "@/lib/tours";

type Props = { steps: TourStep[]; open: boolean; onClose: () => void };

const HIGHLIGHT = ["ring-4", "ring-lime-400", "ring-offset-2", "ring-offset-black", "rounded-lg"];

/** Passo a passo simples: cartão fixo embaixo; se o passo aponta um elemento da tela, ele ganha um contorno. */
export function GuidedTour({ steps, open, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const step = steps[index];

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open || !step?.target) return;
    const el = document.querySelector<HTMLElement>(step.target);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.classList.add(...HIGHLIGHT);
    return () => el.classList.remove(...HIGHLIGHT);
  }, [open, step]);

  if (!open || !step) return null;

  const last = index === steps.length - 1;

  return (
    <div
      role="dialog"
      aria-label="Passo a passo"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md rounded-2xl border border-lime-400/40 bg-neutral-950 p-4 text-white shadow-2xl"
    >
      <p className="text-[11px] font-bold uppercase tracking-widest text-lime-400">
        Passo {index + 1} de {steps.length}
      </p>
      <h2 className="mt-1 text-lg font-semibold">{step.title}</h2>
      <p className="mt-1 text-sm text-white/80">{step.text}</p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button type="button" className="text-sm text-white/60 hover:text-white" onClick={onClose}>
          Pular
        </button>
        <div className="flex gap-2">
          {index > 0 && (
            <Button variant="outline" className="h-10 text-black" onClick={() => setIndex(index - 1)}>
              Voltar
            </Button>
          )}
          <Button
            className="h-10 bg-lime-400 text-black hover:bg-lime-300"
            onClick={() => (last ? onClose() : setIndex(index + 1))}
          >
            {last ? "Entendi, vamos lá" : "Próximo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
