import { motion } from "motion/react";
import { useId, type MouseEvent, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-brand-foreground shadow-[0_10px_30px_-10px_rgba(163,230,53,.6)] hover:bg-brand/90",
  secondary: "border-2 border-white/20 bg-transparent text-white hover:border-white/40",
  danger: "bg-danger text-[#0a0a0a] hover:bg-danger/90",
};

type Props = {
  variant?: Variant;
  size?: "md" | "hero";
  /** Mostrado embaixo quando desabilitado: diga O QUE falta pra liberar. */
  hint?: string;
  icon?: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  children: ReactNode;
  "data-tour"?: string;
};

/** Botão grande do sistema: ≥56px, afunda ao tocar e vibra de leve. */
export function BigButton({
  variant = "primary",
  size = "md",
  hint,
  icon,
  disabled,
  type = "button",
  onClick,
  className,
  children,
  ...rest
}: Props) {
  const hintId = useId();
  const showHint = Boolean(disabled && hint);
  return (
    <div className="flex w-full flex-col items-stretch gap-1.5">
      <motion.button
        type={type}
        disabled={disabled}
        aria-describedby={showHint ? hintId : undefined}
        whileTap={disabled ? undefined : { scale: 0.94 }}
        onClick={(event) => {
          if (disabled) return;
          haptic();
          onClick?.(event);
        }}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 font-display font-extrabold uppercase tracking-wide outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/60 [&_svg]:h-6 [&_svg]:w-6",
          size === "hero" ? "min-h-16 text-2xl" : "min-h-14 text-xl",
          disabled ? "cursor-not-allowed bg-white/10 text-white/50 shadow-none" : VARIANTS[variant],
          className,
        )}
        {...rest}
      >
        {icon}
        {children}
      </motion.button>
      {showHint && (
        <p id={hintId} className="text-center text-sm text-white/70">
          {hint}
        </p>
      )}
    </div>
  );
}
