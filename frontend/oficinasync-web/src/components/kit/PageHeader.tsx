import type { ReactNode } from "react";

/** Cabeçalho de página: título grande em caixa alta (trunca nome longo) + subtítulo + ação. */
export function PageHeader({
  title,
  subtitle,
  action,
  leading,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {leading}
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl font-extrabold uppercase leading-tight tracking-wide md:text-4xl">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
