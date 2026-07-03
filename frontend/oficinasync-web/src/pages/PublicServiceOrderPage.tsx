import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, useReducedMotion, useScroll } from "motion/react";
import {
  Camera,
  ChevronDown,
  FlaskConical,
  Gauge,
  Mic,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/motion/Reveal";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { CountUp } from "@/components/motion/CountUp";
import { Lightbox, type LightboxMedia } from "@/components/media/Lightbox";
import { StoryTestBlock, type StoryTest } from "@/components/story/StoryTestBlock";

/* ------------------------------------------------------------------ */
/* Tipos (formato exato do GET /service_orders/public/:token)          */
/* ------------------------------------------------------------------ */

type MediaItem = {
  media_id: number;
  type: "photo" | "video" | "audio" | string;
  object_name: string;
  label: string | null;
  mime_type: string;
  url?: string;
};

type SectionItem = {
  type: string;
  notes: string | null;
  published_at: string | null;
  medias: MediaItem[];
  tests: StoryTest[];
};

type PublicServiceOrder = {
  status: string;
  client_complaint: string | null;
  created_at: string;
  finished_at: string | null;
  root_cause: string | null;
  conclusion: string | null;
  final_verdict: "resolved" | "not_resolved" | "partial" | null;
  tenant: { name: string };
  car: {
    brand: string;
    model: string;
    year: number;
    plate: string;
    mileage_in: number;
    color: string;
    fuel_type: string;
  };
  client: { name: string; phone: string };
  sections: SectionItem[];
};

/* ------------------------------------------------------------------ */
/* Narrativa: nomes e ordem dos capítulos                              */
/* ------------------------------------------------------------------ */

const visualOrder: Record<string, number> = {
  checkin: 1,
  obd_scan: 2,
  diagnosis: 3,
  repair: 4,
  preventive: 5,
  final: 6,
};

const chapterTitles: Record<string, { title: string; technical: string }> = {
  obd_scan: { title: "Leitura eletrônica", technical: "Scanner / OBD" },
  diagnosis: { title: "A investigação", technical: "Diagnóstico" },
  repair: { title: "O reparo", technical: "Execução do serviço" },
  preventive: { title: "Olhamos além do problema", technical: "Inspeção geral" },
  final: { title: "Pronto para voltar pra estrada", technical: "Entrega final" },
};

const PROMO_LABEL = "Vídeo de divulgação";

function firstName(fullName: string) {
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/* Pedaços visuais                                                     */
/* ------------------------------------------------------------------ */

function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      className="fixed left-0 right-0 top-0 z-50 h-1 origin-left bg-brand"
      style={{ scaleX: scrollYProgress }}
    />
  );
}

function ChapterHeader({
  number,
  title,
  technical,
  date,
}: {
  number: string;
  title: string;
  technical?: string;
  date?: string | null;
}) {
  return (
    <Reveal>
      <div className="mb-8">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-sm font-bold text-brand">{number}</span>
          <div className="h-px flex-1 bg-white/10" />
          {date && <span className="text-xs text-white/35">{date}</span>}
        </div>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {title}
        </h2>
        {technical && (
          <p className="mt-1 text-xs font-medium uppercase tracking-widest text-white/35">
            {technical}
          </p>
        )}
      </div>
    </Reveal>
  );
}

function PhotoTile({
  media,
  onOpen,
}: {
  media: MediaItem;
  onOpen: (m: LightboxMedia) => void;
}) {
  // Foto que falhou ao carregar (URL expirada/arquivo ausente) some da
  // história em vez de exibir o ícone quebrado do navegador.
  const [failed, setFailed] = useState(false);

  if (!media.url || failed) return null;

  return (
    <StaggerItem>
      <button
        type="button"
        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-2xl border border-white/10"
        onClick={() =>
          onOpen({ url: media.url!, mime_type: media.mime_type, label: media.label })
        }
      >
        <img
          src={media.url}
          alt={media.label ?? "Registro do serviço"}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-64"
        />
        {media.label && (
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8 text-left text-xs font-medium text-white/90">
            {media.label}
          </span>
        )}
      </button>
    </StaggerItem>
  );
}

function VideoBlock({ media }: { media: MediaItem }) {
  if (!media.url) return null;

  return (
    <Reveal>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <video controls playsInline preload="metadata" className="w-full">
          <source src={media.url} type={media.mime_type} />
        </video>
        {media.label && (
          <p className="bg-white/[0.03] px-4 py-2.5 text-xs text-white/60">{media.label}</p>
        )}
      </div>
    </Reveal>
  );
}

