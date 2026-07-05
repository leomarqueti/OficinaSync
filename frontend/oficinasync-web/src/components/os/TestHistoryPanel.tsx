import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { TestMeasurement } from "./types";

type HistoryEntry = {
  test_id: number;
  title: string;
  test_type: string | null;
  measurements: TestMeasurement[] | null;
  verdict: string | null;
  notes: string | null;
  created_at: string;
  service_order_id: number;
  car: { brand: string; model: string; year: number; plate: string };
};

type TestHistoryPanelProps = {
  carId: number;
  /** Título digitado (testes genéricos) — busca por título parecido. */
  title?: string;
  /** Tipo especializado — busca exata por test_type em vez de título. */
  testType?: string;
};

const verdictLabels: Record<string, string> = {
  approved: "Aprovado",
  failed: "Reprovado",
  inconclusive: "Inconclusivo",
};

/**
 * Painel "doutor interno": busca testes do mesmo tipo/título já feitos em
 * outros veículos do mesmo modelo, pra comparar o diagnóstico atual (ex:
 * "esse Celta deu 1.5V na alimentação, o outro deu 5V — tem algo errado aqui").
 */
export function TestHistoryPanel({ carId, title, testType }: TestHistoryPanelProps) {
  const navigate = useNavigate();
  const [results, setResults] = useState<HistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  const canSearch = Boolean(testType || title?.trim());

  const search = async () => {
    if (!canSearch) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({ car_id: String(carId) });
      if (testType) {
        params.set("test_type", testType);
      } else if (title) {
        params.set("title", title.trim());
      }

      const data = await apiFetch<HistoryEntry[]>(`/tests/history?${params.toString()}`, {
        silent: true,
      });
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 rounded-2xl border border-dashed border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Histórico de testes parecidos (mesmo modelo de veículo)
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canSearch || loading}
          onClick={search}
        >
          {loading ? "Buscando..." : "Buscar histórico"}
        </Button>
      </div>

      {results !== null && results.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhum teste parecido registrado ainda nesse modelo de veículo.
        </p>
      )}

      {results !== null && results.length > 0 && (
        <div className="space-y-2">
          {results.map((entry) => (
            <div key={entry.test_id} className="rounded-xl bg-muted/30 p-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-medium">
                  {entry.car.brand} {entry.car.model} {entry.car.year} · {entry.car.plate}
                </span>
                <span className="text-muted-foreground">
                  {new Date(entry.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>

              {entry.measurements && entry.measurements.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 text-muted-foreground">
                  {entry.measurements.map((m, i) => (
                    <li key={i}>
                      {m.label}: <span className="font-medium text-foreground">{m.actual}</span>
                      {m.expected ? ` (esperado ${m.expected})` : ""}
                    </li>
                  ))}
                </ul>
              )}

              {entry.verdict && (
                <p className="mt-1.5 text-muted-foreground">
                  Veredito: <span className="font-medium">{verdictLabels[entry.verdict] ?? entry.verdict}</span>
                </p>
              )}

              <button
                type="button"
                onClick={() => navigate(`/os/${entry.service_order_id}`)}
                className="mt-1.5 text-brand hover:underline"
              >
                Ver OS #{entry.service_order_id}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
