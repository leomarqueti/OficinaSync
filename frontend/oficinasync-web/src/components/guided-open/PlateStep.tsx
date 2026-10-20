import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { BigButton } from "@/components/kit";
import { fieldClass } from "@/components/kit";
import { apiFetch } from "@/lib/api";
import { applyMatch, normalizePlate, resolvePlateMatch, type PlateMatch } from "@/lib/guidedOpen";
import { isValidPlate } from "@/lib/validators";
import { cn } from "@/lib/utils";
import type { StepProps } from "./types";

function describe(m: PlateMatch): string {
  const car = [m.brand, m.model, m.year].filter(Boolean).join(" ") || "carro";
  return `${car}${m.color ? ` ${m.color.toLowerCase()}` : ""}`;
}

/**
 * Tela 1: só a placa. Placa já cadastrada → "É o Gol prata do Seu João?" (nunca cria carro repetido).
 * Esta tela decide sozinha como avançar (não usa o "Continuar" da moldura).
 */
export function PlateStep({ state, onChange, onNext }: StepProps) {
  const reduced = useReducedMotion();
  const plate = normalizePlate(state.plate);
  const valid = isValidPlate(state.plate);
  const [matches, setMatches] = useState<PlateMatch[] | null>(null);

  useEffect(() => {
    setMatches(null);
    if (!valid) return;
    let alive = true;
    const handle = setTimeout(() => {
      apiFetch<PlateMatch[]>(`/cars/by-plate/${plate}`, { silent: true })
        .then((found) => alive && setMatches(found))
        .catch(() => alive && setMatches([]));
    }, 400);
    return () => {
      alive = false;
      clearTimeout(handle);
    };
  }, [plate, valid]);

  const result = matches ? resolvePlateMatch(matches) : null;

  const useCar = (m: PlateMatch, correcting: boolean) => {
    onChange({ ...applyMatch(state, m), correcting });
    onNext();
  };

  return (
    <div className="flex flex-col gap-5">
      <motion.div
        initial={reduced ? false : { scale: 0.6, rotate: -6, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className="mx-auto w-full max-w-xs overflow-hidden rounded-xl border-4 border-[#0a0a0a] bg-white text-center shadow-[0_18px_40px_-12px_rgba(0,0,0,.8)]"
        aria-hidden="true"
      >
        <div className="bg-[#1e40af] py-1 text-xs font-bold tracking-[0.3em] text-white">BRASIL</div>
        <div className="py-2 font-display text-5xl font-extrabold tracking-[0.15em] text-[#111]">{plate || "ABC1D23"}</div>
      </motion.div>

      <label htmlFor="plate" className="text-base font-semibold text-white/80">
        Placa do carro
      </label>
      <input
        id="plate"
        autoFocus
        autoComplete="off"
        inputMode="text"
        maxLength={8}
        value={state.plate}
        onChange={(e) => onChange({ plate: e.target.value.toUpperCase(), match: null, correcting: false })}
        placeholder="ABC1D23"
        className={cn(fieldClass, "h-16 text-center font-display text-3xl uppercase tracking-[0.2em]")}
      />

      {valid && result === null && <p className="text-center text-base text-white/70">Procurando essa placa…</p>}

      {result?.kind === "one" && (
        <div className="rounded-2xl border-2 border-brand/50 bg-brand/10 p-4">
          <p className="text-lg font-semibold">
            É o <b className="text-brand">{describe(result.match)}</b>
            {result.match.owner ? (
              <>
                {" "}
                do <b className="text-brand">{result.match.owner.name}</b>
              </>
            ) : null}
            ?
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <BigButton onClick={() => useCar(result.match, false)}>Sim, é esse</BigButton>
            <BigButton variant="secondary" onClick={() => useCar(result.match, true)}>
              Não, corrigir os dados
            </BigButton>
          </div>
        </div>
      )}

      {result?.kind === "many" && (
        <div className="flex flex-col gap-2">
          <p className="text-base font-semibold text-white/80">Essa placa aparece mais de uma vez. Qual é?</p>
          {result.matches.map((m) => (
            <button
              key={m.car_id}
              type="button"
              onClick={() => useCar(m, false)}
              className="min-h-14 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-left text-base font-semibold"
            >
              {describe(m)}
              {m.owner ? ` — ${m.owner.name}` : ""}
            </button>
          ))}
        </div>
      )}

      {result?.kind === "none" && (
        <div className="flex flex-col gap-2">
          <p className="text-center text-base text-white/70">Carro novo por aqui. Vamos cadastrar.</p>
          <BigButton size="hero" onClick={onNext}>
            Continuar
          </BigButton>
        </div>
      )}
    </div>
  );
}
