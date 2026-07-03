import { CheckCircle2 } from "lucide-react";
import type { LeituraDtcData } from "@/components/tests/testTypes";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { DtcChip } from "./chips";

/**
 * Leitura de scanner como "fichas de evidência": o código da falha em
 * destaque monoespaçado, a explicação em linguagem clara e o status.
 */
export function StoryDtc({ data }: { data: LeituraDtcData }) {
  const systems = data.systemsOk
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4">
      {data.scanner && (
        <p className="text-xs text-white/40">Scanner: {data.scanner}</p>
      )}

      <Stagger className="space-y-3">
        {data.dtcs.map((dtc, index) => (
          <StaggerItem
            key={index}
            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-4">
              <span className="rounded-lg bg-white/5 px-3 py-2 font-mono text-lg font-bold tracking-wider text-white">
                {dtc.code}
              </span>
              <div>
                {dtc.description && (
                  <p className="text-sm font-medium text-white/90">{dtc.description}</p>
                )}
                {dtc.module && (
                  <p className="mt-0.5 text-xs text-white/40">Módulo: {dtc.module}</p>
                )}
              </div>
            </div>

            <DtcChip status={dtc.status} />
          </StaggerItem>
        ))}
      </Stagger>

      {systems.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Sistemas verificados sem falhas:
          </span>
          {systems.map((system) => (
            <span
              key={system}
              className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/70"
            >
              {system}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
