import { useEffect, useMemo } from "react";
import { Camera, Check } from "lucide-react";

type EntryPhotoSlotProps = {
  label: string;
  file: File | null;
  onCapture: (file: File | null) => void;
};

/**
 * Captura/preview de uma foto localmente (sem upload ainda — o wizard só
 * envia tudo pro backend na revisão final, pra não deixar cliente/carro
 * órfãos no banco se o mecânico abandonar o fluxo pela metade).
 */
export function EntryPhotoSlot({ label, file, onCapture }: EntryPhotoSlotProps) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <label className="relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-border bg-muted/20 text-center hover:bg-muted/40">
      {previewUrl ? (
        <>
          <img src={previewUrl} alt={label} className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-brand/90 py-1 text-xs font-semibold text-brand-foreground">
            <Check className="h-3.5 w-3.5" />
            {label}
          </span>
        </>
      ) : (
        <>
          <Camera className="h-6 w-6 text-muted-foreground" />
          <span className="px-2 text-xs font-medium text-muted-foreground">{label}</span>
        </>
      )}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onCapture(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
