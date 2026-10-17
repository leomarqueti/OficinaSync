import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { fieldClass } from "./fieldStyles";
import { FieldMessage, describedBy } from "./TextField";

type Props = SelectHTMLAttributes<HTMLSelectElement> & { id: string; label: string; hint?: string; error?: string };

export function SelectField({ id, label, hint, error, className, children, ...rest }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-white/80">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={cn(fieldClass, "appearance-none pr-10", error && "border-danger/70", className)}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60"
        />
      </div>
      <FieldMessage id={id} hint={hint} error={error} />
    </div>
  );
}
