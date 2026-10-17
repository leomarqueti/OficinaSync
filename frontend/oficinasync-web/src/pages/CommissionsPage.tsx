import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useDarkTheme } from "@/hooks/useDarkTheme";
import { isOfficeRole, useMe } from "@/lib/me";
import type { TeamMember } from "@/lib/internalApi";
import { fieldClassCompact } from "@/components/kit";

type Line = {
  service_order_id: number;
  plate: string;
  finished_at: string;
  share_percent: number;
  task: string | null;
  is_responsible: boolean;
};
type Person = { user_id: number; name: string; role: string; os_count: number; total_percent: number; orders: Line[] };
type Result = { from: string; to: string; people: Person[] };

const inputClass = fieldClassCompact;

const iso = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function CommissionsPage() {
  useDarkTheme();
  const navigate = useNavigate();
  const { me } = useMe();
  const office = isOfficeRole(me?.role);

  const now = new Date();
  const [from, setFrom] = useState(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(iso(now));
  const [userId, setUserId] = useState("");
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ from, to, ...(userId ? { user_id: userId } : {}) });
      setResult(await apiFetch<Result>(`/commissions?${qs.toString()}`, { silent: true }));
    } catch {
      setResult({ from, to, people: [] });
    } finally {
      setLoading(false);
    }
  }, [from, to, userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (office) apiFetch<TeamMember[]>("/users/team", { silent: true }).then(setTeam).catch(() => setTeam([]));
  }, [office]);

  return (
    <>
        <div className="min-h-full p-4 text-foreground md:p-6">
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{office ? "Comissões" : "Minhas comissões"}</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Porcentagem de cada pessoa nas OS concluídas no período. (Valores em R$ ainda não — a OS não guarda preço.)
            </p>

            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm">
                De
                <br />
                <input id="comm-from" type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label className="text-sm">
                Até
                <br />
                <input id="comm-to" type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
              {office && (
                <label className="text-sm">
                  Funcionário
                  <br />
                  <select className={inputClass} value={userId} onChange={(e) => setUserId(e.target.value)}>
                    <option value="">Todos</option>
                    {team.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {!loading && result && result.people.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma OS concluída neste período.</p>
            )}

            {result?.people.map((p) => (
              <section key={p.user_id} className="space-y-2 rounded-3xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  <p className="text-sm">
                    <strong>{p.total_percent}%</strong> somados em {p.os_count} OS
                    <span className="text-muted-foreground">
                      {" "}
                      (≈ {(p.total_percent / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} OS inteiras)
                    </span>
                  </p>
                </div>
                <ul className="space-y-1 text-sm">
                  {p.orders.map((o) => (
                    <li key={o.service_order_id} className="flex flex-wrap justify-between gap-2">
                      <button type="button" className="text-brand hover:underline" onClick={() => navigate(`/os/${o.service_order_id}`)}>
                        OS #{o.service_order_id} · {o.plate}
                      </button>
                      <span>
                        {o.share_percent}% {o.is_responsible ? "(responsável)" : `— ${o.task}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
    </>
  );
}
