import { AlertTriangle, Camera, FilePenLine, FlaskConical, Loader2, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoryTestBlock } from "@/components/story/StoryTestBlock";
import type { LightboxMedia } from "@/components/media/Lightbox";
import {
  formatDateTime,
  sectionLabels,
  type MediaItem,
  type SectionItem,
  type TestItem,
} from "./types";

type SectionCardProps = {
  section: SectionItem;
  publishing: boolean;
  onAddMedia: () => void;
  onAddTest: () => void;
  onAddFinding: () => void;
  onEditNotes: () => void;
  onEditTest: (test: TestItem) => void;
  onDeleteTest: (test: TestItem) => void;
  onPublish: () => void;
  onOpenMedia: (media: LightboxMedia) => void;
};

function MediaThumb({
  media,
  onOpen,
}: {
  media: MediaItem;
  onOpen: (m: LightboxMedia) => void;
}) {
  if (!media.url) return null;

  if (media.type === "photo") {
    return (
      <button
        type="button"
        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-xl border border-border"
        onClick={() =>
          onOpen({ url: media.url!, mime_type: media.mime_type, label: media.label })
        }
      >
        <img
          src={media.url}
          alt={media.label ?? "Mídia da etapa"}
          loading="lazy"
          className="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {media.label && (
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 text-left text-[11px] font-medium text-white/90">
            {media.label}
          </span>
        )}
      </button>
    );
  }

  if (media.type === "video") {
    return (
      <div className="overflow-hidden rounded-xl border border-border sm:col-span-2">
        <video controls playsInline preload="metadata" className="w-full">
          <source src={media.url} type={media.mime_type} />
        </video>
        {media.label && (
          <p className="bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
            {media.label}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/30 p-3 sm:col-span-2">
      <p className="text-xs font-medium text-muted-foreground">
        {media.label ?? "Áudio da etapa"}
      </p>
      <audio controls className="w-full">
        <source src={media.url} type={media.mime_type} />
      </audio>
    </div>
  );
}

/** Card de uma etapa da OS: conteúdo em cima, ações embaixo. */
export function SectionCard({
  section,
  publishing,
  onAddMedia,
  onAddTest,
  onAddFinding,
  onEditNotes,
  onEditTest,
  onDeleteTest,
  onPublish,
  onOpenMedia,
}: SectionCardProps) {
  const published = section.status === "published";

  return (
    <div
      id={`section-${section.section_id}`}
      className="scroll-mt-24 rounded-3xl border border-border bg-card p-5 sm:p-6"
    >
      {/* cabeçalho */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {sectionLabels[section.type] ?? section.type}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Criada em {formatDateTime(section.created_at)}
            {published && ` · Publicada em ${formatDateTime(section.published_at)}`}
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
            published
              ? "border-brand/30 bg-brand/10 text-brand"
              : "border-amber-400/30 bg-amber-400/10 text-amber-300"
          }`}
        >
          {published ? "Visível pro cliente" : "Rascunho"}
        </span>
      </div>

      {/* explicação */}
      <button
        type="button"
        onClick={onEditNotes}
        className="mb-4 w-full rounded-2xl bg-muted/40 p-4 text-left transition-colors hover:bg-muted/60"
        title="Toque para editar o texto"
      >
        {section.notes ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {section.notes}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground/60">
            Sem explicação ainda — toque aqui pra escrever o que foi feito.
          </p>
        )}
      </button>

      {/* testes */}
      {section.tests.length > 0 && (
        <div className="mb-4 space-y-3">
          {section.tests.map((test) => (
            <div key={test.test_id}>
              <StoryTestBlock
                test={test}
                sectionMedias={section.medias}
                onOpenMedia={onOpenMedia}
              />
              <div className="mt-1.5 flex justify-end gap-2">
                {/* Leitura OBD é dado de máquina — não tem formulário de edição */}
                {test.test_type !== "obd_snapshot" && (
                  <Button variant="ghost" size="sm" onClick={() => onEditTest(test)}>
                    <FilePenLine className="mr-1.5 h-3.5 w-3.5" />
                    Editar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => onDeleteTest(test)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* mídias */}
      {section.medias.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          {section.medias.map((media) => (
            <MediaThumb key={media.media_id} media={media} onOpen={onOpenMedia} />
          ))}
        </div>
      )}

      {/* ações */}
      <div className="grid grid-cols-3 gap-2 border-t border-border pt-4 sm:flex sm:flex-wrap">
        <Button variant="outline" className="h-11" onClick={onAddMedia}>
          <Camera className="mr-1.5 h-4 w-4" />
          Mídia
        </Button>
        <Button variant="outline" className="h-11" onClick={onAddTest}>
          <FlaskConical className="mr-1.5 h-4 w-4" />
          Teste
        </Button>
        <Button variant="outline" className="h-11" onClick={onAddFinding}>
          <AlertTriangle className="mr-1.5 h-4 w-4" />
          Achado
        </Button>
        <Button
          className="col-span-3 h-11 bg-brand text-brand-foreground hover:bg-brand/90 disabled:opacity-60 sm:ml-auto sm:col-span-1"
          onClick={onPublish}
          disabled={publishing || published}
        >
          {publishing ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-1.5 h-4 w-4" />
          )}
          {published ? "Etapa publicada" : publishing ? "Publicando..." : "Publicar pro cliente"}
        </Button>
      </div>
    </div>
  );
}
