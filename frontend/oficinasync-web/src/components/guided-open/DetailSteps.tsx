import { Mic, Video } from "lucide-react";
import { useState } from "react";
import painelKm from "@/assets/illustrations/painel-km.svg";
import { KmField } from "@/components/fields/KmField";
import { fieldClass, textAreaClass } from "@/components/kit";
import { AudioRecorder } from "@/components/media/AudioRecorder";
import { MediaCaptureField } from "@/components/media/MediaCaptureField";
import { COMMON_COLORS, FUEL_OPTIONS } from "@/lib/carCatalog";
import { intakeQuestions } from "@/lib/intakeQuestions";
import { cn } from "@/lib/utils";
import { DictationButton } from "./DictationButton";
import type { FileStepProps, StepProps } from "./types";

/** Tela 5: painel com o hodômetro piscando + campo do KM. */
export function KmStep({ state, onChange }: StepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative mx-auto w-full max-w-md">
        <img src={painelKm} alt="Painel do carro: o KM fica no visor de baixo, no meio" className="w-full" />
        {/* o hodômetro do desenho fica em x 313–487, y 251–299 de um viewBox 800×365 */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute animate-pulse rounded-lg ring-4 ring-brand"
          style={{ left: "39%", top: "68.5%", width: "22%", height: "13.5%" }}
        />
      </div>
      <p className="text-center text-base font-semibold text-brand">O número que pisca é o KM.</p>
      {state.match?.last_mileage != null && (
        <p className="text-center text-sm text-warning">Da última vez estava {state.match.last_mileage.toLocaleString("pt-BR")} km — confira o de hoje.</p>
      )}
      <KmField value={state.km} onChange={(km) => onChange({ km })} label="KM que está no painel" />
    </div>
  );
}

/** Tela 6: combustível, cor e chassi — tudo opcional. */
export function ExtrasStep({ state, onChange }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 text-base font-semibold normal-case text-white/80">Combustível</h2>
        <div className="grid grid-cols-2 gap-2">
          {FUEL_OPTIONS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={state.fuel === f.value}
              onClick={() => onChange({ fuel: state.fuel === f.value ? "" : f.value })}
              className={cn(
                "min-h-14 rounded-2xl border font-display text-lg font-extrabold uppercase",
                state.fuel === f.value ? "border-brand bg-brand/15 text-brand" : "border-white/10 bg-white/[0.06]",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold normal-case text-white/80">Cor</h2>
        <div className="flex flex-wrap gap-3">
          {COMMON_COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              aria-pressed={state.color === c.name}
              aria-label={c.name}
              onClick={() => onChange({ color: state.color === c.name ? "" : c.name })}
              className="flex flex-col items-center gap-1"
            >
              <span
                className={cn("h-12 w-12 rounded-full border-2", state.color === c.name ? "border-brand ring-4 ring-brand/40" : "border-white/20")}
                style={{ background: c.hex }}
              />
              <span className="text-xs text-white/70">{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <label htmlFor="chassis" className="mb-2 block text-base font-semibold text-white/80">
          Chassi <span className="text-sm font-normal text-white/60">(se tiver à mão)</span>
        </label>
        <input
          id="chassis"
          value={state.chassis}
          onChange={(e) => onChange({ chassis: e.target.value.toUpperCase() })}
          className={cn(fieldClass, "uppercase")}
        />
      </section>
    </div>
  );
}

/** Tela 7: defeito em texto (obrigatório, com microfone), áudio/vídeo e perguntas rápidas opcionais. */
export function DefectStep({ state, onChange, files, onFiles }: FileStepProps) {
  const [showVideo, setShowVideo] = useState(Boolean(files.video));
  const [showAudio, setShowAudio] = useState(Boolean(files.audio));
  const [showQuestions, setShowQuestions] = useState(Object.keys(state.answers).length > 0);
  const quick = intakeQuestions.filter((q) => q.type === "select");

  return (
    <div className="flex flex-col gap-4">
      <label htmlFor="defect" className="text-base font-semibold text-white/80">
        O que o carro tem? (como o cliente falou)
      </label>
      <textarea
        id="defect"
        value={state.defect}
        onChange={(e) => onChange({ defect: e.target.value })}
        placeholder="Ex.: falha ao acelerar, luz da injeção acesa"
        className={cn(textAreaClass, "min-h-32 text-lg")}
      />
      <DictationButton onText={(text) => onChange({ defect: state.defect ? `${state.defect.trimEnd()} ${text}` : text })} />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setShowAudio(true)}
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] font-display text-base font-extrabold uppercase"
        >
          <Mic className="h-5 w-5" aria-hidden="true" /> Gravar áudio
        </button>
        <button
          type="button"
          onClick={() => setShowVideo(true)}
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] font-display text-base font-extrabold uppercase"
        >
          <Video className="h-5 w-5" aria-hidden="true" /> Filmar
        </button>
      </div>
      {showAudio && (
        <AudioRecorder
          onRecorded={(audio) => {
            onFiles({ audio });
            onChange({ hasAudio: true });
          }}
        />
      )}
      {showVideo && (
        <MediaCaptureField
          type="video"
          value={files.video}
          onChange={(video) => {
            onFiles({ video });
            onChange({ hasVideo: Boolean(video) });
          }}
        />
      )}

      <button
        type="button"
        onClick={() => setShowQuestions((v) => !v)}
        className="min-h-11 text-left text-base font-semibold text-brand"
      >
        {showQuestions ? "Esconder perguntas rápidas" : "+ Perguntas rápidas (opcional)"}
      </button>
      {showQuestions &&
        quick.map((q) => (
          <div key={q.key}>
            <p className="mb-2 text-sm font-semibold text-white/80">{q.label}</p>
            <div className="flex flex-wrap gap-2">
              {(q.options ?? []).map((opt) => {
                const on = state.answers[q.key] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange({ answers: { ...state.answers, [q.key]: on ? "" : opt } })}
                    className={cn(
                      "min-h-11 rounded-xl border px-3 text-sm font-semibold",
                      on ? "border-brand bg-brand/15 text-brand" : "border-white/10 bg-white/[0.06]",
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}
