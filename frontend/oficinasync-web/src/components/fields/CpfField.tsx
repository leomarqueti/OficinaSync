import { useState } from "react";
import { FieldShell } from "./FieldShell";
import { formatCpf, isValidCpf, onlyDigits } from "@/lib/validators";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type CpfFieldProps = {
  /** Valor só com dígitos. */
  value: string;
  onChange: (digits: string) => void;
  optional?: boolean;
};

/** CPF com máscara e validação de dígito verificador em tempo real. */
export function CpfField({ value, onChange, optional }: CpfFieldProps) {
  const [touched, setTouched] = useState(false);

  const status =
    !touched || value.length === 0 ? null : isValidCpf(value) ? "valid" : "invalid";

  return (
    <FieldShell
      label="CPF"
      htmlFor="cpf"
      optional={optional}
      status={status}
      errorMessage={value.length < 11 ? "CPF incompleto" : "CPF inválido"}
    >
      <input
        id="cpf"
        type="text"
        inputMode="numeric"
        placeholder="999.999.999-99"
        value={formatCpf(value)}
        onChange={(e) => onChange(onlyDigits(e.target.value).slice(0, 11))}
        onBlur={() => setTouched(true)}
        className={inputClass}
      />
    </FieldShell>
  );
}
