import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useDarkTheme } from "@/hooks/useDarkTheme";
import logoOficinaSync from "@/assets/logoOficinaSync.png";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ForgotPasswordPage() {
  useDarkTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email) return;

    try {
      setLoading(true);
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        json: { email },
        silent: true,
      });
      setSent(true);
    } catch {
      // mesma resposta independente do erro — não revelamos se o email existe
      setSent(true);
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
          {sent ? (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand/10">
                <MailCheck className="h-7 w-7 text-brand" />
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight">Verifique seu email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Se <strong>{email}</strong> estiver cadastrado, você vai receber um link pra
                redefinir a senha em alguns minutos.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-6 w-full"
                onClick={() => navigate("/login")}
              >
                Voltar pro login
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight">Esqueceu a senha?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Digite o email da sua conta pra receber um link de redefinição.
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

                <Button
                  type="submit"
                  className="h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90"
                  disabled={loading || !email}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Enviando..." : "Enviar link de redefinição"}
                </Button>

                <button
                  type="button"
                  className="text-sm font-medium text-muted-foreground hover:underline"
                  onClick={() => navigate("/login")}
                >
                  Voltar pro login
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
