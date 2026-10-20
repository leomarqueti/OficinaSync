import { Camera, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import frente from "@/assets/illustrations/carro-frente.svg";
import esquerdo from "@/assets/illustrations/carro-lado-esquerdo.svg";
import direito from "@/assets/illustrations/carro-lado-direito.svg";
import traseira from "@/assets/illustrations/carro-traseira.svg";
import { PhotoFlash } from "@/components/motion/PhotoFlash";
import { haptic } from "@/lib/haptics";
import { PHOTO_LABELS, PHOTO_SIDES, type PhotoSide } from "@/lib/guidedOpen";
import { compressImage } from "@/lib/imageCompression";
import { cn } from "@/lib/utils";
import type { FileStepProps } from "./types";

const ART: Record<PhotoSide, string> = { front: frente, rear: traseira, left: esquerdo, right: direito };
const CARD_LABEL: Record<PhotoSide, string> = { front: "Frente", rear: "Traseira", left: "Lado esquerdo", right: "Lado direito" };

function usePreview(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  return url;
}

function SideCard({ side, file, current, onPick }: { side: PhotoSide; file: File | null; current: boolean; onPick: () => void }) {
  const preview = usePreview(file);
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={file ? `Refazer foto ${PHOTO_LABELS[side]}` : `Foto ${PHOTO_LABELS[side]}`}
      className={cn(
        "relative flex aspect-[4/3] flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 bg-white/[0.04] transition-opacity",
        current ? "border-brand bg-brand/10" : file ? "border-white/15" : "border-white/10 opacity-50",
      )}
    >
      {preview ? (
        <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <img src={ART[side]} alt="" className="h-2/3 w-auto" />
      )}
      <span className={cn("relative z-10 rounded-md px-2 text-sm font-semibold", preview ? "bg-black/60" : current ? "text-brand" : "text-white/70")}>
        {CARD_LABEL[side]}
      </span>
    </button>
  );
}

/** Tela 9: as 4 fotos guiadas (frente → traseira → lado esquerdo → lado direito) e depois "mais fotos?". */
export function PhotosStep({ state, onChange, files, onFiles }: FileStepProps) {
  const [flashKey, setFlashKey] = useState(0);
  const [target, setTarget] = useState<PhotoSide | "extra" | null>(null);
  const current = PHOTO_SIDES.find((side) => !state.photos[side]) ?? null;
  const shooting = target ?? current;

  const capture = async (file: File | null) => {
    if (!file || !shooting) return;
    const compressed = await compressImage(file);
    haptic();
    setFlashKey((k) => k + 1);
    if (shooting === "extra") {
      onFiles({ extraPhotos: [...files.extraPhotos, compressed] });
      onChange({ extraPhotos: files.extraPhotos.length + 1 });
    } else {
      onFiles({ photos: { ...files.photos, [shooting]: compressed } });
      onChange({ photos: { ...state.photos, [shooting]: true } });
    }
    setTarget(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative grid grid-cols-2 gap-2">
        {PHOTO_SIDES.map((side) => (
          <SideCard key={side} side={side} file={files.photos[side]} current={side === current} onPick={() => setTarget(side)} />
        ))}
        <PhotoFlash flashKey={flashKey} />
      </div>

      {shooting && shooting !== "extra" && (
        <label
          data-current={shooting}
          className="flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-brand font-display text-xl font-extrabold uppercase text-brand-foreground"
        >
          <Camera className="h-6 w-6" aria-hidden="true" />
          Tirar foto {PHOTO_LABELS[shooting]}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => capture(e.target.files?.[0] ?? null)} />
        </label>
      )}

      {!current && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-lg font-semibold">Quer tirar mais fotos?</p>
          <p className="text-sm text-white/70">Riscos, amassados, algo que o cliente precisa ver.</p>
          {files.extraPhotos.length > 0 && <p className="mt-1 text-sm text-brand">{files.extraPhotos.length} foto(s) a mais.</p>}
          <label className="mt-3 flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-white/20 font-display text-lg font-extrabold uppercase">
            <Plus className="h-5 w-5" aria-hidden="true" /> Tirar mais uma
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onClick={() => setTarget("extra")}
              onChange={(e) => capture(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
