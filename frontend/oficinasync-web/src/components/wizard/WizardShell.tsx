import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type WizardShellProps = {
  stepIndex: number;
  stepCount: number;
  title: string;
  subtitle?: string;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
};

/** Casca compartilhada de todos os passos do wizard: progresso, título, navegação. */
export function WizardShell({
  stepIndex,
  stepCount,
  title,
  subtitle,
  onBack,
  onNext,
  nextLabel = "Continuar",
  nextDisabled,
  loading,
  children,
}: WizardShellProps) {
  const progress = ((stepIndex + 1) / stepCount) * 100;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6 sm:px-6">
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {stepIndex === 0 ? "Cancelar" : "Voltar"}
            </button>
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Passo {stepIndex + 1} de {stepCount}
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex-1 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}

          <div className="pt-6">{children}</div>
        </div>

        <div className="sticky bottom-0 mt-8 border-t border-border bg-background/95 py-4 backdrop-blur-sm">
          <Button
            className="h-12 w-full bg-brand text-base font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
            onClick={onNext}
            disabled={nextDisabled || loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Enviando..." : nextLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
