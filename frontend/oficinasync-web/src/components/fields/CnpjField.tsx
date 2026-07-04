import { useState } from "react";
import { FieldShell } from "./FieldShell";
import { formatCnpj, isValidCnpj, onlyDigits } from "@/lib/validators";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type CnpjFieldProps = {
  /** Valor só com dígitos. */
  value: string;
  onChange: (digits: string) => void;
};

/** CNPJ com máscara e validação de dígito verificador em tempo real. */
export function CnpjField({ value, onChange }: CnpjFieldProps) {
  const [touched, setTouched] = useState(false);

  const status =
    !touched || value.length === 0 ? null : isValidCnpj(value) ? "valid" : "invalid";

  return (
    <FieldShell
      label="CNPJ"
      htmlFor="cnpj"
      status={status}
      errorMessage={value.length < 14 ? "CNPJ incompleto" : "CNPJ inválido"}
    >
      <input
        id="cnpj"
        type="text"
        inputMode="numeric"
        placeholder="99.999.999/9999-99"
        value={formatCnpj(value)}
        onChange={(e) => onChange(onlyDigits(e.target.value).slice(0, 14))}
        onBlur={() => setTouched(true)}
        className={inputClass}
      />
    </FieldShell>
  );
}
