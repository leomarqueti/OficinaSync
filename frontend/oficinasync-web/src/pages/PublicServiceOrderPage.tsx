import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BateriaCard } from "@/components/tests/BateriaCard";
import { LeituraDtcCard } from "@/components/tests/LeituraDtcCard";
import { CompressaoMecanicaCard } from "@/components/tests/CompressaoMecanicaCard";
import { InjetoresBancoCard } from "@/components/tests/InjetoresBancoCard";
import type {
  BateriaData,
  CompressaoMecanicaData,
  InjetoresBancoData,
  LeituraDtcData,
  TestTypeCategory,
} from "@/components/tests/testTypes";
import { API_URL } from "@/lib/api";

type MediaItem = {
  media_id: number;
  type: "photo" | "video" | "audio" | string;
  object_name: string;
  label: string | null;
  mime_type: string;
  url?: string;
};

type TestMeasurement = {
  label: string;
  expected?: string;
  actual: string;
};

type TestItem = {
  title: string;
  measurements: TestMeasurement[] | null;
  test_type: TestTypeCategory | null;
  data: Record<string, unknown> | null;
  verdict: "approved" | "failed" | "inconclusive" | null;
  notes: string | null;
};

type SectionItem = {
  type: string;
  notes: string | null;
  published_at: string | null;
  medias: MediaItem[];
  tests: TestItem[];
};

type PublicServiceOrder = {
  status: string;
  client_complaint: string;
  created_at: string;
  tenant: {
    name: string;
  };
  car: {
    brand: string;
    model: string;
    year: number;
    plate: string;
    mileage_in: number;
    color: string;
    fuel_type: string;
  };
  client: {
    name: string;
    phone: string;
  };
  sections: SectionItem[];
};

const sectionLabels: Record<string, string> = {
  checkin: "Check-in",
  obd_scan: "Scanner / OBD",
  diagnosis: "Diagnóstico",
  repair: "Reparo",
  preventive: "Inspeção Geral",
  final: "Finalização",
};

const statusLabels: Record<string, string> = {
  open: "Em andamento",
  in_progress: "Em andamento",
  done: "Concluído",
  cancelled: "Cancelado",
};

const verdictLabels: Record<string, string> = {
  approved: "Aprovado",
  failed: "Reprovado",
  inconclusive: "Inconclusivo",
};

function getVerdictPillClass(verdict: string | null) {
  const map: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
    inconclusive: "bg-amber-100 text-amber-700",
  };

  return verdict ? map[verdict] ?? "bg-muted text-foreground" : "bg-muted text-foreground";
}

