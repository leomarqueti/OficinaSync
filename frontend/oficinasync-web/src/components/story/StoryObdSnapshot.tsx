import { Radio } from "lucide-react";
import type { ObdSnapshotData } from "@/components/tests/testTypes";
import { obdParamLabels } from "@/components/tests/testTypes";
import { describeDtc } from "@/lib/dtcCodes";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";

function formatValue(value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/**
 * Snapshot do scanner OBD da oficina: grade de parâmetros lidos direto da
 * ECU + códigos de falha presentes no momento da captura. Dado de máquina,
 * não digitado — o carimbo de coleta reforça isso pro cliente.
 */
export function StoryObdSnapshot({ data }: { data: ObdSnapshotData }) {
  const params = Object.entries(data.params ?? {}).filter(
    ([, value]) => value !== null && value !== undefined,
  );

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-1.5 text-xs text-white/40">
        <Radio className="h-3.5 w-3.5" />
        Coletado direto da central do veículo
        {data.device_name ? ` · ${data.device_name}` : ""}
        {data.collected_at
          ? ` · ${new Date(data.collected_at).toLocaleString("pt-BR")}`
          : ""}
      </p>

      {(params.length > 0 || data.voltage != null) && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {data.voltage != null && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-white/40">Tensão da bateria</p>
              <p className="mt-0.5 text-lg font-bold text-white">
                {formatValue(data.voltage)}{" "}
                <span className="text-xs font-normal text-white/40">V</span>
              </p>
            </div>
          )}
          {params.map(([key, value]) => {
            const meta = obdParamLabels[key] ?? { label: key, unit: "" };
            return (
              <div
                key={key}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
              >
                <p className="text-xs text-white/40">{meta.label}</p>
                <p className="mt-0.5 text-lg font-bold text-white">
                  {formatValue(value)}{" "}
                  {meta.unit && (
                    <span className="text-xs font-normal text-white/40">
                      {meta.unit}
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {(data.dtcs ?? []).length > 0 ? (
        <Stagger className="space-y-2">
          {data.dtcs.map((dtc, index) => (
            <StaggerItem
              key={index}
              className="flex items-center gap-4 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-3"
            >
              <span className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-base font-bold tracking-wider text-white">
                {dtc.code}
              </span>
              <p className="text-sm text-white/80">
                {dtc.description ?? describeDtc(dtc.code)}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <p className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-3 text-sm text-emerald-300">
          Nenhum código de falha presente no momento da leitura.
        </p>
      )}
    </div>
  );
}
