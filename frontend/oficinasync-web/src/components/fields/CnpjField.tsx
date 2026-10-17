import { useState } from "react";
import { FieldShell } from "./FieldShell";
import { formatCnpj, isValidCnpj, onlyDigits } from "@/lib/validators";
import { fieldClass } from "@/components/kit";

const inputClass = fieldClass;

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
