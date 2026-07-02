import type { LeituraDtcData } from "./testTypes";
import { dtcStatusLabels, getDtcStatusPillClass } from "./testTypes";

export function LeituraDtcCard({ data }: { data: LeituraDtcData }) {
  const systems = data.systemsOk
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3">
      {data.scanner && (
        <p className="text-sm text-muted-foreground">Scanner: {data.scanner}</p>
      )}

      {data.dtcs.length > 0 && (
        <div className="space-y-2">
          {data.dtcs.map((dtc, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold">
                  {dtc.code}
                  {dtc.module && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {dtc.module}
                    </span>
                  )}
                </p>
                {dtc.description && (
                  <p className="text-sm text-muted-foreground">{dtc.description}</p>
                )}
              </div>

              <span
                className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${getDtcStatusPillClass(
                  dtc.status
                )}`}
              >
                {dtcStatusLabels[dtc.status] ?? dtc.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {systems.length > 0 && (
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="text-xs font-medium text-emerald-700">
            ✅ Sistemas OK: {systems.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
