import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useDarkTheme } from "@/hooks/useDarkTheme";
import type { InternalData } from "@/lib/internalApi";
import { PartsSection } from "@/components/internal/PartsSection";
import { ServicesSection } from "@/components/internal/ServicesSection";
import { NotesSection } from "@/components/internal/NotesSection";
import { TeamSection } from "@/components/internal/TeamSection";

export function OsOfficePage() {
  useDarkTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<InternalData | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<InternalData>(`/service_orders/${id}/internal`, { silent: true }));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="dark min-h-screen bg-background p-6 text-foreground">
        <p>{error}</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate(`/os/${id}`)}>Voltar</Button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const orderId = data.service_order_id;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <header className="space-y-3">
          <button type="button" onClick={() => navigate(`/os/${orderId}`)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Voltar para a OS
          </button>
          <h1 className="text-2xl font-bold tracking-tight">Peças e equipe — OS #{orderId}</h1>
          <p className="text-sm text-muted-foreground">
            Área interna: só a equipe vê. Responsável pela OS: <strong>{data.responsible.name}</strong>
            {data.viewer.is_responsible ? " (você)" : ""}.
          </p>
          {data.can.see_sheet && (
            <Button variant="outline" className="h-10" onClick={() => navigate(`/os/${orderId}/ficha`)}>
              <ClipboardList className="mr-1.5 h-4 w-4" />
              Abrir a ficha do escritório
            </Button>
          )}
        </header>

        <PartsSection orderId={orderId} parts={data.parts} canEdit={data.can.edit_items} onChanged={load} />
        <ServicesSection orderId={orderId} services={data.services} canEdit={data.can.edit_items} onChanged={load} />
        <TeamSection data={data} onChanged={load} />
        {data.can.edit_notes && <NotesSection orderId={orderId} notes={data.notes} onChanged={load} />}
      </div>
    </div>
  );
}
