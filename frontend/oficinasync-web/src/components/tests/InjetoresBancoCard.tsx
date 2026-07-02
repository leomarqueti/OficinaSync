import type { InjetoresBancoData } from "./testTypes";
import { resolveMediaUrl } from "./testTypes";

const sprayLabels: Record<string, string> = {
  OK: "OK",
  IRREGULAR: "Irregular",
  ENTUPIDO: "Entupido",
  GOTEJANDO: "Gotejando",
};

function getSprayPillClass(spray: string) {
  const map: Record<string, string> = {
    OK: "bg-emerald-100 text-emerald-700",
    IRREGULAR: "bg-amber-100 text-amber-700",
    ENTUPIDO: "bg-red-100 text-red-700",
    GOTEJANDO: "bg-red-100 text-red-700",
  };

  return map[spray] ?? "bg-muted text-foreground";
}

type InjetoresBancoCardProps = {
  data: InjetoresBancoData;
  sectionMedias: { media_id: number; url?: string }[];
};

export function InjetoresBancoCard({ data, sectionMedias }: InjetoresBancoCardProps) {
  const fotoAntes = resolveMediaUrl(data.fotoAntesMediaId, sectionMedias) ?? data.fotoAntesPreviewUrl;
  const fotoDepois = resolveMediaUrl(data.fotoDepoisMediaId, sectionMedias) ?? data.fotoDepoisPreviewUrl;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {data.tool && `Ferramenta: ${data.tool}`}
        {data.pulsos && ` • ${data.pulsos} pulsos`}
        {(data.specMin || data.specMax) &&
          ` • Especificado: ${data.specMin || "-"}–${data.specMax || "-"} ${data.unit}`}
      </p>

      {(fotoAntes || fotoDepois) && (
        <div className="grid grid-cols-2 gap-3">
          {fotoAntes && (
            <div>
              <img src={fotoAntes} alt="Antes" className="h-32 w-full rounded-xl object-cover" />
              <p className="mt-1 text-center text-xs text-muted-foreground">Antes</p>
            </div>
          )}
          {fotoDepois && (
            <div>
              <img src={fotoDepois} alt="Depois" className="h-32 w-full rounded-xl object-cover" />
              <p className="mt-1 text-center text-xs text-muted-foreground">Depois</p>
            </div>
          )}
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="pb-1 pr-2 font-medium">Injetor</th>
            <th className="pb-1 pr-2 font-medium">Volume</th>
            <th className="pb-1 font-medium">Spray</th>
          </tr>
        </thead>
        <tbody>
          {data.injectors.map((inj, index) => (
            <tr key={index} className="border-t">
              <td className="py-1 pr-2">{inj.number}</td>
              <td className="py-1 pr-2">
                {inj.value} {data.unit}
              </td>
              <td className="py-1">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getSprayPillClass(
                    inj.sprayPattern
                  )}`}
                >
                  {sprayLabels[inj.sprayPattern] ?? inj.sprayPattern}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
