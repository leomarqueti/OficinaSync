import { useState } from "react";

/** Botãozinho "?" que abre uma dica curta em linguagem de oficina (funciona no toque, sem hover). */
export function HelpHint({ text, label = "Ajuda" }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-[11px] font-bold text-muted-foreground hover:text-foreground"
      >
        ?
      </button>
      {open && (
        <span
          role="note"
          className="absolute left-0 top-6 z-50 w-64 rounded-xl border border-border bg-card p-3 text-xs font-normal normal-case tracking-normal text-foreground shadow-xl"
        >
          {text}
        </span>
      )}
    </span>
  );
}
