import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { roleLabels } from "@/lib/me";
import type { InternalData, TeamMember } from "@/lib/internalApi";

const TASKS = ["Diagnóstico", "Elétrica", "Mecânica", "Montagem", "Teste"];

const inputClass =
  "h-10 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Row = { checked: boolean; task: string; percent: string };

type Props = { data: InternalData; onChanged: () => Promise<void> | void };

export function TeamSection({ data, onChanged }: Props) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [rows, setRows] = useState<Record<number, Row>>({});
  const [saving, setSaving] = useState(false);
  const { can } = data;

  useEffect(() => {
    if (!can.edit_team && !can.change_responsible) return;
    apiFetch<TeamMember[]>("/users/team", { silent: true }).then(setTeam).catch(() => setTeam([]));
  }, [can.edit_team, can.change_responsible]);

  // reflete o que já está salvo
  useEffect(() => {
    const next: Record<number, Row> = {};
    for (const p of data.participants) {
      next[p.user_id] = { checked: true, task: p.task, percent: String(p.share_percent) };
    }
    setRows(next);
  }, [data.participants]);

  const helpers = useMemo(() => team.filter((m) => m.user_id !== data.responsible.user_id), [team, data.responsible.user_id]);

  const rowOf = (id: number): Row => rows[id] ?? { checked: false, task: "", percent: "" };
  const patchRow = (id: number, patch: Partial<Row>) => setRows((s) => ({ ...s, [id]: { ...rowOf(id), ...patch } }));

  const checked = helpers.filter((m) => rowOf(m.user_id).checked);
  const total = checked.reduce((acc, m) => acc + (Number(rowOf(m.user_id).percent) || 0), 0);
  const mine = 100 - total;
  const complete = checked.every((m) => {
    const r = rowOf(m.user_id);
    const n = Number(r.percent);
    return r.task.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= 99;
  });
  const overLimit = total > 99;

  const save = async () => {
    try {
      setSaving(true);
      await apiFetch(`/service_orders/${data.service_order_id}/participants`, {
        method: "PUT",
        json: {
          participants: checked.map((m) => ({
            user_id: m.user_id,
            share_percent: Number(rowOf(m.user_id).percent),
            task: rowOf(m.user_id).task.trim(),
          })),
        },
      });
      toast.success("Equipe salva!");
      await onChanged();
    } catch {
      // toast já mostrado
    } finally {
      setSaving(false);
    }
  };

  const changeResponsible = async (userId: number) => {
    try {
      await apiFetch(`/service_orders/${data.service_order_id}/responsible`, { method: "PATCH", json: { user_id: userId } });
      toast.success("Responsável trocado!");
      await onChanged();
    } catch {
      // toast já mostrado
    }
  };

  // mecânico comum: só a própria parte
  if (!can.edit_team && !can.see_all_team) {
    return (
      <section className="space-y-2 rounded-3xl border border-border bg-card p-5" data-tour="team">
        <h2 className="text-lg font-semibold">Equipe nesta OS</h2>
        {data.my_share_percent !== null ? (
          <p className="text-sm">
            Sua parte nesta OS: {data.my_share_percent}%
            {data.participants[0] ? ` — ${data.participants[0].task}` : ""}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Você não está marcado nesta OS.</p>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-card p-5" data-tour="team">
      <h2 className="text-lg font-semibold">Equipe nesta OS</h2>

      {can.change_responsible && team.length > 0 && (
        <label className="flex flex-wrap items-center gap-2 text-sm">
          Responsável pela OS:
          <select
            aria-label="Responsável pela OS"
            className={inputClass}
            value={data.responsible.user_id}
            onChange={(e) => changeResponsible(Number(e.target.value))}
          >
            {team.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.name} ({roleLabels[m.role]})
              </option>
            ))}
          </select>
        </label>
      )}

      {can.edit_team ? (
        <>
          <p className="text-sm text-muted-foreground">
            Marque quem ajudou, com o quê e quanto (% da OS). O resto fica com <strong>{data.responsible.name}</strong>.
          </p>

          <ul className="space-y-3">
            {helpers.map((m) => {
              const r = rowOf(m.user_id);
              return (
                <li key={m.user_id} className="space-y-2 rounded-2xl border border-border p-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      aria-label={`Ajudou: ${m.name}`}
                      checked={r.checked}
                      onChange={(e) => patchRow(m.user_id, { checked: e.target.checked })}
                      className="h-5 w-5 accent-lime-400"
                    />
                    {m.name} <span className="text-xs text-muted-foreground">({roleLabels[m.role]})</span>
                  </label>

                  {r.checked && (
                    <div className="space-y-2 pl-7">
                      <div className="flex flex-wrap gap-1.5">
                        {TASKS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => patchRow(m.user_id, { task: t })}
                            className={`rounded-full border px-2.5 py-1 text-xs ${r.task === t ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-foreground"}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          aria-label={`Tarefa de ${m.name}`}
                          className={`${inputClass} min-w-[180px] flex-1`}
                          placeholder="Com o quê ajudou"
                          value={r.task}
                          onChange={(e) => patchRow(m.user_id, { task: e.target.value })}
                        />
                        <input
                          aria-label={`Porcentagem de ${m.name}`}
                          type="number"
                          min={1}
                          max={99}
                          step={5}
                          className={`${inputClass} w-24`}
                          placeholder="%"
                          value={r.percent}
                          onChange={(e) => patchRow(m.user_id, { percent: e.target.value })}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {overLimit ? (
            <p className="text-sm text-red-400">A soma passa de 99% — o responsável precisa ficar com pelo menos 1%.</p>
          ) : (
            <p className="text-sm">Você fica com {mine}%</p>
          )}

          <Button className="h-11" onClick={save} disabled={saving || overLimit || !complete}>
            Salvar equipe
          </Button>
        </>
      ) : (
        <ul className="space-y-1 text-sm">
          <li>{data.responsible.name} (responsável): {data.responsible_share_percent}%</li>
          {data.participants.map((p) => (
            <li key={p.user_id}>{p.name}: {p.share_percent}% — {p.task}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
