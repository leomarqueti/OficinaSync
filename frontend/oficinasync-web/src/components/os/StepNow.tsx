import { useState } from "react";
import { AlertTriangle, Camera, Check, ChevronDown, FileText, Flag, FlaskConical, Loader2, MessageCircle, Mic, Send } from "lucide-react";
import { ActionTile, BigButton } from "@/components/kit";
import type { LightboxMedia } from "@/components/media/Lightbox";
import { publishBlocker, sectionSummary, type StepView } from "@/lib/osFlow";
import { cn } from "@/lib/utils";
import { SectionCard } from "./SectionCard";
import { sectionLabels, type SectionItem, type TestItem } from "./types";

/** Barra com as 4 etapas: feita (cheia), da vez (meia), falta (apagada). */
export function StepProgress({ steps }: { steps: StepView[] }) {
  const done = steps.filter((s) => s.state === "done").length;
  return (
    <div aria-label={`Etapas: ${done} de ${steps.length} mostradas ao cliente`} role="img" className="flex gap-1.5">
      {steps.map((s) => (
        <div key={s.type} className="flex flex-1 flex-col gap-1">
          <div className={cn("h-2 rounded-full", s.state === "done" ? "bg-brand" : s.state === "current" ? "bg-brand/45" : "bg-white/10")} />
          <span className={cn("text-center text-[11px] font-semibold", s.state === "todo" ? "text-white/40" : "text-white/80")}>
            {sectionLabels[s.type]}
          </span>
        </div>
      ))}
    </div>
  );
}

type SectionHandlers = {
  onEditNotes: (section: SectionItem) => void;
  onEditTest: (section: SectionItem, test: TestItem) => void;
  onDeleteTest: (test: TestItem) => void;
  onOpenMedia: (media: LightboxMedia) => void;
};

