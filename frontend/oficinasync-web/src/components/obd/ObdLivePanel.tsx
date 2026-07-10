import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Activity,
  ClipboardPlus,
  Eraser,
  LineChart,
  Loader2,
  ScanSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiFetch } from "@/lib/api";
import { describeDtc } from "@/lib/dtcCodes";
import { obdParamLabels } from "@/components/tests/testTypes";
import { Sparkline } from "./Sparkline";

const POLL_MS = 2500;
const HISTORY_WINDOW = 60;
const VISIBLE_PARAMS_KEY = "obd_visible_params";

// Tensão entra como pseudo-parâmetro pra participar dos toggles/gráficos
const ALL_PARAM_KEYS = ["voltage", ...Object.keys(obdParamLabels)] as const;

const paramMeta = (key: string): { label: string; unit: string } =>
  key === "voltage"
    ? { label: "Tensão da bateria", unit: "V" }
    : (obdParamLabels[key] ?? { label: key, unit: "" });

const DEFAULT_VISIBLE = ["voltage", "rpm", "temp", "speed"];

type LatestResponse = {
  device_id: number;
  name: string;
  online: boolean;
  last_seen_at: string | null;
  last_reading: {
    voltage?: number | null;
    params?: Record<string, number | null>;
    dtcs?: { code: string; description?: string }[];
  } | null;
  last_reading_at: string | null;
  pending_command: string | null;
};

function loadVisibleParams(): string[] {
  try {
    const raw = localStorage.getItem(VISIBLE_PARAMS_KEY);
    if (!raw) return DEFAULT_VISIBLE;
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_VISIBLE;
  } catch {
    return DEFAULT_VISIBLE;
  }
}

type ObdLivePanelProps = {
  deviceId: number;
  /** Vindo de /scanner?os=ID — habilita o atalho "Anexar à OS". */
  osId?: number | null;
};

/**
 * Painel ao vivo do scanner: cards/gráficos alimentados pelos pushes do ESP32
 * (poll do último snapshot no backend — o navegador nunca fala com o dongle).
 * O histórico do gráfico acumula só no navegador, janela deslizante.
 */
