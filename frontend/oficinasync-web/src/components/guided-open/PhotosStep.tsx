import { PhotoSidesCapture } from "./PhotoSidesCapture";
import type { FileStepProps } from "./types";

/** Tela 9 da abertura: as 4 fotos de entrada (guardadas no aparelho no conjunto "open"). */
export function PhotosStep({ state, onChange, files, onFiles }: FileStepProps) {
  return (
    <PhotoSidesCapture
      photos={files.photos}
      done={state.photos}
      extraPhotos={files.extraPhotos}
      scope="open"
      onPhoto={(slot, file) => {
        if (slot === "extra") {
          onFiles({ extraPhotos: [...files.extraPhotos, file] });
          onChange({ extraPhotos: files.extraPhotos.length + 1 });
        } else {
          onFiles({ photos: { ...files.photos, [slot]: file } });
          onChange({ photos: { ...state.photos, [slot]: true } });
        }
      }}
    />
  );
}
