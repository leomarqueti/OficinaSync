import { useState } from "react";
import { FieldShell } from "./FieldShell";
import { isValidYear, onlyDigits } from "@/lib/validators";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type YearFieldProps = {
  value: string;
  onChange: (year: string) => void;
};

/** Ano do veículo — só dígitos, valida faixa sã (1950 até ano que vem). */
export function YearField({ value, onChange }: YearFieldProps) {
  const [touched, setTouched] = useState(false);

  const status = !touched || value.length === 0 ? null : isValidYear(value) ? "valid" : "invalid";

  return (
    <FieldShell
      label="Ano"
      htmlFor="year"
      status={status}
      errorMessage="Ano inválido"
    >
      <input
        id="year"
        type="text"
        inputMode="numeric"
        placeholder="Ex: 2015"
        value={value}
        onChange={(e) => onChange(onlyDigits(e.target.value).slice(0, 4))}
        onBlur={() => setTouched(true)}
        className={inputClass}
      />
    </FieldShell>
  );
}
