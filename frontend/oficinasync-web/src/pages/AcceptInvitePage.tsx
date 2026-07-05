import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordStrength } from "@/components/fields/PasswordStrength";
import { apiFetch, ApiError } from "@/lib/api";
import { isStrongPassword } from "@/lib/validators";
import { useDarkTheme } from "@/hooks/useDarkTheme";
import logoOficinaSync from "@/assets/logoOficinaSync.png";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const roleLabels: Record<string, string> = {
  mechanic: "Mecânico",
  receptionist: "Recepcionista",
};

type InvitePreview = {
  email: string;
  role: string;
  tenant_name: string;
};

export function AcceptInvitePage() {
  useDarkTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setPreviewError("Link de convite inválido.");
      return;
    }

    apiFetch<InvitePreview>(`/invites/${token}`, { silent: true })
      .then(setPreview)
      .catch((err) => {
        setPreviewError(
          err instanceof ApiError ? err.message : "Convite inválido ou expirado.",
        );
      });
  }, [token]);

  const canSubmit = name.trim().length >= 2 && isStrongPassword(password);

  const submit = async () => {
    if (!canSubmit) return;

    try {
      setLoading(true);
      const result = await apiFetch<{ access_token: string }>("/invites/accept", {
        method: "POST",
        json: { token, name: name.trim(), password },
        silent: true,
      });
      localStorage.setItem("token", result.access_token);
      toast.success("Conta criada! Bem-vindo(a).");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível aceitar o convite.");
    } finally {
      setLoading(false);
    }
  };

  if (previewError) {
    return (
      <div className="dark flex min-h-screen w-full items-center justify-center bg-background p-8 text-foreground">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold">Convite inválido</h1>
          <p className="mt-2 text-sm text-muted-foreground">{previewError}</p>
          <Button className="mt-6" onClick={() => navigate("/login")}>
            Ir pro login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="dark grid min-h-screen w-full grid-cols-1 bg-background text-foreground md:grid-cols-2">
      <div className="hidden items-center justify-center bg-black p-10 md:flex">
        <img src={logoOficinaSync} alt="OficinaSync" className="h-auto w-72 object-contain" />
      </div>

      <div className="flex items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-md">
          {!preview ? (
            <p className="text-sm text-muted-foreground">Carregando convite...</p>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight">Bem-vindo(a)!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Você foi convidado(a) como <strong>{roleLabels[preview.role] ?? preview.role}</strong> em{" "}
                <strong>{preview.tenant_name}</strong>. Crie sua senha pra começar.
              </p>

              <form
                className="mt-8 flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={preview.email}
                    disabled
                    className={`${inputClass} opacity-60`}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Nome completo
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Senha
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="******"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                  />
                  <PasswordStrength password={password} />
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90"
                  disabled={loading || !canSubmit}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Criando conta..." : "Criar conta e entrar"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
