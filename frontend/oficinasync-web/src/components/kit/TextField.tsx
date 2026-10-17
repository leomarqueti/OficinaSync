import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { fieldClass } from "./fieldStyles";

type Props = InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string; error?: string };

export function FieldMessage({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  if (error) return <p id={`${id}-error`} className="text-sm font-medium text-danger">{error}</p>;
  if (hint) return <p id={`${id}-hint`} className="text-sm text-white/60">{hint}</p>;
  return null;
}

export const describedBy = (id: string, hint?: string, error?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export function TextField({ id, label, hint, error, className, ...rest }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-white/80">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(fieldClass, error && "border-danger/70", className)}
        {...rest}
      />
      <FieldMessage id={id} hint={hint} error={error} />
    </div>
  );
}
