import { useState } from "react";
import { Loader2 } from "lucide-react";
import { FieldShell } from "./FieldShell";
import { fetchAddressByCep, formatCep } from "@/lib/viaCep";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type CepFieldProps = {
  /** Chamado com o endereço formatado assim que o CEP é encontrado — quem usa decide onde colocar (ex: preencher o campo Endereço). */
  onAddressFound: (address: string) => void;
};

/** CEP com busca automática de endereço (ViaCEP, API pública sem chave) — preenche o campo de endereço sozinho. */
export function CepField({ onAddressFound }: CepFieldProps) {
  const [cep, setCep] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "found" | "not-found">("idle");

  const handleChange = async (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    setCep(digits);
    setStatus("idle");

    if (digits.length !== 8) return;

    setStatus("loading");
    const result = await fetchAddressByCep(digits);
    if (!result) {
      setStatus("not-found");
      return;
    }

    setStatus("found");
    onAddressFound(
      [result.logradouro, result.bairro, `${result.localidade} - ${result.uf}`]
        .filter(Boolean)
        .join(", "),
    );
  };

  return (
    <FieldShell
      label="CEP"
      htmlFor="cep"
      optional
      status={status === "found" ? "valid" : status === "not-found" ? "invalid" : null}
      errorMessage="CEP não encontrado — preencha o endereço manualmente"
    >
      <div className="relative">
        <input
          id="cep"
          type="text"
          inputMode="numeric"
          placeholder="00000-000"
          value={formatCep(cep)}
          onChange={(e) => handleChange(e.target.value)}
          className={inputClass}
        />
        {status === "loading" && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
    </FieldShell>
  );
}
