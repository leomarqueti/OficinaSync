import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";

const MAX_SIDE = 1600;

/**
 * Câmera dentro da própria página. No Android com pouca memória, abrir o app de câmera
 * fecha o OficinaSync por trás e a foto se perde — aqui a página nunca sai da tela.
 * Mostra o desenho do lado do carro por cima, como guia. Se a câmera não abrir, chama onFallback.
 */
export function InAppCamera({
  label,
  guide,
  onCapture,
  onClose,
  onFallback,
}: {
  label: string;
  guide?: string;
  onCapture: (file: File) => void;
  onClose: () => void;
  onFallback: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((stream) => {
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
      })
      .catch(() => alive && onFallback());
    return () => {
      alive = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // abre a câmera uma vez por exibição
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        haptic();
        onCapture(new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.8,
    );
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Câmera — ${label}`} className="fixed inset-0 z-[90] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 pb-2 pt-4 text-white">
        <p className="font-display text-xl font-extrabold uppercase">{label}</p>
        <button type="button" onClick={onClose} aria-label="Fechar câmera" className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          onLoadedMetadata={() => setReady(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {guide && (
          <img src={guide} alt="" aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-1/2 mx-auto w-[min(80%,420px)] -translate-y-1/2 opacity-35" />
        )}
      </div>
      <div className="flex items-center justify-center pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
        <button
          type="button"
          onClick={shoot}
          disabled={!ready}
          aria-label="Disparar"
          className="h-20 w-20 rounded-full border-4 border-white bg-brand shadow-[0_0_0_6px_rgba(163,230,53,.35)] transition-transform active:scale-90 disabled:opacity-40"
        />
      </div>
    </div>
  );
}
