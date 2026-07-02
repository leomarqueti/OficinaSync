import type { CompressaoMecanicaData } from "./testTypes";
import { getItemStatusPillClass, itemStatusLabels, resolveMediaUrl } from "./testTypes";

type CompressaoMecanicaCardProps = {
  data: CompressaoMecanicaData;
  sectionMedias: { media_id: number; url?: string }[];
};

export function CompressaoMecanicaCard({ data, sectionMedias }: CompressaoMecanicaCardProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {data.tool && `Ferramenta: ${data.tool}`}
        {data.tool && (data.specMin || data.specMax) && " • "}
        {(data.specMin || data.specMax) &&
          `Especificado: ${data.specMin || "-"}–${data.specMax || "-"} ${data.unit}`}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {data.cylinders.map((cyl, index) => {
          const url = resolveMediaUrl(cyl.media_id, sectionMedias) ?? cyl.previewUrl;

          return (
            <div key={index} className="space-y-2 rounded-xl border p-3 text-center">
              {url ? (
                <img
                  src={url}
                  alt={`Cilindro ${cyl.number}`}
                  className="h-24 w-full rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-24 w-full items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                  Sem foto
                </div>
              )}

              <p className="text-xs font-medium text-muted-foreground">
                Cil. {cyl.number}
              </p>
              <p className="text-sm font-bold">
                {cyl.value || "-"} {data.unit}
              </p>

              {cyl.status && (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getItemStatusPillClass(
                    cyl.status || null
                  )}`}
                >
                  {itemStatusLabels[cyl.status]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
