import { Check, X } from "lucide-react";

type FieldShellProps = {
  label: string;
  htmlFor: string;
  optional?: boolean;
  /** null = sem validação ainda mostrada (campo vazio ou intocado). */
  status?: "valid" | "invalid" | null;
  errorMessage?: string;
  children: React.ReactNode;
};

/** Rótulo + slot de input + mensagem de erro/sucesso inline, padrão de todos os campos validados. */
export function FieldShell({
  label,
  htmlFor,
  optional,
  status,
  errorMessage,
  children,
}: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
          {optional && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              (opcional)
            </span>
          )}
        </label>
        {status === "valid" && (
          <span className="flex items-center gap-1 text-xs font-medium text-brand">
            <Check className="h-3.5 w-3.5" /> válido
          </span>
        )}
      </div>

      {children}

      {status === "invalid" && errorMessage && (
        <span className="flex items-center gap-1 text-xs font-medium text-red-400">
          <X className="h-3.5 w-3.5" /> {errorMessage}
        </span>
      )}
    </div>
  );
}
