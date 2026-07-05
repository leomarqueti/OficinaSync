import { FieldShell } from "./FieldShell";
import { formatKm, onlyDigits } from "@/lib/validators";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type KmFieldProps = {
  /** Valor só com dígitos. */
  value: string;
  onChange: (digits: string) => void;
  label?: string;
};

/** Quilometragem com separador de milhar (123.000) e teclado numérico no celular. */
export function KmField({ value, onChange, label = "Quilometragem de entrada" }: KmFieldProps) {
  return (
    <FieldShell label={label} htmlFor="km">
      <input
        id="km"
        type="text"
        inputMode="numeric"
        placeholder="Ex: 125.000"
        value={formatKm(value)}
        onChange={(e) => onChange(onlyDigits(e.target.value).slice(0, 7))}
        className={inputClass}
      />
    </FieldShell>
  );
}
