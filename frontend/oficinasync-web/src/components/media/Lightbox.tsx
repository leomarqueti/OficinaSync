import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

export type LightboxMedia = {
  url: string;
  mime_type: string;
  label?: string | null;
};

/**
 * Visualizador em tela cheia pra "ver a evidência de perto" —
 * clicar em qualquer foto/vídeo da história abre aqui.
 * Fecha com Esc, clique no fundo ou no X.
 */
export function Lightbox({
  media,
  onClose,
}: {
  media: LightboxMedia | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!media) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [media, onClose]);

  return (
    <AnimatePresence>
      {media && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <button
            type="button"
            aria-label="Fechar"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>

          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="max-h-[85vh] max-w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {media.mime_type.startsWith("video/") ? (
              <video
                src={media.url}
                controls
                autoPlay
                playsInline
                className="max-h-[85vh] max-w-full rounded-xl"
              />
            ) : (
              <img
                src={media.url}
                alt={media.label ?? "Mídia do serviço"}
                className="max-h-[85vh] max-w-full rounded-xl object-contain"
              />
            )}
          </motion.div>

          {media.label && (
            <p className="mt-4 max-w-xl text-center text-sm text-white/70">
              {media.label}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
