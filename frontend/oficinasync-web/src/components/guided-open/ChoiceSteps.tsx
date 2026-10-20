import { useState } from "react";
import { BigButton, fieldClass } from "@/components/kit";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { CAR_BRANDS } from "@/lib/carBrands";
import { modelsFor, yearOptions } from "@/lib/carCatalog";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { isValidYear } from "@/lib/validators";
import type { StepProps } from "./types";

const tile =
  "flex min-h-16 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-2 text-center font-display text-lg font-extrabold uppercase leading-tight transition-transform active:scale-95";
const tileOn = "border-brand bg-brand/15 text-brand";

/** Campo livre pra "Outra"/"Não achei"/"Outro ano", com seu próprio Continuar. */
function FreeText({
  id,
  label,
  value,
  onChange,
  onDone,
  canContinue,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onDone: () => void;
  canContinue: boolean;
  inputMode?: "text" | "numeric";
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <label htmlFor={id} className="text-base font-semibold text-white/80">
        {label}
      </label>
      <input id={id} autoFocus inputMode={inputMode} value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass} />
      <BigButton disabled={!canContinue} onClick={onDone}>
        Continuar
      </BigButton>
    </div>
  );
}

/** Tela 2: marca em botões grandes; tocou, avançou. */
export function BrandStep({ state, onChange, onNext }: StepProps) {
  const known = (CAR_BRANDS as readonly string[]).includes(state.brand);
  const [other, setOther] = useState(Boolean(state.brand) && !known);
  return (
    <div>
      <Stagger className="grid grid-cols-3 gap-2">
        {CAR_BRANDS.map((brand) => (
          <StaggerItem key={brand}>
            <button
              type="button"
              className={cn(tile, state.brand === brand && tileOn)}
              onClick={() => {
                haptic();
                onChange({ brand, model: state.brand === brand ? state.model : "" });
                onNext();
              }}
            >
              {brand}
            </button>
          </StaggerItem>
        ))}
        <StaggerItem>
          <button type="button" className={cn(tile, other && tileOn)} onClick={() => setOther(true)}>
            Outra
          </button>
        </StaggerItem>
      </Stagger>
      {other && (
        <FreeText
          id="brand-other"
          label="Qual a marca?"
          value={known ? "" : state.brand}
          onChange={(brand) => onChange({ brand, model: "" })}
          onDone={onNext}
          canContinue={state.brand.trim().length >= 2}
        />
      )}
    </div>
  );
}

/** Tela 3: só os modelos da marca escolhida; "Não achei" abre o campo livre. */
export function ModelStep({ state, onChange, onNext }: StepProps) {
  const models = modelsFor(state.brand);
  const [other, setOther] = useState(models.length === 0 || (Boolean(state.model) && !models.includes(state.model)));
  return (
    <div>
      <div className="flex flex-col gap-2">
        {models.map((model) => (
          <button
            key={model}
            type="button"
            className={cn(tile, "min-h-14 justify-start px-4 text-left", state.model === model && tileOn)}
            onClick={() => {
              haptic();
              onChange({ model });
              onNext();
            }}
          >
            {model}
          </button>
        ))}
        <button type="button" className={cn(tile, "min-h-14 justify-start px-4 text-left text-white/80", other && tileOn)} onClick={() => setOther(true)}>
          Não achei
        </button>
      </div>
      {other && (
        <FreeText
          id="model-other"
          label="Qual o modelo?"
          value={models.includes(state.model) ? "" : state.model}
          onChange={(model) => onChange({ model })}
          onDone={onNext}
          canContinue={state.model.trim().length >= 1}
        />
      )}
    </div>
  );
}

/** Tela 4: ano em botões, do mais novo pro mais velho. */
export function YearStep({ state, onChange, onNext }: StepProps) {
  const years = yearOptions();
  const shown = years.slice(0, 32);
  const [other, setOther] = useState(Boolean(state.year) && !shown.includes(Number(state.year)));
  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {shown.map((year) => (
          <button
            key={year}
            type="button"
            className={cn(tile, "min-h-14 text-xl", state.year === String(year) && tileOn)}
            onClick={() => {
              haptic();
              onChange({ year: String(year) });
              onNext();
            }}
          >
            {year}
          </button>
        ))}
        <button type="button" className={cn(tile, "col-span-4 min-h-14", other && tileOn)} onClick={() => setOther(true)}>
          Outro ano
        </button>
      </div>
      {other && (
        <FreeText
          id="year-other"
          label="De que ano?"
          inputMode="numeric"
          value={state.year}
          onChange={(year) => onChange({ year: year.replace(/\D/g, "").slice(0, 4) })}
          onDone={onNext}
          canContinue={isValidYear(state.year)}
        />
      )}
    </div>
  );
}
