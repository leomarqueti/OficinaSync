import { useNavigate } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDarkTheme } from "@/hooks/useDarkTheme";

export function EmailSendPage() {
  useDarkTheme();
  const navigate = useNavigate();

  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Passo 3 de 3 — Confirmação
        </p>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
          <div className="h-full w-full rounded-full bg-brand" />
        </div>

        <div className="mt-10 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
            <MailCheck className="h-8 w-8 text-brand" />
          </div>
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">Email enviado com sucesso!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Verifique sua caixa de entrada e confirme o email antes de entrar.
        </p>

        <Button
          className="mt-8 h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={() => navigate("/login")}
        >
          Ir para login
        </Button>
      </div>
    </div>
  );
}
