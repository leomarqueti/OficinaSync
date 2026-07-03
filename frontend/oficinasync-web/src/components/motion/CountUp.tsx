import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

type CountUpProps = {
  /** Valor final (aceita string vinda do formulário, ex: "12.6"). */
  value: number | string;
  /** Casas decimais na exibição. */
  decimals?: number;
  suffix?: string;
  className?: string;
  /** Duração da contagem em ms. */
  duration?: number;
};

/**
 * Número que "sobe" do zero até o valor quando entra na tela.
 * Usado nas métricas dos testes (tensão da bateria, compressão etc.)
 * pra dar peso ao dado técnico.
 */
export function CountUp({
  value,
  decimals = 1,
  suffix = "",
  className,
  duration = 1200,
}: CountUpProps) {
  const target =
    typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));

  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || reduced || Number.isNaN(target)) return;

    let frame: number;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cúbico: acelera no começo, assenta suave no final
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(target * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, target, duration, reduced]);

  if (Number.isNaN(target)) {
    return (
      <span ref={ref} className={className}>
        {String(value)}
        {suffix}
      </span>
    );
  }

  // Com "reduzir movimento" ativo, mostra o valor final direto (sem animar).
  const shown = reduced ? target : display;

  return (
    <span ref={ref} className={className}>
      {shown.toLocaleString("pt-BR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