export function ObdLivePanel({ deviceId, osId }: ObdLivePanelProps) {
  const navigate = useNavigate();

  const [latest, setLatest] = useState<LatestResponse | null>(null);
  const [visibleParams, setVisibleParams] = useState<string[]>(loadVisibleParams);
  const [graphMode, setGraphMode] = useState(false);
  const [showParamPicker, setShowParamPicker] = useState(false);

  // comandos: guarda quando foi pedido pra saber quando a resposta chegou
  const [awaitingCommand, setAwaitingCommand] = useState<
    { command: "read_dtc" | "clear_dtc"; sentAt: number } | null
  >(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [attaching, setAttaching] = useState(false);

  // histórico por parâmetro (só no navegador, some ao sair da página)
  const historyRef = useRef<Map<string, (number | null)[]>>(new Map());
  const lastReadingAtRef = useRef<string | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);

  const poll = useCallback(async () => {
    try {
      const data = await apiFetch<LatestResponse>(
        `/obd/devices/${deviceId}/latest`,
        { silent: true },
      );
      setLatest(data);

      // só acumula ponto quando chegou leitura NOVA (push do ESP)
      if (
        data.last_reading_at &&
        data.last_reading_at !== lastReadingAtRef.current
      ) {
        lastReadingAtRef.current = data.last_reading_at;
        const reading = data.last_reading;

        for (const key of ALL_PARAM_KEYS) {
          const value =
            key === "voltage"
              ? (reading?.voltage ?? null)
              : (reading?.params?.[key] ?? null);
          const series = historyRef.current.get(key) ?? [];
          series.push(value === null || value === undefined ? null : Number(value));
          if (series.length > HISTORY_WINDOW) series.shift();
          historyRef.current.set(key, series);
        }
        setHistoryVersion((v) => v + 1);
      }
    } catch {
      // erro de rede transitório — o próximo poll tenta de novo
    }
  }, [deviceId]);

  useEffect(() => {
    historyRef.current = new Map();
    lastReadingAtRef.current = null;
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [poll]);

  // resposta do comando chegou? (leitura nova depois do envio)
  useEffect(() => {
    if (!awaitingCommand || !latest?.last_reading_at) return;
    if (new Date(latest.last_reading_at).getTime() > awaitingCommand.sentAt) {
      toast.success(
        awaitingCommand.command === "read_dtc"
          ? "Códigos atualizados pelo scanner!"
          : "Comando de limpeza executado — códigos atualizados.",
      );
      setAwaitingCommand(null);
    }
  }, [latest, awaitingCommand]);

  const sendCommand = async (command: "read_dtc" | "clear_dtc") => {
    try {
      await apiFetch(`/obd/devices/${deviceId}/command`, {
        method: "POST",
        json: { command },
      });
      setAwaitingCommand({ command, sentAt: Date.now() });
      toast.info("Comando enviado — aguardando o scanner responder...");
    } catch {
      // apiFetch já mostrou o toast (ex: scanner offline)
    }
  };

  const attachToOs = async () => {
    if (!osId) return;
    try {
      setAttaching(true);
      await apiFetch("/obd/capture", {
        method: "POST",
        json: { device_id: deviceId, service_order_id: osId },
      });
      toast.success(`Leitura anexada à OS #${osId}!`);
      navigate(`/os/${osId}`);
    } catch {
      // apiFetch já mostrou o toast
    } finally {
      setAttaching(false);
    }
  };

  const toggleParam = (key: string) => {
    setVisibleParams((prev) => {
      const next = prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key];
      localStorage.setItem(VISIBLE_PARAMS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const reading = latest?.last_reading ?? null;
  const dtcs = reading?.dtcs ?? [];

  const valueOf = (key: string): number | null => {
    if (!reading) return null;
    const raw = key === "voltage" ? reading.voltage : reading.params?.[key];
    return raw === null || raw === undefined ? null : Number(raw);
  };

  const orderedVisible = useMemo(
    () => ALL_PARAM_KEYS.filter((key) => visibleParams.includes(key)),
    [visibleParams],
  );

  const readingAgeSeconds = latest?.last_reading_at
    ? Math.round((Date.now() - new Date(latest.last_reading_at).getTime()) / 1000)
    : null;

  return (
    <div className="mt-6 rounded-3xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-brand" />
          <h2 className="text-lg font-semibold">
            Ao vivo{latest ? ` · ${latest.name}` : ""}
          </h2>
          {latest && (
            <span
              className={`ml-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                latest.online
                  ? "border-brand/30 bg-brand/10 text-brand"
                  : "border-border bg-muted/30 text-muted-foreground"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${latest.online ? "bg-brand" : "bg-muted-foreground/40"}`}
              />
              {latest.online ? "Online" : "Offline"}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowParamPicker((v) => !v)}
          >
            Escolher dados
          </Button>
          <Button
            variant={graphMode ? "default" : "outline"}
            size="sm"
            className={graphMode ? "bg-brand text-brand-foreground hover:bg-brand/90" : ""}
            onClick={() => setGraphMode((v) => !v)}
          >
            <LineChart className="mr-1.5 h-3.5 w-3.5" />
            {graphMode ? "Modo cards" : "Modo gráfico"}
          </Button>
        </div>
      </div>

      {readingAgeSeconds !== null && (
        <p className="mt-1 text-xs text-muted-foreground">
          Última leitura há {readingAgeSeconds}s
          {readingAgeSeconds > 15 &&
            " — confira se o dongle está plugado no carro com a ignição ligada."}
        </p>
      )}

      {showParamPicker && (
        <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-dashed border-border p-3">
          {ALL_PARAM_KEYS.map((key) => {
            const active = visibleParams.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleParam(key)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? "border-brand/40 bg-brand/10 text-brand"
                    : "border-border text-muted-foreground hover:bg-muted/40"
                }`}
              >
                {paramMeta(key).label}
              </button>
            );
          })}
        </div>
      )}

      {!reading && (
        <p className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma leitura ainda — plugue o dongle no carro e ligue a ignição.
        </p>
      )}

      {reading && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {orderedVisible.map((key) => {
            const meta = paramMeta(key);
            const value = valueOf(key);
            const series = historyRef.current.get(key) ?? [];
            void historyVersion; // re-render quando o histórico muda

            return (
              <div
                key={key}
                className={`rounded-2xl border border-border bg-muted/20 p-4 ${
                  graphMode ? "col-span-2 sm:col-span-3" : ""
                }`}
              >
                <p className="text-xs text-muted-foreground">{meta.label}</p>
                <p className="mt-1 text-2xl font-bold">
                  {value === null
                    ? "--"
                    : value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {meta.unit}
                  </span>
                </p>
                {graphMode && (
                  <div className="mt-2">
                    <Sparkline points={series} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* códigos de falha */}
      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Códigos de falha</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!!awaitingCommand || !latest?.online}
              onClick={() => sendCommand("read_dtc")}
            >
              {awaitingCommand?.command === "read_dtc" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <ScanSearch className="mr-1.5 h-3.5 w-3.5" />
              )}
              {awaitingCommand?.command === "read_dtc"
                ? "Aguardando scanner..."
                : "Ler códigos agora"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-400 hover:text-red-300"
              disabled={!!awaitingCommand || !latest?.online}
              onClick={() => setConfirmClear(true)}
            >
              <Eraser className="mr-1.5 h-3.5 w-3.5" />
              Apagar códigos
            </Button>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {dtcs.length === 0 && (
            <p className="rounded-2xl border border-brand/20 bg-brand/5 p-3 text-sm text-brand">
              Nenhum código de falha na última leitura.
            </p>
          )}
          {dtcs.map((dtc, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-3"
            >
              <span className="rounded-lg bg-background px-3 py-1.5 font-mono text-sm font-bold tracking-wider">
                {dtc.code}
              </span>
              <p className="text-sm text-foreground/80">
                {dtc.description ?? describeDtc(dtc.code)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {osId && (
        <Button
          className="mt-6 h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={attachToOs}
          disabled={attaching || !latest?.online}
        >
          {attaching ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <ClipboardPlus className="mr-1.5 h-4 w-4" />
          )}
          Anexar leitura à OS #{osId}
        </Button>
      )}

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar os códigos de falha do carro?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso manda o comando de limpeza pra central do veículo. Códigos
              apagados sem consertar a causa voltam a aparecer — e você perde o
              registro do que estava lá. Se ainda não anexou a leitura à OS,
              faça isso antes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={() => {
                setConfirmClear(false);
                sendCommand("clear_dtc");
              }}
            >
              Apagar códigos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
