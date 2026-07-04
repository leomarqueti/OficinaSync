import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

type AudioRecorderProps = {
  /** Chamado com o arquivo gravado/selecionado — pai decide o que fazer (upload, etc). */
  onRecorded: (file: File) => void;
};

type Status = "idle" | "recording" | "recorded" | "error";

function pickMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported?.(type));
}

/**
 * Grava áudio direto no navegador (MediaRecorder) — sem precisar de app externo.
 * Se o microfone não estiver disponível, cai pro input de arquivo como alternativa.
 */
export function AudioRecorder({ onRecorded }: AudioRecorderProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const previewUrl = useMemo(
    () => (recordedFile ? URL.createObjectURL(recordedFile) : null),
    [recordedFile],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startRecording = async () => {
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const extension = blob.type.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `gravacao-${Date.now()}.${extension}`, {
          type: blob.type,
        });
        setRecordedFile(file);
        onRecorded(file);
        stream.getTracks().forEach((track) => track.stop());
        if (intervalRef.current) clearInterval(intervalRef.current);
      };

      recorder.start();
      recorderRef.current = recorder;
      setStatus("recording");
      setSeconds(0);
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Não foi possível acessar o microfone. Verifique a permissão.");
      setStatus("error");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setStatus("recorded");
  };

  const recordAgain = () => {
    setRecordedFile(null);
    setStatus("idle");
    setSeconds(0);
  };

  const handleFileFallback = (file: File | null) => {
    if (!file) return;
    setRecordedFile(file);
    setStatus("recorded");
    onRecorded(file);
  };

  const formatSeconds = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-2">
      {status === "idle" && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="h-11" onClick={startRecording}>
            <Mic className="mr-1.5 h-4 w-4" />
            Gravar áudio
          </Button>
          <label className="flex h-11 cursor-pointer items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-muted">
            Escolher arquivo
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => handleFileFallback(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      )}

      {status === "recording" && (
        <Button
          type="button"
          className="h-11 bg-red-500 text-white hover:bg-red-600"
          onClick={stopRecording}
        >
          <Square className="mr-1.5 h-4 w-4" />
          Parar ({formatSeconds(seconds)})
        </Button>
      )}

      {status === "recorded" && previewUrl && (
        <div className="flex flex-wrap items-center gap-2">
          <audio controls src={previewUrl} className="h-10" />
          <Button type="button" variant="outline" className="h-11" onClick={recordAgain}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Gravar de novo
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-red-400">{error}</p>
          <label className="flex h-11 w-fit cursor-pointer items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-muted">
            Escolher arquivo de áudio
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => handleFileFallback(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
