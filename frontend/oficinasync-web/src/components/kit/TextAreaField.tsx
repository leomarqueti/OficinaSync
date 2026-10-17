import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { textAreaClass } from "./fieldStyles";
import { FieldMessage, describedBy } from "./TextField";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; label: string; hint?: string; error?: string };

export function TextAreaField({ id, label, hint, error, className, ...rest }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-white/80">
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(textAreaClass, error && "border-danger/70", className)}
        {...rest}
      />
      <FieldMessage id={id} hint={hint} error={error} />
    </div>
  );
}
