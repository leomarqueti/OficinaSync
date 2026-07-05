import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordStrength } from "@/components/fields/PasswordStrength";
import { apiFetch } from "@/lib/api";
import { isStrongPassword } from "@/lib/validators";
import { useDarkTheme } from "@/hooks/useDarkTheme";
import logoOficinaSync from "@/assets/logoOficinaSync.png";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ResetPasswordPage() {
  useDarkTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = isStrongPassword(password) && passwordsMatch && !!token;

  const submit = async () => {
    if (!canSubmit) return;

    try {
      setLoading(true);
      await apiFetch("/auth/reset-password", {
        method: "POST",
        json: { token, new_password: password },
        silent: true,
      });
      toast.success("Senha redefinida! Faça login com a nova senha.");
      navigate("/login");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Link inválido ou expirado.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="dark flex min-h-screen w-full items-center justify-center bg-background p-8 text-foreground">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold">Link inválido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esse link de redefinição não é válido. Peça um novo na tela de login.
          </p>
          <Button className="mt-6" onClick={() => navigate("/esqueci-senha")}>
            Pedir novo link
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
          <h1 className="text-3xl font-bold tracking-tight">Redefinir senha</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Escolha uma nova senha pra sua conta.
          </p>

          <form
            className="mt-8 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium">
                Nova senha
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

            <div className="flex flex-col gap-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmar senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="******"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-400">As senhas não coincidem.</p>
              )}
            </div>

            <Button
              type="submit"
              className="h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90"
              disabled={loading || !canSubmit}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Salvando..." : "Redefinir senha"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
