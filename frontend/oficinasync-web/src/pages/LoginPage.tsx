import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useDarkTheme } from "@/hooks/useDarkTheme";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { clearMeCache } from "@/lib/me";
import { fieldClass } from "@/components/kit";
import { PhoneField } from "@/components/fields/PhoneField";
import { cn } from "@/lib/utils";

const inputClass = fieldClass;
const MODE_KEY = "oficinasync_login_mode";
type Mode = "phone" | "email";

function readMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === "email" ? "email" : "phone";
  } catch {
    return "phone";
  }
}

export function LoginPage() {
  useDarkTheme();
  const navigate = useNavigate();
  const [mode, setModeState] = useState<Mode>(readMode);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const setMode = (m: Mode) => {
    setModeState(m);
    setError("");
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      // sem localStorage: só não lembra a aba
    }
  };

  const enter = (token: string) => {
    localStorage.setItem("token", token);
    clearMeCache();
    navigate("/dashboard");
  };

  const submitPin = async () => {
    if (!phone || pin.length !== 6) {
      setError("Preencha o celular e o PIN de 6 números.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const result = await apiFetch<{ access_token: string }>("/auth/pin-login", {
        method: "POST",
        json: { phone, pin },
        silent: true,
      });
      enter(result.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

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

      enter(result.access_token);
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
        <BrandLogo size="lg" />
      </div>

      <div className="flex items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-md">
          <BrandLogo size="sm" className="mb-8 md:hidden" />
          <h1 className="text-3xl font-bold tracking-tight">Olá, mecânico! 👋</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre na sua conta para acessar as ordens de serviço
          </p>

          <div role="tablist" aria-label="Como entrar" className="mt-8 grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.06] p-1">
            {(["phone", "email"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "min-h-12 rounded-xl text-sm font-bold",
                  mode === m ? "bg-brand text-brand-foreground" : "text-white/70",
                )}
              >
                {m === "phone" ? "Entrar com celular" : "Entrar com e-mail"}
              </button>
            ))}
          </div>

          {mode === "phone" ? (
            <form
              className="mt-6 flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                submitPin();
              }}
            >
              <PhoneField value={phone} onChange={setPhone} label="Celular" />
              <div className="flex flex-col gap-2">
                <label htmlFor="pin" className="text-sm font-medium">
                  PIN
                </label>
                <input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  maxLength={6}
                  placeholder="6 números"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className={`${inputClass} text-center font-mono text-2xl tracking-[0.5em]`}
                />
              </div>
              {error && (
                <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>
              )}
              <p className="text-sm text-muted-foreground">Esqueceu o PIN? Peça um novo acesso ao dono da oficina.</p>
              <Button
                type="submit"
                className="h-14 w-full bg-brand text-lg font-bold text-brand-foreground hover:bg-brand/90"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          ) : (
          <form
            className="mt-6 flex flex-col gap-4"
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
          )}

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
