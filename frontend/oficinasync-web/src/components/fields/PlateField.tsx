import { useState } from "react";
import { FieldShell } from "./FieldShell";
import { formatPlate, isValidPlate } from "@/lib/validators";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring uppercase";

type PlateFieldProps = {
  value: string;
  onChange: (plate: string) => void;
};

/** Placa com auto-maiúsculas, aceita padrão antigo (ABC-1234) e Mercosul (ABC1D23). */
export function PlateField({ value, onChange }: PlateFieldProps) {
  const [touched, setTouched] = useState(false);

  const status = !touched || value.length === 0 ? null : isValidPlate(value) ? "valid" : "invalid";

  return (
    <FieldShell
      label="Placa"
      htmlFor="plate"
      status={status}
      errorMessage="Placa inválida"
    >
      <input
        id="plate"
        type="text"
        placeholder="ABC-1234 ou ABC1D23"
        value={formatPlate(value)}
        onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7))}
        onBlur={() => setTouched(true)}
        className={inputClass}
      />
    </FieldShell>
  );
}