function AudioBlock({ media }: { media: MediaItem }) {
  if (!media.url) return null;

  return (
    <Reveal>
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center">
        <span className="flex items-center gap-2 text-sm font-medium text-white/80">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Mic className="h-4 w-4" />
          </span>
          {media.label ?? "Explicação do mecânico"}
        </span>
        <audio controls className="w-full sm:flex-1">
          <source src={media.url} type={media.mime_type} />
        </audio>
      </div>
    </Reveal>
  );
}

function MediaGallery({
  medias,
  onOpen,
}: {
  medias: MediaItem[];
  onOpen: (m: LightboxMedia) => void;
}) {
  const photos = medias.filter((m) => m.type === "photo" && m.url);
  const videos = medias.filter((m) => m.type === "video" && m.url);
  const audios = medias.filter((m) => m.type === "audio" && m.url);

  if (photos.length + videos.length + audios.length === 0) return null;

  return (
    <div className="space-y-4">
      {photos.length > 0 && (
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {photos.map((media) => (
            <PhotoTile key={media.media_id} media={media} onOpen={onOpen} />
          ))}
        </Stagger>
      )}
      {videos.map((media) => (
        <VideoBlock key={media.media_id} media={media} />
      ))}
      {audios.map((media) => (
        <AudioBlock key={media.media_id} media={media} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export function PublicServiceOrderPage() {
  const { token } = useParams();
  const reduced = useReducedMotion();

  const [data, setData] = useState<PublicServiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightboxMedia, setLightboxMedia] = useState<LightboxMedia | null>(null);

  useEffect(() => {
    if (!token) return;

    apiFetch<PublicServiceOrder>(`/service_orders/public/${token}`, { silent: true })
      .then(setData)
      .catch((err: Error) =>
        setError(
          err.message === "Ordem de serviço não encontrada!"
            ? "Não encontramos este serviço. Confira o link com a oficina."
            : "Não foi possível carregar a página agora. Tente de novo em instantes.",
        ),
      )
      .finally(() => setLoading(false));
  }, [token]);

  const orderedSections = useMemo(() => {
    if (!data?.sections) return [];
    return [...data.sections].sort(
      (a, b) => (visualOrder[a.type] ?? 99) - (visualOrder[b.type] ?? 99),
    );
  }, [data]);

  const checkinSection = orderedSections.find((s) => s.type === "checkin") ?? null;
  const workSections = orderedSections.filter((s) => s.type !== "checkin");

  const promoVideo = useMemo(() => {
    for (const section of orderedSections) {
      const found = section.medias.find(
        (m) => m.type === "video" && m.label === PROMO_LABEL && m.url,
      );
      if (found) return found;
    }
    return null;
  }, [orderedSections]);

  const stats = useMemo(() => {
    let photos = 0;
    let videos = 0;
    let tests = 0;

    for (const section of orderedSections) {
      photos += section.medias.filter((m) => m.type === "photo").length;
      videos += section.medias.filter((m) => m.type === "video").length;
      tests += section.tests.length;
    }

    return { photos, videos, tests, steps: orderedSections.length };
  }, [orderedSections]);

  /* ----- estados de carregamento/erro (dark) ----- */

  if (loading) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-brand" />
          <p className="text-sm text-white/40">Preparando a história do seu veículo...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <h1 className="text-xl font-semibold text-white">Página indisponível</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/50">
            {error || "Serviço não encontrado."}
          </p>
        </div>
      </div>
    );
  }

  const isDone = data.status === "done";
  const heroEase = [0.21, 0.47, 0.32, 0.98] as const;
  let chapterCount = 0;

  const heroItem = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay, ease: heroEase },
        };

  return (
    <div className="dark min-h-screen bg-background text-foreground antialiased">
      <ScrollProgressBar />

      {/* ============ ABERTURA ============ */}
      <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-6 py-16">
        {/* brilho de fundo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-brand/[0.07] blur-3xl"
        />

        <div className="mx-auto w-full max-w-3xl">
          <motion.p
            {...heroItem(0)}
            className="text-xs font-bold uppercase tracking-[0.3em] text-brand"
          >
            {data.tenant.name}
          </motion.p>

          <motion.p {...heroItem(0.15)} className="mt-8 text-lg text-white/50">
            Olá, {firstName(data.client.name)}.
          </motion.p>

          <motion.h1
            {...heroItem(0.3)}
            className="mt-3 text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-7xl"
          >
            {isDone ? (
              <>
                Seu {data.car.model} está{" "}
                <span className="text-brand">pronto.</span>
              </>
            ) : (
              <>
                Seu {data.car.model} está em{" "}
                <span className="text-brand">boas mãos.</span>
              </>
            )}
          </motion.h1>

          <motion.p
            {...heroItem(0.45)}
            className="mt-6 max-w-xl text-base leading-relaxed text-white/50 sm:text-lg"
          >
            {isDone
              ? "Esta é a história completa do que fizemos — foto por foto, teste por teste. Transparência total."
              : "Acompanhe aqui cada etapa do serviço, conforme ela acontece — com fotos, vídeos e testes documentados."}
          </motion.p>

          <motion.div
            {...heroItem(0.6)}
            className="mt-10 flex flex-wrap items-center gap-3 text-sm"
          >
            <span className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 font-mono font-bold tracking-widest text-white">
              {data.car.plate}
            </span>
            <span className="text-white/40">
              {data.car.brand} · {data.car.year} · {data.car.color}
            </span>
            <span className="flex items-center gap-1.5 text-white/40">
              <Gauge className="h-4 w-4" />
              {data.car.mileage_in?.toLocaleString("pt-BR")} km
            </span>
          </motion.div>
        </div>

        {/* dica de scroll */}
        <motion.div
          {...heroItem(0.9)}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={reduced ? {} : { y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-1 text-white/30"
          >
            <span className="text-[11px] uppercase tracking-widest">A história</span>
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        </motion.div>
      </section>

      <main className="mx-auto max-w-3xl space-y-24 px-6 pb-24 sm:space-y-32">
        {/* ============ O RELATO ============ */}
        {data.client_complaint && (
          <section>
            <ChapterHeader
              number={`0${++chapterCount}`}
              title="O que você nos contou"
              technical="Relato do cliente"
              date={formatDate(data.created_at)}
            />
            <Reveal delay={0.1}>
              <blockquote className="relative rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
                <span
                  aria-hidden
                  className="absolute -top-5 left-6 font-serif text-7xl leading-none text-brand/30"
                >
                  “
                </span>
                <p className="text-lg italic leading-relaxed text-white/80 sm:text-xl">
                  {data.client_complaint}
                </p>
              </blockquote>
            </Reveal>
          </section>
        )}

        {/* ============ CHECK-IN ============ */}
        {checkinSection && (
          <section>
            <ChapterHeader
              number={`0${++chapterCount}`}
              title="Como recebemos seu veículo"
              technical="Registro fotográfico de entrada"
              date={formatDate(checkinSection.published_at)}
            />
            {checkinSection.notes && (
              <Reveal>
                <p className="mb-6 leading-relaxed text-white/60">{checkinSection.notes}</p>
              </Reveal>
            )}
            <MediaGallery medias={checkinSection.medias} onOpen={setLightboxMedia} />
            {checkinSection.tests.map((test, i) => (
              <div key={i} className="mt-4">
                <StoryTestBlock
                  test={test}
                  sectionMedias={checkinSection.medias}
                  onOpenMedia={setLightboxMedia}
                />
              </div>
            ))}
          </section>
        )}

        {/* ============ CAPÍTULOS DO SERVIÇO ============ */}
        {workSections.map((section) => {
          const chapter = chapterTitles[section.type] ?? {
            title: section.type,
            technical: "",
          };
          const gridMedias = section.medias.filter((m) => m.label !== PROMO_LABEL);

          return (
            <section key={section.type}>
              <ChapterHeader
                number={`0${++chapterCount}`}
                title={chapter.title}
                technical={chapter.technical}
                date={formatDate(section.published_at)}
              />

              {section.notes && (
                <Reveal>
                  <p className="mb-6 whitespace-pre-line text-base leading-relaxed text-white/60">
                    {section.notes}
                  </p>
                </Reveal>
              )}

              {section.tests.length > 0 && (
                <div className="mb-6 space-y-4">
                  {section.tests.map((test, i) => (
                    <StoryTestBlock
                      key={i}
                      test={test}
                      sectionMedias={section.medias}
                      onOpenMedia={setLightboxMedia}
                    />
                  ))}
                </div>
              )}

              <MediaGallery medias={gridMedias} onOpen={setLightboxMedia} />
            </section>
          );
        })}

        {/* ============ VEREDITO ============ */}
        {(data.root_cause || data.conclusion || data.final_verdict) && (
          <section>
            <ChapterHeader
              number={`0${++chapterCount}`}
              title="O diagnóstico final"
              technical="Conclusão técnica"
              date={formatDate(data.finished_at)}
            />

            <div className="space-y-5">
              {data.root_cause && (
                <Reveal>
                  <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-brand">
                      Causa raiz identificada
                    </p>
                    <p className="mt-3 leading-relaxed text-white/80">{data.root_cause}</p>
                  </div>
                </Reveal>
              )}

              {data.conclusion && (
                <Reveal delay={0.1}>
                  <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">
                      Conclusão
                    </p>
                    <p className="mt-3 leading-relaxed text-white/80">{data.conclusion}</p>
                  </div>
                </Reveal>
              )}

              {data.final_verdict && (
                <motion.div
                  initial={reduced ? {} : { scale: 0.7, opacity: 0 }}
                  whileInView={reduced ? {} : { scale: 1, opacity: 1 }}
                  viewport={{ once: true, margin: "-15% 0px" }}
                  transition={{ type: "spring", stiffness: 180, damping: 16 }}
                  className="flex justify-center pt-4"
                >
                  {data.final_verdict === "resolved" && (
                    <span className="flex items-center gap-3 rounded-full bg-brand px-8 py-4 text-lg font-black tracking-tight text-brand-foreground">
                      <ShieldCheck className="h-6 w-6" />
                      FALHA SANADA
                    </span>
                  )}
                  {data.final_verdict === "partial" && (
                    <span className="flex items-center gap-3 rounded-full bg-amber-400 px-8 py-4 text-lg font-black tracking-tight text-black">
                      <ShieldCheck className="h-6 w-6" />
                      RESOLUÇÃO PARCIAL
                    </span>
                  )}
                  {data.final_verdict === "not_resolved" && (
                    <span className="flex items-center gap-3 rounded-full bg-red-500 px-8 py-4 text-lg font-black tracking-tight text-white">
                      <ShieldCheck className="h-6 w-6" />
                      REQUER NOVA AVALIAÇÃO
                    </span>
                  )}
                </motion.div>
              )}
            </div>
          </section>
        )}

        {/* ============ FILME DO SERVIÇO ============ */}
        {promoVideo && (
          <section>
            <ChapterHeader
              number={`0${++chapterCount}`}
              title="O filme do seu serviço"
              technical="Resumo em vídeo"
            />
            <Reveal>
              <div className="overflow-hidden rounded-3xl border border-brand/20">
                <video controls playsInline preload="metadata" className="w-full">
                  <source src={promoVideo.url} type={promoVideo.mime_type} />
                </video>
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs text-white/40">
                <PlayCircle className="h-4 w-4" />
                Todas as etapas do serviço, montadas em um só vídeo.
              </p>
            </Reveal>
          </section>
        )}

        {/* ============ FECHAMENTO / CONFIANÇA ============ */}
        <section className="border-t border-white/10 pt-16">
          <Stagger className="grid grid-cols-3 gap-4 text-center">
            <StaggerItem>
              <p className="text-3xl font-bold text-white sm:text-4xl">
                <CountUp value={stats.photos + stats.videos} decimals={0} />
              </p>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-wider text-white/40">
                <Camera className="h-3.5 w-3.5" />
                Registros
              </p>
            </StaggerItem>
            <StaggerItem>
              <p className="text-3xl font-bold text-white sm:text-4xl">
                <CountUp value={stats.tests} decimals={0} />
              </p>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-wider text-white/40">
                <FlaskConical className="h-3.5 w-3.5" />
                Testes técnicos
              </p>
            </StaggerItem>
            <StaggerItem>
              <p className="text-3xl font-bold text-white sm:text-4xl">
                <CountUp value={stats.steps} decimals={0} />
              </p>
              <p className="mt-1 flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-wider text-white/40">
                <ShieldCheck className="h-3.5 w-3.5" />
                Etapas documentadas
              </p>
            </StaggerItem>
          </Stagger>

          <Reveal delay={0.2}>
            <div className="mt-14 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand">
                {data.tenant.name}
              </p>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/45">
                Cada foto, teste e medição desta página foi registrado durante o
                serviço no seu veículo. Transparência não é promessa — é o nosso
                jeito de trabalhar.
              </p>
              <p className="mt-10 text-[11px] text-white/20">
                Documentado com OficinaSync
              </p>
            </div>
          </Reveal>
        </section>
      </main>

      <Lightbox media={lightboxMedia} onClose={() => setLightboxMedia(null)} />
    </div>
  );
}
