import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldShell } from "@/components/fields/FieldShell";
import { CnpjField } from "@/components/fields/CnpjField";
import { PhoneField } from "@/components/fields/PhoneField";
import { apiFetch } from "@/lib/api";
import { useDarkTheme } from "@/hooks/useDarkTheme";
import { e164ToDigits, isValidCnpj, isValidPhone } from "@/lib/validators";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function TenantRegisterPage() {
  useDarkTheme();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit =
    name.trim().length >= 2 && isValidCnpj(cnpj) && isValidPhone(e164ToDigits(phone));

  const submit = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Sessão expirada. Volte e crie sua conta novamente.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await apiFetch("/tenants", {
        method: "POST",
        json: { name: name.trim(), cnpj, phone },
        silent: true,
      });

      navigate("/email-send");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar a oficina.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Passo 2 de 3 — Sua oficina
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Registre sua oficina</h1>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
          <div className="h-full w-2/3 rounded-full bg-brand" />
        </div>

        <form
          className="mt-8 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <FieldShell label="Nome da oficina" htmlFor="tenant-name">
            <input
              id="tenant-name"
              type="text"
              placeholder="Ex: Lima Auto Elétrica"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </FieldShell>

          <CnpjField value={cnpj} onChange={setCnpj} />
          <PhoneField value={phone} onChange={setPhone} label="Telefone da oficina" />

          {error && (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90"
            disabled={loading || !canSubmit}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Registrando..." : "Continuar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
