import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

/** Aviso amarelo: algo precisa de ação (ex.: falta foto de entrada). */
export function AlertBanner({
  children,
  actionLabel,
  onAction,
}: {
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border-l-4 border-warning bg-warning/10 px-4 py-3 text-warning">
      <TriangleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1 text-sm font-semibold">{children}</div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="min-h-11 shrink-0 rounded-lg bg-warning px-3 text-sm font-bold text-[#0a0a0a]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
