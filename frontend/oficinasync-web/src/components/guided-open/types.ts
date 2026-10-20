import type { GuidedState, PhotoSide } from "@/lib/guidedOpen";

/** Arquivos da abertura (ficam fora do GuidedState: não vão pro rascunho). */
export type GuidedFiles = {
  photos: Record<PhotoSide, File | null>;
  extraPhotos: File[];
  audio: File | null;
  video: File | null;
};

export function emptyGuidedFiles(): GuidedFiles {
  return { photos: { front: null, rear: null, left: null, right: null }, extraPhotos: [], audio: null, video: null };
}

export type StepProps = {
  state: GuidedState;
  onChange: (patch: Partial<GuidedState>) => void;
  onNext: () => void;
};

export type FileStepProps = StepProps & {
  files: GuidedFiles;
  onFiles: (patch: Partial<GuidedFiles>) => void;
};
