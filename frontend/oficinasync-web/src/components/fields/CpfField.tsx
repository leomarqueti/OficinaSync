import { useState } from "react";
import { FieldShell } from "./FieldShell";
import { formatCpf, isValidCpf, onlyDigits } from "@/lib/validators";
import { fieldClass } from "@/components/kit";

const inputClass = fieldClass;

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
