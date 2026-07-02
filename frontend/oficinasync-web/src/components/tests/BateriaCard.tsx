import type { BateriaData } from "./testTypes";

const resultadoLabels: Record<string, string> = {
  APROVADA: "Aprovada",
  INSPECAO: "Necessita inspeção",
  REPROVADA: "Reprovada",
};

function getResultadoPillClass(resultado: string) {
  const map: Record<string, string> = {
    APROVADA: "bg-emerald-100 text-emerald-700",
    INSPECAO: "bg-amber-100 text-amber-700",
    REPROVADA: "bg-red-100 text-red-700",
  };

  return map[resultado] ?? "bg-muted text-foreground";
}

function Metric({ label, value }: { label: string; value: string }) {
  if (!value) return null;

  return (
    <div className="rounded-xl bg-muted/40 p-3 text-center">
      <p className="text-lg font-bold">{value}V</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function BateriaCard({ data }: { data: BateriaData }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {data.tool ? `Ferramenta: ${data.tool}` : "Teste de bateria"}
        </p>

        {data.resultado && (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getResultadoPillClass(
              data.resultado
            )}`}
          >
            {resultadoLabels[data.resultado] ?? data.resultado}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric label="Repouso" value={data.tensaoRepouso} />
        <Metric label="Mín. na partida" value={data.tensaoMinPartida} />
        <Metric label="Máx. em carga" value={data.tensaoMaxCarga} />
        <Metric label="Queda de tensão" value={data.quedaTensao} />
        {data.tempArrefecimento && (
          <div className="rounded-xl bg-muted/40 p-3 text-center">
            <p className="text-lg font-bold">{data.tempArrefecimento}°C</p>
            <p className="text-xs text-muted-foreground">Arrefecimento</p>
          </div>
        )}
      </div>
    </div>
  );
}
