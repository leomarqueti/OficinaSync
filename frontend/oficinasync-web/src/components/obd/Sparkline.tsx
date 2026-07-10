/**
 * Gráfico de linha leve em SVG puro (sem dependência) pro modo gráfico do
 * scanner — janela deslizante de pontos acumulada no navegador, molde visual
 * dos gráficos da página local do firmware v1 (Chart.js), só que dark.
 */
type SparklineProps = {
  points: (number | null)[];
  height?: number;
};

export function Sparkline({ points, height = 96 }: SparklineProps) {
  const values = points.filter((p): p is number => p !== null && !Number.isNaN(p));

  if (values.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-white/[0.03] text-xs text-muted-foreground"
        style={{ height }}
      >
        Acumulando leituras...
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 300;
  const padY = 6;

  const coords = points
    .map((value, index) => {
      if (value === null || Number.isNaN(value)) return null;
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = padY + (1 - (value - min) / range) * (height - padY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full rounded-xl bg-white/[0.03]"
        style={{ height }}
      >
        <polyline
          points={coords}
          fill="none"
          stroke="#A3E635"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="absolute left-2 top-1 text-[10px] text-muted-foreground">
        {max.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
      </span>
      <span className="absolute bottom-1 left-2 text-[10px] text-muted-foreground">
        {min.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
      </span>
    </div>
  );
}
