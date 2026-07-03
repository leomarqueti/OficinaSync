import type { BateriaData } from "@/components/tests/testTypes";
import { CountUp } from "@/components/motion/CountUp";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Chip } from "./chips";

const resultadoConfig: Record<string, { label: string; color: "emerald" | "amber" | "red" }> = {
  APROVADA: { label: "Bateria aprovada", color: "emerald" },
  INSPECAO: { label: "Necessita inspeção", color: "amber" },
  REPROVADA: { label: "Bateria reprovada", color: "red" },
};

function Metric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix: string;
}) {
  if (!value) return null;

  return (
    <StaggerItem className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
      <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
        <CountUp value={value} decimals={1} suffix={suffix} />
      </p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/50">
        {label}
      </p>
    </StaggerItem>
  );
}

/** Teste de bateria como painel de métricas que "sobem" ao entrar na tela. */
export function StoryBateria({ data }: { data: BateriaData }) {
  const resultado = data.resultado ? resultadoConfig[data.resultado] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {data.tool ? (
          <p className="text-xs text-white/40">Equipamento: {data.tool}</p>
        ) : (
          <span />
        )}
        {resultado && <Chip color={resultado.color}>{resultado.label}</Chip>}
      </div>

      <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Tensão em repouso" value={data.tensaoRepouso} suffix="V" />
        <Metric label="Mínima na partida" value={data.tensaoMinPartida} suffix="V" />
        <Metric label="Máxima em carga" value={data.tensaoMaxCarga} suffix="V" />
        <Metric label="Queda de tensão" value={data.quedaTensao} suffix="V" />
        <Metric label="Arrefecimento" value={data.tempArrefecimento} suffix="°C" />
      </Stagger>
    </div>
  );
}
