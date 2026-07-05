import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useDarkTheme } from "@/hooks/useDarkTheme";
import logoOficinaSync from "@/assets/logoOficinaSync.png";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function LoginPage() {
  useDarkTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) {
      setError("Preencha email e senha.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await apiFetch<{ access_token: string }>("/auth/login", {
        method: "POST",
        json: { email, password },
        silent: true,
      });

      localStorage.setItem("token", result.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível entrar. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark grid min-h-screen w-full grid-cols-1 bg-background text-foreground md:grid-cols-2">
      <div className="hidden items-center justify-center bg-black p-10 md:flex">
        <img src={logoOficinaSync} alt="OficinaSync" className="h-auto w-72 object-contain" />
      </div>

      <div className="flex items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold tracking-tight">Olá, mecânico! 👋</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre na sua conta para acessar as ordens de serviço
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
                placeholder="seuemail@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="senha" className="text-sm font-medium">
                Senha
              </label>
              <input
                id="senha"
                type="password"
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="button"
              className="w-fit text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => navigate("/esqueci-senha")}
            >
              Esqueceu a senha?
            </button>

            <Button
              type="submit"
              className="h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Entrando..." : "Entrar no sistema"}
            </Button>
          </form>

          <div className="mt-8">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Não tem conta?{" "}
              <button
                type="button"
                className="font-semibold text-brand hover:underline"
                onClick={() => navigate("/register")}
              >
                Criar grátis →
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
