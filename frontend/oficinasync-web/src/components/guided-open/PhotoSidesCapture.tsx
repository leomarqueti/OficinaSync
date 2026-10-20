import { Camera, ImageIcon, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import frente from "@/assets/illustrations/carro-frente.svg";
import esquerdo from "@/assets/illustrations/carro-lado-esquerdo.svg";
import direito from "@/assets/illustrations/carro-lado-direito.svg";
import traseira from "@/assets/illustrations/carro-traseira.svg";
import { PhotoFlash } from "@/components/motion/PhotoFlash";
import { haptic } from "@/lib/haptics";
import { PHOTO_LABELS, PHOTO_SIDES, type PhotoSide } from "@/lib/guidedOpen";
import { compressImage } from "@/lib/imageCompression";
import { savePhoto } from "@/lib/photoStore";
import { cn } from "@/lib/utils";
import { canUseInAppCamera } from "@/lib/inAppCamera";
import { InAppCamera } from "./InAppCamera";

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

/**
 * As 4 fotos guiadas (frente → traseira → lado esquerdo → lado direito) + "mais fotos?".
 * Usado na abertura (fotos de entrada) e na finalização (fotos de saída).
 * A foto é tirada com a câmera DENTRO da página (InAppCamera): abrir o app de câmera do Android
 * fazia o sistema fechar o OficinaSync por falta de memória e a foto se perdia. Cada foto também
 * fica guardada no aparelho (photoStore, separada por `scope`) — se a página recarregar, voltam.
 */
export function PhotoSidesCapture({
  photos,
  done,
  extraPhotos,
  scope,
  onPhoto,
}: {
  photos: Record<PhotoSide, File | null>;
  done: Record<PhotoSide, boolean>;
  extraPhotos: File[];
  scope: string;
  onPhoto: (slot: PhotoSide | "extra", file: File) => void;
}) {
  const [flashKey, setFlashKey] = useState(0);
  const [target, setTarget] = useState<PhotoSide | "extra" | null>(null);
  const [cameraFor, setCameraFor] = useState<PhotoSide | "extra" | null>(null);
  const [cameraBlocked, setCameraBlocked] = useState(() => !canUseInAppCamera());
  const current = PHOTO_SIDES.find((side) => !done[side]) ?? null;
  const shooting = target ?? current;

  const capture = async (file: File | null, slot: PhotoSide | "extra" | null = shooting) => {
    if (!file || !slot) return;
    const compressed = await compressImage(file);
    haptic();
    setFlashKey((k) => k + 1);
    void savePhoto(slot === "extra" ? `extra-${extraPhotos.length}` : slot, compressed, scope);
    onPhoto(slot, compressed);
    setTarget(null);
  };

  const fromCamera = (file: File) => {
    const slot = cameraFor;
    setCameraFor(null);
    void capture(file, slot);
  };

  const shootButtonClass =
    "flex min-h-16 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-brand font-display text-xl font-extrabold uppercase text-brand-foreground";
  const moreButtonClass =
    "mt-3 flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-white/20 font-display text-lg font-extrabold uppercase";

  return (
    <div className="flex flex-col gap-4">
      <div className="relative grid grid-cols-2 gap-2">
        {PHOTO_SIDES.map((side) => (
          <SideCard key={side} side={side} file={photos[side]} current={side === current} onPick={() => setTarget(side)} />
        ))}
        <PhotoFlash flashKey={flashKey} />
      </div>

      {shooting && shooting !== "extra" && (
        <div className="flex flex-col gap-2" data-current={shooting}>
          {cameraBlocked ? (
            <label className={shootButtonClass}>
              <Camera className="h-6 w-6" aria-hidden="true" />
              Tirar foto {PHOTO_LABELS[shooting]}
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => capture(e.target.files?.[0] ?? null)} />
            </label>
          ) : (
            <button type="button" className={shootButtonClass} onClick={() => setCameraFor(shooting)}>
              <Camera className="h-6 w-6" aria-hidden="true" />
              Tirar foto {PHOTO_LABELS[shooting]}
            </button>
          )}
          <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 text-sm font-semibold text-white/70 underline-offset-4 hover:underline">
            <ImageIcon className="h-4 w-4" aria-hidden="true" /> Escolher da galeria
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => capture(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      )}

      {!current && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-lg font-semibold">Quer tirar mais fotos?</p>
          <p className="text-sm text-white/70">Riscos, amassados, algo que o cliente precisa ver.</p>
          {extraPhotos.length > 0 && <p className="mt-1 text-sm text-brand">{extraPhotos.length} foto(s) a mais.</p>}
          {cameraBlocked ? (
            <label className={moreButtonClass}>
              <Plus className="h-5 w-5" aria-hidden="true" /> Tirar mais uma
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onClick={() => setTarget("extra")}
                onChange={(e) => capture(e.target.files?.[0] ?? null, "extra")}
              />
            </label>
          ) : (
            <button type="button" className={moreButtonClass} onClick={() => setCameraFor("extra")}>
              <Plus className="h-5 w-5" aria-hidden="true" /> Tirar mais uma
            </button>
          )}
        </div>
      )}

      {cameraFor && (
        <InAppCamera
          label={cameraFor === "extra" ? "Foto a mais" : `Foto ${PHOTO_LABELS[cameraFor]}`}
          guide={cameraFor === "extra" ? undefined : ART[cameraFor]}
          onCapture={fromCamera}
          onClose={() => setCameraFor(null)}
          onFallback={() => {
            // sem permissão / sem câmera: volta pro jeito antigo (app de câmera do aparelho)
            setCameraFor(null);
            setCameraBlocked(true);
          }}
        />
      )}
    </div>
  );
}
