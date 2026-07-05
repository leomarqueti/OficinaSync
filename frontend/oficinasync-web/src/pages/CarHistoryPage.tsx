import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Car, ClipboardList, Loader2 } from "lucide-react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { apiFetch } from "@/lib/api";
import { useDarkTheme } from "@/hooks/useDarkTheme";

type CarSummary = {
  car_id: number;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  fuel_type: string;
  mileage_in: number;
  client_id: number | null;
  client_name: string | null;
};

type OrderHistoryItem = {
  service_order_id: number;
  status: string;
  client_complaint: string;
  created_at: string;
  finished_at: string | null;
  mileage_in: number;
};

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    open: "Em aberto",
    in_progress: "Em andamento",
    done: "Concluída",
    cancelled: "Cancelada",
  };
  return labels[status] ?? status;
}

function getStatusPillClass(status: string) {
  const map: Record<string, string> = {
    open: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    in_progress: "border-blue-400/30 bg-blue-400/10 text-blue-300",
    done: "border-brand/30 bg-brand/10 text-brand",
    cancelled: "border-red-400/30 bg-red-400/10 text-red-300",
  };
  return map[status] ?? "border-border bg-muted text-foreground";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export function CarHistoryPage() {
  useDarkTheme();
  const { id } = useParams();
  const navigate = useNavigate();

  const [car, setCar] = useState<CarSummary | null>(null);
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [carResult, history] = await Promise.all([
          apiFetch<CarSummary>(`/cars/${id}`, { silent: true }),
          apiFetch<OrderHistoryItem[]>(`/service_orders/by-car/${id}`, { silent: true }),
        ]);

        setCar(carResult);
        setOrders(history);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível carregar o histórico.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  return (
    <>
      <DashboardSidebar />

      <SidebarInset className="dark bg-background">
        <div className="min-h-screen p-4 text-foreground md:p-6">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <button
                type="button"
                onClick={() => navigate("/veiculos")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Veículos
              </button>
            </div>

            {loading && (
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando histórico...
              </div>
            )}

            {!loading && error && (
              <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-6 text-sm text-red-300">
                {error}
              </div>
            )}

            {!loading && !error && car && (
              <>
                <div className="mt-6 flex items-center gap-4 rounded-3xl border border-border bg-card p-6">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted/40">
                    <Car className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                      {car.brand} {car.model} · {car.year}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {car.plate} · {car.color}
                      {car.client_name && ` · dono: ${car.client_name}`}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-border bg-card">
                  <div className="flex items-center gap-2 p-6 pb-0">
                    <ClipboardList className="h-5 w-5 text-brand" />
                    <h2 className="text-lg font-semibold">Histórico de OS</h2>
                  </div>

                  <div className="space-y-3 p-6">
                    {orders.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                        Nenhuma OS registrada pra esse veículo ainda.
                      </div>
                    )}

                    {orders.map((order) => (
                      <div
                        key={order.service_order_id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/os/${order.service_order_id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            navigate(`/os/${order.service_order_id}`);
                          }
                        }}
                        className="cursor-pointer rounded-2xl border border-border bg-muted/20 p-4 transition hover:border-brand/30 hover:bg-muted/30"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold">OS #{order.service_order_id}</span>
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusPillClass(order.status)}`}
                          >
                            {formatStatus(order.status)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {order.client_complaint}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatDate(order.created_at)} · KM {order.mileage_in.toLocaleString("pt-BR")}
                          {order.finished_at && ` · Concluída em ${formatDate(order.finished_at)}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </SidebarInset>
    </>
  );
}