function TestCard({
  test,
  sectionMedias = [],
}: {
  test: TestItem;
  sectionMedias?: MediaItem[];
}) {
  return (
    <div className="space-y-3 rounded-2xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{test.title}</h4>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getVerdictPillClass(
            test.verdict
          )}`}
        >
          {test.verdict ? verdictLabels[test.verdict] : "Sem veredito"}
        </span>
      </div>

      {test.test_type === "bateria" && test.data && (
        <BateriaCard data={test.data as unknown as BateriaData} />
      )}

      {test.test_type === "leitura_dtc" && test.data && (
        <LeituraDtcCard data={test.data as unknown as LeituraDtcData} />
      )}

      {test.test_type === "compressao_mecanica" && test.data && (
        <CompressaoMecanicaCard
          data={test.data as unknown as CompressaoMecanicaData}
          sectionMedias={sectionMedias}
        />
      )}

      {test.test_type === "injetores_banco" && test.data && (
        <InjetoresBancoCard
          data={test.data as unknown as InjetoresBancoData}
          sectionMedias={sectionMedias}
        />
      )}

      {!test.test_type && test.measurements && test.measurements.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="pb-1 pr-2 font-medium">Item</th>
              <th className="pb-1 pr-2 font-medium">Esperado</th>
              <th className="pb-1 font-medium">Obtido</th>
            </tr>
          </thead>
          <tbody>
            {test.measurements.map((measurement, index) => (
              <tr key={index} className="border-t">
                <td className="py-1 pr-2">{measurement.label}</td>
                <td className="py-1 pr-2 text-muted-foreground">
                  {measurement.expected || "-"}
                </td>
                <td className="py-1">{measurement.actual}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {test.notes && (
        <p className="whitespace-pre-line text-sm text-muted-foreground">{test.notes}</p>
      )}
    </div>
  );
}

const visualOrder: Record<string, number> = {
  checkin: 1,
  obd_scan: 2,
  diagnosis: 3,
  repair: 4,
  preventive: 5,
  final: 6,
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function getSectionTitle(type: string) {
  return sectionLabels[type] ?? type;
}

function getStatusLabel(status: string) {
  return statusLabels[status] ?? status;
}

function getMediaUrl(media: MediaItem) {
  return media.url ?? "";
}

function MediaPreview({
  media,
  className = "",
}: {
  media: MediaItem;
  className?: string;
}) {
  const src = getMediaUrl(media);

  if (!media.url) {
    return (
      <div className={`rounded-xl border border-dashed p-4 text-sm text-muted-foreground ${className}`}>
        URL da mídia ainda não disponível.
      </div>
    );
  }

  if (media.mime_type.startsWith("image/")) {
    return (
      <img
        src={src}
        alt={media.label ?? "Imagem da OS"}
        className={`w-full rounded-xl object-cover ${className}`}
      />
    );
  }

  if (media.mime_type.startsWith("video/")) {
    return (
      <video controls className={`w-full rounded-xl ${className}`}>
        <source src={src} type={media.mime_type} />
        Seu navegador não suporta vídeo.
      </video>
    );
  }

  if (media.mime_type.startsWith("audio/")) {
    return (
      <audio controls className={`w-full ${className}`}>
        <source src={src} type={media.mime_type} />
        Seu navegador não suporta áudio.
      </audio>
    );
  }

  return (
    <div className={`rounded-xl border p-4 text-sm ${className}`}>
      Arquivo anexado: {media.label ?? media.object_name}
    </div>
  );
}

export function PublicServiceOrderPage() {
  const { token } = useParams();
  const [data, setData] = useState<PublicServiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    const fetchServiceOrder = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/service_orders/public/${token}`
        );

        const result = await response.json();

        if (!response.ok) {
          setError(result?.message ?? "Não foi possível carregar a ordem de serviço.");
          return;
        }

        setData(result);
      } catch {
        setError("Erro ao carregar a página do serviço.");
      } finally {
        setLoading(false);
      }
    };

    fetchServiceOrder();
  }, [token]);

  const orderedSections = useMemo(() => {
    if (!data?.sections) return [];
    return [...data.sections].sort((a, b) => {
      return (visualOrder[a.type] ?? 999) - (visualOrder[b.type] ?? 999);
    });
  }, [data]);

  const checkinSection = useMemo(() => {
    return orderedSections.find((section) => section.type === "checkin") ?? null;
  }, [orderedSections]);

  const otherSections = useMemo(() => {
    return orderedSections.filter((section) => section.type !== "checkin");
  }, [orderedSections]);

  const progressItems = useMemo(() => {
    return otherSections.map((section) => ({
      title: getSectionTitle(section.type),
      date: formatDate(section.published_at),
    }));
  }, [otherSections]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <Card className="rounded-3xl">
            <CardContent className="p-8">
              <p className="text-sm text-muted-foreground">Carregando serviço...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-neutral-100 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Card className="rounded-3xl border-red-200">
            <CardContent className="p-8">
              <h1 className="text-xl font-semibold">Não foi possível abrir esta página</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {error || "Serviço não encontrado."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <section className="bg-gradient-to-br from-black via-neutral-950 to-emerald-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-emerald-400">{data.tenant.name}</div>

                <span className="mt-3 inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
                  {getStatusLabel(data.status)}
                </span>
              </div>

              <div className="text-right text-sm text-white/70">
                <div>KM entrada</div>
                <div className="text-lg font-semibold text-white">
                  {data.car.mileage_in?.toLocaleString("pt-BR")}
                </div>
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Olá, {data.client.name}!
              </h1>
              <p className="mt-2 text-xl font-semibold">Seu carro está pronto.</p>
              <p className="mt-3 max-w-2xl text-sm text-white/70">
                Confira abaixo tudo o que foi feito no seu veículo, com fotos e
                explicações de cada etapa.
              </p>
            </div>

            <Card className="rounded-2xl border-white/10 bg-white/5 text-white shadow-none backdrop-blur">
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-lg font-semibold">
                    {data.car.brand} {data.car.model}
                  </p>
                  <p className="text-sm text-white/70">
                    {data.car.plate} • {data.car.year} • {data.car.color} •{" "}
                    {data.car.fuel_type}
                  </p>
                </div>

                <div className="text-sm text-white/70">
                  <div>Telefone do cliente</div>
                  <div className="font-medium text-white">{data.client.phone}</div>
                </div>
              </CardContent>
            </Card>

            {progressItems.length > 0 && (
              <Card className="rounded-2xl border-white/10 bg-white/5 text-white shadow-none backdrop-blur">
                <CardContent className="p-5">
                  <div className="grid gap-4 md:grid-cols-4">
                    {progressItems.map((item, index) => (
                      <div key={`${item.title}-${index}`} className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-300">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-white/60">{item.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="grid gap-6">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg">O que você relatou</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="italic text-muted-foreground">
                "{data.client_complaint}"
              </p>
            </CardContent>
          </Card>

          {checkinSection && (
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-xl">Como o veículo chegou</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Registro visual feito na entrada do carro na oficina.
                </p>
              </CardHeader>

              <CardContent className="space-y-5">
                {checkinSection.notes && (
                  <div className="rounded-2xl bg-muted/50 p-4">
                    <p className="text-sm leading-6 text-muted-foreground">
                      {checkinSection.notes}
                    </p>
                  </div>
                )}

                {checkinSection.tests?.length > 0 && (
                  <div className="space-y-4">
                    {checkinSection.tests.map((test, index) => (
                      <TestCard
                        key={`${test.title}-${index}`}
                        test={test}
                        sectionMedias={checkinSection.medias}
                      />
                    ))}
                  </div>
                )}

                {checkinSection.medias?.length > 0 && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {checkinSection.medias.map((media, index) => (
                      <div
                        key={`${media.object_name}-${index}`}
                        className="space-y-3 rounded-2xl border p-4"
                      >
                        <MediaPreview media={media} className="h-64" />
                        <div>
                          <p className="text-sm font-medium">
                            {media.label ?? "Imagem da entrada"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {media.mime_type}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div>
            <h2 className="mb-4 text-2xl font-bold tracking-tight">
              O que foi feito no seu veículo
            </h2>

            <div className="space-y-5">
              {otherSections.map((section, index) => (
                <Card key={`${section.type}-${index}`} className="rounded-3xl">
                  <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        {getSectionTitle(section.type)}
                      </CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Publicado em {formatDate(section.published_at)}
                      </p>
                    </div>

                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                      Publicado
                    </span>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {section.notes && (
                      <div className="rounded-2xl bg-muted/50 p-4">
                        <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                          {section.notes}
                        </p>
                      </div>
                    )}

                    {section.tests?.length > 0 && (
                      <div className="space-y-4">
                        <Separator />
                        <div>
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Testes realizados
                          </h3>

                          <div className="mt-4 space-y-4">
                            {section.tests.map((test, testIndex) => (
                              <TestCard
                                key={`${test.title}-${testIndex}`}
                                test={test}
                                sectionMedias={section.medias}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {section.medias?.length > 0 && (
                      <div className="space-y-4">
                        <Separator />
                        <div>
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Mídias desta etapa
                          </h3>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            {section.medias.map((media, mediaIndex) => (
                              <div
                                key={`${media.object_name}-${mediaIndex}`}
                                className="space-y-3 rounded-2xl border p-4"
                              >
                                <MediaPreview media={media} className="h-56" />
                                <div>
                                  <p className="text-sm font-medium">
                                    {media.label ?? "Mídia anexada"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {media.type} • {media.mime_type}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}