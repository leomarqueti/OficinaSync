import { motion } from "motion/react";
import type { ReactNode } from "react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/** Quadrado grande com ícone e UMA palavra (ex.: "Carro novo", "Foto"). */
export function ActionTile({
  icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  tone?: "default" | "brand";
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={() => {
        haptic();
        onClick?.();
      }}
      className={cn(
        "flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border p-4 font-display text-base font-extrabold uppercase tracking-wide",
        tone === "brand" ? "border-brand/40 bg-brand/10 text-brand" : "border-white/10 bg-white/[0.06] text-white",
      )}
    >
      <span aria-hidden="true" className="[&_svg]:h-8 [&_svg]:w-8">
        {icon}
      </span>
      {label}
    </motion.button>
  );
}
