import { cn } from "@/lib/utils";

const LIME = "#A3E635";
const INK = "#0A0A0A";

type Tone = "dark" | "light";

/** Símbolo da marca: a engrenagem com a ferramenta do logo original, redesenhada em vetor. */
export function BrandSymbol({
  tone = "dark",
  className,
  title,
}: {
  tone?: Tone;
  className?: string;
  title?: string;
}) {
  const color = tone === "dark" ? LIME : INK;
  return (
    <svg
      viewBox="0 0 64 64"
      data-brand="oficinasync-gear"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      <circle cx="32" cy="38" r="20" fill="none" stroke={color} strokeWidth="8" strokeDasharray="7.5 5.066" strokeDashoffset="3.74" />
      <circle cx="32" cy="38" r="9" fill={color} />
      <path d="M26 6h12v8l-3 4v14h-6V18l-3-4z" fill={color} />
    </svg>
  );
}

const SIZES = {
  sm: { icon: "h-7 w-7", text: "text-xl" },
  md: { icon: "h-10 w-10", text: "text-3xl" },
  lg: { icon: "h-16 w-16", text: "text-5xl" },
} as const;

/** Logo horizontal: símbolo + "OFICINASYNC" (Sync em destaque). `tone="light"` = pra fundo branco. */
export function BrandLogo({
  tone = "dark",
  size = "md",
  className,
}: {
  tone?: Tone;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span role="img" aria-label="OficinaSync" className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandSymbol tone={tone} className={s.icon} />
      <span
        aria-hidden="true"
        className={cn(
          "font-display font-extrabold uppercase leading-none tracking-wide",
          s.text,
          tone === "dark" ? "text-white" : "text-[#0a0a0a]",
        )}
      >
        Oficina<span className={tone === "dark" ? "text-brand" : "text-[#4d7c0f]"}>Sync</span>
      </span>
    </span>
  );
}