/** Cartão da etapa da vez: 4 botões grandes + "Pronto, mostrar ao cliente". */
export function StepNowCard({
  step,
  position,
  total,
  busy,
  publishing,
  onSpeak,
  onMedia,
  onTest,
  onFinding,
  onPublish,
  handlers,
}: {
  step: StepView;
  position: number;
  total: number;
  /** criando a etapa / abrindo algo */
  busy: boolean;
  publishing: boolean;
  onSpeak: () => void;
  onMedia: () => void;
  onTest: () => void;
  onFinding: () => void;
  onPublish: () => void;
  handlers: SectionHandlers;
}) {
  const [expanded, setExpanded] = useState(false);
  const section = step.section;
  const blocker = publishBlocker(section);

  return (
    <section aria-label="Agora" className="rounded-3xl border-2 border-brand p-4">
      <p className="text-xs font-bold tracking-widest text-brand">
        AGORA · PASSO {position} DE {total}
      </p>
      <h2 className="mt-1 text-3xl">{sectionLabels[step.type]}</h2>

      <div className={cn("mt-4 grid grid-cols-2 gap-2", busy && "pointer-events-none opacity-60")} aria-busy={busy}>
        <ActionTile icon={<Mic />} label="Falar" tone="brand" onClick={onSpeak} />
        <ActionTile icon={<Camera />} label="Foto ou vídeo" onClick={onMedia} />
        <ActionTile icon={<FlaskConical />} label="Teste" onClick={onTest} />
        <ActionTile icon={<AlertTriangle />} label="Achado" onClick={onFinding} />
      </div>

      {section?.notes?.trim() && (
        <p className="mt-4 whitespace-pre-line rounded-2xl bg-white/[0.05] p-3 text-base text-white/90">{section.notes}</p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-sm text-white/70">
          {section && sectionSummary(section) !== "Nada registrado ainda" && <Check className="mr-1 inline h-4 w-4 text-brand" aria-hidden="true" />}
          {sectionSummary(section)}
        </p>
        {section && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-brand"
          >
            {expanded ? "Fechar" : "Ver e editar tudo"}
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
          </button>
        )}
      </div>

      {expanded && section && (
        <div className="mt-3">
          <SectionCard
            section={section}
            publishing={false}
            showActions={false}
            onAddMedia={onMedia}
            onAddTest={onTest}
            onAddFinding={onFinding}
            onEditNotes={() => handlers.onEditNotes(section)}
            onEditTest={(test) => handlers.onEditTest(section, test)}
            onDeleteTest={handlers.onDeleteTest}
            onPublish={onPublish}
            onOpenMedia={handlers.onOpenMedia}
          />
        </div>
      )}

      <div className="mt-4">
        <BigButton onClick={onPublish} disabled={Boolean(blocker) || publishing} hint={blocker ?? undefined} icon={publishing ? <Loader2 className="animate-spin" /> : <Send />}>
          Pronto, mostrar ao cliente
        </BigButton>
      </div>
    </section>
  );
}

/** Fim do caminho: as 4 etapas já foram pro cliente → finalizar vira o principal. */
export function AllDoneCard({
  done,
  whatsappUrl,
  downloadingReport,
  onFinish,
  onReport,
}: {
  done: boolean;
  whatsappUrl: string;
  downloadingReport: boolean;
  onFinish: () => void;
  onReport: () => void;
}) {
  return (
    <section aria-label="Agora" className="rounded-3xl border-2 border-brand p-5 text-center">
      <Flag className="mx-auto h-9 w-9 text-brand" aria-hidden="true" />
      <h2 className="mt-1 text-3xl">{done ? "OS concluída" : "Tudo pronto"}</h2>
      <p className="mt-1 text-sm text-white/70">O cliente já vê as 4 etapas no link.</p>
      <div className="mt-4 flex flex-col gap-2">
        {!done && (
          <BigButton size="hero" icon={<Flag />} onClick={onFinish}>
            Finalizar OS
          </BigButton>
        )}
        <div className="grid grid-cols-2 gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-white/15 text-sm font-bold"
          >
            <MessageCircle className="h-5 w-5 text-brand" aria-hidden="true" /> WhatsApp
          </a>
          <button
            type="button"
            onClick={onReport}
            disabled={downloadingReport}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-white/15 text-sm font-bold disabled:opacity-60"
          >
            {downloadingReport ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <FileText className="h-5 w-5 text-brand" aria-hidden="true" />}
            Laudo
          </button>
        </div>
      </div>
    </section>
  );
}

/** Linha de uma etapa (feita ou extra): ✓ + nome + resumo; toque abre tudo pra ver/editar/adicionar. */
export function StepRow({
  section,
  label,
  onAddMedia,
  onAddTest,
  onAddFinding,
  onPublish,
  publishing,
  handlers,
}: {
  section: SectionItem;
  label: string;
  onAddMedia: () => void;
  onAddTest: () => void;
  onAddFinding: () => void;
  onPublish: () => void;
  publishing: boolean;
  handlers: SectionHandlers;
}) {
  const [open, setOpen] = useState(false);
  const published = section.status === "published";
  return (
    <div className="rounded-2xl bg-white/[0.04]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center gap-3 px-4 text-left"
      >
        {published ? (
          <Check className="h-6 w-6 shrink-0 text-brand" aria-label="mostrada ao cliente" />
        ) : (
          <span className="h-3 w-3 shrink-0 rounded-full bg-warning" aria-label="ainda não mostrada ao cliente" />
        )}
        <span className="font-semibold">{label}</span>
        <span className="ml-auto truncate text-sm text-white/60">{sectionSummary(section)}</span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-white/60 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div className="px-2 pb-2">
          <SectionCard
            section={section}
            publishing={publishing}
            onAddMedia={onAddMedia}
            onAddTest={onAddTest}
            onAddFinding={onAddFinding}
            onEditNotes={() => handlers.onEditNotes(section)}
            onEditTest={(test) => handlers.onEditTest(section, test)}
            onDeleteTest={handlers.onDeleteTest}
            onPublish={onPublish}
            onOpenMedia={handlers.onOpenMedia}
          />
        </div>
      )}
    </div>
  );
}
