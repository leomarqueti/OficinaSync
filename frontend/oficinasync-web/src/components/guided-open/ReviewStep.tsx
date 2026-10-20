import { Camera, Car, FileText, Gauge, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { normalizePlate, type GuidedState, type StepId } from "@/lib/guidedOpen";
import { cn } from "@/lib/utils";
import type { GuidedFiles } from "./types";

function Row({ icon, children, onClick, alert }: { icon: ReactNode; children: ReactNode; onClick: () => void; alert?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 rounded-2xl border bg-white/[0.05] px-4 py-3 text-left text-base",
        alert ? "border-l-4 border-warning text-warning" : "border-white/10",
      )}
    >
      <span aria-hidden="true" className="[&_svg]:h-5 [&_svg]:w-5">
        {icon}
      </span>
      <span className="flex-1">{children}</span>
    </button>
  );
}

/** Tela 10: resumo; tocar num item volta pra tela dele. */
export function ReviewStep({ state, files, onEdit }: { state: GuidedState; files: GuidedFiles; onEdit: (step: StepId) => void }) {
  const car = [state.brand, state.model, state.year].filter(Boolean).join(" ");
  const photos = Object.values(state.photos).filter(Boolean).length + files.extraPhotos.length;
  return (
    <div className="flex flex-col gap-2">
      <Row icon={<Car />} onClick={() => onEdit("plate")}>
        <b>{car || "Carro"}</b> · {normalizePlate(state.plate)}
        {state.color ? ` · ${state.color}` : ""}
      </Row>
      <Row icon={<Gauge />} onClick={() => onEdit("km")}>
        {Number(state.km || 0).toLocaleString("pt-BR")} km
      </Row>
      <Row icon={<FileText />} onClick={() => onEdit("defect")}>
        {state.defect}
        {state.hasAudio ? " · 🎙 áudio" : ""}
        {state.hasVideo ? " · 🎥 vídeo" : ""}
      </Row>
      <Row icon={<Camera />} onClick={() => onEdit("photos")}>
        {photos} foto(s)
      </Row>
      {state.clientPresent === false && !state.client.client_id ? (
        <Row icon={<UserRound />} onClick={() => onEdit("client")} alert>
          Cliente: O escritório completa
        </Row>
      ) : (
        <Row icon={<UserRound />} onClick={() => onEdit("client")} alert={state.clientPresent === false}>
          {state.client.name || "Cliente"}
          {state.clientPresent === false ? " · O escritório completa os dados" : ""}
        </Row>
      )}
    </div>
  );
}
