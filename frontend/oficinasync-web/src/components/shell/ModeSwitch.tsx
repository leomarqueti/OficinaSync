import { LayoutDashboard, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useShellMode } from "./ModeContext";

/** Só o dono vê: alterna entre a cara de mecânico e a de controle. */
export function ModeSwitch({ className }: { className?: string }) {
  const { mode, canSwitch, setMode } = useShellMode();
  const navigate = useNavigate();
  if (!canSwitch) return null;
  const toSimple = mode === "control";
  return (
    <button
      type="button"
      onClick={() => {
        setMode(toSimple ? "simple" : "control");
        navigate("/dashboard");
      }}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-bold text-white/90 hover:border-white/30",
        className,
      )}
    >
      {toSimple ? <Wrench className="h-4 w-4" aria-hidden="true" /> : <LayoutDashboard className="h-4 w-4" aria-hidden="true" />}
      {toSimple ? "Ver como mecânico" : "Ver modo controle"}
    </button>
  );
}
