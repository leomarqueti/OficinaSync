import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getSpeechRecognition, type SpeechRecognitionLike } from "@/lib/dictation";
import { haptic } from "@/lib/haptics";

/** Botão grande "Falar": transforma a fala em texto e entrega cada trecho pronto. Some sem suporte. */
export function DictationButton({ onText }: { onText: (text: string) => void }) {
  const [supported] = useState(() => getSpeechRecognition() !== null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // o reconhecimento contínuo guarda o callback do start(); usar sempre o mais novo (senão apaga fala anterior)
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => () => recognitionRef.current?.stop(), []);

  if (!supported) return null;

  const start = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) onTextRef.current(result[0].transcript.trim());
      }
    };
    recognition.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        toast.error("Não deu pra usar o microfone — escreva o defeito.");
      }
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    haptic();
    recognition.start();
    setListening(true);
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      aria-pressed={listening}
      className={
        listening
          ? "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-danger px-4 font-display text-lg font-extrabold uppercase text-[#0a0a0a]"
          : "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-brand/50 bg-brand/10 px-4 font-display text-lg font-extrabold uppercase text-brand"
      }
    >
      {listening ? <Square className="h-5 w-5" aria-hidden="true" /> : <Mic className="h-6 w-6" aria-hidden="true" />}
      {listening ? "Ouvindo… toque pra parar" : "Falar em vez de escrever"}
    </button>
  );
}
