import { FlaskConical } from "lucide-react";
import type {
  AchadoAdicionalData,
  AntesDepoisData,
  BateriaData,
  CompressaoMecanicaData,
  InjetoresBancoData,
  LeituraDtcData,
  ObdSnapshotData,
  TestTypeCategory,
} from "@/components/tests/testTypes";
import type { LightboxMedia } from "@/components/media/Lightbox";
import { Reveal } from "@/components/motion/Reveal";
import { StoryAchado } from "./StoryAchado";
import { StoryAntesDepois } from "./StoryAntesDepois";
import { StoryBateria } from "./StoryBateria";
import { StoryCompressao } from "./StoryCompressao";
import { StoryDtc } from "./StoryDtc";
import { StoryInjetores } from "./StoryInjetores";
import { StoryObdSnapshot } from "./StoryObdSnapshot";
import { VerdictChip } from "./chips";

export type StoryTest = {
  title: string;
  measurements: { label: string; expected?: string; actual: string }[] | null;
  test_type: TestTypeCategory | null;
  data: Record<string, unknown> | null;
  verdict: "approved" | "failed" | "inconclusive" | null;
  notes: string | null;
};

type StoryTestBlockProps = {
  test: StoryTest;
  sectionMedias: { media_id: number; url?: string }[];
  onOpenMedia: (media: LightboxMedia) => void;
};

function GenericMeasurements({
  measurements,
}: {
  measurements: NonNullable<StoryTest["measurements"]>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white/[0.04] text-left text-[11px] uppercase tracking-wider text-white/40">
            <th className="px-4 py-2.5 font-semibold">Item verificado</th>
            <th className="px-4 py-2.5 font-semibold">Esperado</th>
            <th className="px-4 py-2.5 font-semibold">Medido</th>
          </tr>
        </thead>
        <tbody>
          {measurements.map((m, index) => (
            <tr key={index} className="border-t border-white/5">
              <td className="px-4 py-2.5 text-white/85">{m.label}</td>
              <td className="px-4 py-2.5 text-white/45">{m.expected || "—"}</td>
              <td className="px-4 py-2.5 font-semibold text-white">{m.actual}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Um teste do laudo contado como evidência da história: título, veredito,
 * o corpo especializado por tipo e a observação do mecânico.
 */
export function StoryTestBlock({ test, sectionMedias, onOpenMedia }: StoryTestBlockProps) {
  return (
    <Reveal>
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h4 className="flex items-center gap-2.5 text-base font-semibold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand">
              <FlaskConical className="h-4 w-4" />
            </span>
            {test.title}
          </h4>
          <VerdictChip verdict={test.verdict} />
        </div>

        {test.test_type === "bateria" && test.data && (
          <StoryBateria data={test.data as unknown as BateriaData} />
        )}

        {test.test_type === "leitura_dtc" && test.data && (
          <StoryDtc data={test.data as unknown as LeituraDtcData} />
        )}

        {test.test_type === "compressao_mecanica" && test.data && (
          <StoryCompressao
            data={test.data as unknown as CompressaoMecanicaData}
            sectionMedias={sectionMedias}
            onOpenMedia={onOpenMedia}
          />
        )}

        {test.test_type === "injetores_banco" && test.data && (
          <StoryInjetores
            data={test.data as unknown as InjetoresBancoData}
            sectionMedias={sectionMedias}
            onOpenMedia={onOpenMedia}
          />
        )}

        {test.test_type === "antes_depois" && test.data && (
          <StoryAntesDepois
            data={test.data as unknown as AntesDepoisData}
            sectionMedias={sectionMedias}
            onOpenMedia={onOpenMedia}
          />
        )}

        {test.test_type === "achado_adicional" && test.data && (
          <StoryAchado
            data={test.data as unknown as AchadoAdicionalData}
            sectionMedias={sectionMedias}
            onOpenMedia={onOpenMedia}
          />
        )}

        {test.test_type === "obd_snapshot" && test.data && (
          <StoryObdSnapshot data={test.data as unknown as ObdSnapshotData} />
        )}

        {!test.test_type && test.measurements && test.measurements.length > 0 && (
          <GenericMeasurements measurements={test.measurements} />
        )}

        {test.notes && (
          <p className="mt-4 whitespace-pre-line border-l-2 border-brand/40 pl-4 text-sm leading-relaxed text-white/60">
            {test.notes}
          </p>
        )}
      </div>
    </Reveal>
  );
}
