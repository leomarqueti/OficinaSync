import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordStrength } from "@/components/fields/PasswordStrength";
import { apiFetch } from "@/lib/api";
import { useDarkTheme } from "@/hooks/useDarkTheme";
import { isStrongPassword } from "@/lib/validators";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function UserRegisterPage() {
  useDarkTheme();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordsMatch = password.length > 0 && password === passwordConfirm;
  const canSubmit =
    name.trim().length >= 2 && email.includes("@") && isStrongPassword(password) && passwordsMatch;

  const submit = async () => {
    if (!isStrongPassword(password)) {
      setError("A senha ainda não atende aos requisitos abaixo.");
      return;
    }

    if (!passwordsMatch) {
      setError("As senhas não coincidem.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await apiFetch<{ onboarding_token: string }>("/auth/register", {
        method: "POST",
        json: { name: name.trim(), email: email.trim(), password },
        silent: true,
      });

      localStorage.setItem("token", result.onboarding_token);
      navigate("/tenant-register");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Passo 1 de 3 — Dados de acesso
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Criar sua conta</h1>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
          <div className="h-full w-1/3 rounded-full bg-brand" />
        </div>

        <form
          className="mt-8 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Nome completo</label>
            <input
              type="text"
              placeholder="Ex: Kessya Yasmine Marqueti"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              placeholder="seuemail@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Senha</label>
            <input
              type="password"
              placeholder="Crie uma senha segura"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <PasswordStrength password={password} />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Confirmar senha</label>
            <input
              type="password"
              placeholder="Repita a senha"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className={inputClass}
            />
            {passwordConfirm.length > 0 && !passwordsMatch && (
              <p className="text-xs font-medium text-red-400">As senhas não coincidem.</p>
            )}
          </div>

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
            {loading ? "Criando..." : "Continuar"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <button
              type="button"
              className="font-semibold text-brand hover:underline"
              onClick={() => navigate("/login")}
            >
              Entrar
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
