import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

type Props = { orderId: number; notes: string | null; onChanged: () => Promise<void> | void };

export function NotesSection({ orderId, notes, onChanged }: Props) {
  const [text, setText] = useState(notes ?? "");
  useEffect(() => setText(notes ?? ""), [notes]);

  const save = async () => {
    try {
      await apiFetch(`/service_orders/${orderId}/internal/notes`, { method: "PUT", json: { notes: text } });
      toast.success("Anotações salvas!");
      await onChanged();
    } catch {
      // toast já mostrado
    }
  };

  return (
    <section className="space-y-3 rounded-3xl border border-border bg-card p-5" data-tour="notes">
      <h2 className="text-lg font-semibold">Anotações do escritório</h2>
      <p className="text-xs text-muted-foreground">Só a equipe vê. O cliente nunca vê isto.</p>
      <textarea
        id="internal-notes"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={4000}
        className="rounded-xl border-white/12 bg-white/[0.04] text-base placeholder:text-white/50 min-h-[110px] w-full border px-3 py-2 outline-none focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/40"
        placeholder="Ex: cliente paga no PIX; nota em nome da empresa..."
      />
      <Button className="h-11" onClick={save}>Salvar anotações</Button>
    </section>
  );
}
