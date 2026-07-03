import { CheckCircle2, AlertTriangle, XCircle, MinusCircle } from "lucide-react";
import { tone, type Tone } from "./statusMaps";

/**
 * Chips de status no tema Cinema Escuro (translúcidos sobre fundo preto).
 * Compartilhados por todos os blocos de teste da página do cliente.
 */

export function Chip({
  children,
  color = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  color?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${tone[color]} ${className}`}
    >
      {children}
    </span>
  );
}

const verdictConfig: Record<
  string,
  { label: string; color: Tone; icon: React.ReactNode }
> = {
  approved: {
    label: "Aprovado",
    color: "emerald",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  failed: {
    label: "Reprovado",
    color: "red",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  inconclusive: {
    label: "Atenção",
    color: "amber",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
};

export function VerdictChip({ verdict }: { verdict: string | null }) {
  if (!verdict) {
    return (
      <Chip color="neutral">
        <MinusCircle className="h-3.5 w-3.5" />
        Registrado
      </Chip>
    );
  }

  const config = verdictConfig[verdict];

  if (!config) return <Chip color="neutral">{verdict}</Chip>;

  return (
    <Chip color={config.color}>
      {config.icon}
      {config.label}
    </Chip>
  );
}

const dtcStatusConfig: Record<string, { label: string; color: Tone }> = {
  confirmado: { label: "Confirmado", color: "red" },
  intermitente: { label: "Intermitente", color: "amber" },
  passado: { label: "Histórico", color: "blue" },
  eliminado: { label: "Eliminado", color: "emerald" },
};

export function DtcChip({ status }: { status: string }) {
  const config = dtcStatusConfig[status] ?? { label: status, color: "neutral" as Tone };
  return <Chip color={config.color}>{config.label}</Chip>;
}

const sprayConfig: Record<string, { label: string; color: Tone }> = {
  OK: { label: "Spray OK", color: "emerald" },
  IRREGULAR: { label: "Irregular", color: "amber" },
  ENTUPIDO: { label: "Entupido", color: "red" },
  GOTEJANDO: { label: "Gotejando", color: "red" },
};

export function SprayChip({ pattern }: { pattern: string }) {
  const config = sprayConfig[pattern] ?? { label: pattern, color: "neutral" as Tone };
  return <Chip color={config.color}>{config.label}</Chip>;
}
