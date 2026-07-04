import { useState } from "react";
import { FieldShell } from "./FieldShell";
import { e164ToDigits, formatPhone, isValidPhone, onlyDigits, phoneToE164 } from "@/lib/validators";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type PhoneFieldProps = {
  /** Valor em E.164 (+5514997951011) — o que o backend espera. */
  value: string;
  onChange: (e164: string) => void;
  label?: string;
  optional?: boolean;
};

/**
 * Telefone que se formata sozinho enquanto o usuário digita —
 * "+55" nunca é digitado, é adicionado por baixo automaticamente.
 */
export function PhoneField({ value, onChange, label = "WhatsApp / Telefone", optional }: PhoneFieldProps) {
  const [touched, setTouched] = useState(false);
  const digits = e164ToDigits(value);

  const status = !touched || digits.length === 0 ? null : isValidPhone(digits) ? "valid" : "invalid";

  return (
    <FieldShell
      label={label}
      htmlFor="phone"
      optional={optional}
      status={status}
      errorMessage={digits.length < 10 ? "Telefone incompleto" : "Número inválido"}
    >
      <input
        id="phone"
        type="tel"
        inputMode="tel"
        placeholder="(14) 99795-1011"
        value={formatPhone(digits)}
        onChange={(e) => onChange(phoneToE164(onlyDigits(e.target.value)))}
        onBlur={() => setTouched(true)}
        className={inputClass}
      />
    </FieldShell>
  );
}
