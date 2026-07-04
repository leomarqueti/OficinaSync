import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Car, Clock3, ClipboardList, Plus, User } from "lucide-react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { apiFetch } from "@/lib/api";
import { useDarkTheme } from "@/hooks/useDarkTheme";

type OpenServiceOrder = {
  service_order_id: number;
  status: string;
  client_complaint: string;
  created_at: string;
  public_token?: string;
  public_url?: string;
  tenant: { name: string };
  car: {
    brand: string;
    model: string;
    year: number;
    plate: string;
    mileage_in: number;
    color: string;
    fuel_type: string;
  };
  client: { name: string; phone: string };
};

type Me = {
  user_id: number;
  name: string;
  email: string;
  tenant_name: string | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

function formatShortDate() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

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

function DashboardMetricCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-3xl border border-border bg-card p-5">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-3xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40">
        {icon}
      </div>
    </div>
  );
}

function MetricSkeleton() {
  return (
    <div className="h-[104px] animate-pulse rounded-3xl border border-border bg-card" />
  );
}

function OrderSkeleton() {
  return <div className="h-40 animate-pulse rounded-3xl border border-border bg-card" />;
}

export function DashboardPage() {
  useDarkTheme();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<OpenServiceOrder[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [ordersResult, meResult] = await Promise.all([
          apiFetch<OpenServiceOrder[]>("/service_orders/orders", { silent: true }),
          apiFetch<Me>("/users/me", { silent: true }),
        ]);

        setOrders(ordersResult);
        setMe(meResult);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Não foi possível carregar o painel.",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const metrics = useMemo(() => {
    const uniqueClients = new Set(orders.map((o) => o.client.name)).size;
    const uniqueCars = new Set(orders.map((o) => o.car.plate)).size;

    const today = new Date().toDateString();
    const createdToday = orders.filter(
      (o) => new Date(o.created_at).toDateString() === today,
    ).length;

    return {
      open: orders.length,
      clients: uniqueClients,
      cars: uniqueCars,
      today: createdToday,
    };
  }, [orders]);

  return (
    <>
      <DashboardSidebar />

      <SidebarInset className="dark bg-background">
        <div className="min-h-screen p-4 text-foreground md:p-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <SidebarTrigger className="mt-1" />

                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    {greeting()}
                    {me ? `, ${me.name.split(" ")[0]}` : ""}!
                  </h1>
                  <p className="text-sm capitalize text-muted-foreground">
                    {formatShortDate()}
                    {me?.tenant_name ? ` · ${me.tenant_name}` : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Button
                className="h-12 w-full rounded-full bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={() => navigate("/os-client-create")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Ordem de Serviço
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {loading ? (
                <>
                  <MetricSkeleton />
                  <MetricSkeleton />
                  <MetricSkeleton />
                  <MetricSkeleton />
                </>
              ) : (
                <>
                  <DashboardMetricCard
                    title="Ordens abertas"
                    value={metrics.open}
                    subtitle="Aguardando andamento"
                    icon={<Clock3 className="h-5 w-5 text-amber-400" />}
                  />
                  <DashboardMetricCard
                    title="Clientes"
                    value={metrics.clients}
                    subtitle="Com OS abertas"
                    icon={<User className="h-5 w-5 text-blue-400" />}
                  />
                  <DashboardMetricCard
                    title="Veículos"
                    value={metrics.cars}
                    subtitle="Atualmente em atendimento"
                    icon={<Car className="h-5 w-5 text-violet-400" />}
                  />
                  <DashboardMetricCard
                    title="Criadas hoje"
                    value={metrics.today}
                    subtitle="Ordens abertas hoje"
                    icon={<ClipboardList className="h-5 w-5 text-brand" />}
                  />
                </>
              )}
            </div>

            <div className="mt-6 rounded-3xl border border-border bg-card">
              <div className="p-6 pb-0">
                <h2 className="text-2xl font-semibold">Ordens de Serviço</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Visualize e continue trabalhando nas OS abertas
                </p>
              </div>

              <div className="space-y-4 p-6">
                {loading && (
                  <>
                    <OrderSkeleton />
                    <OrderSkeleton />
                  </>
                )}

                {!loading && error && (
                  <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-6 text-sm text-red-300">
                    {error}
                  </div>
                )}

                {!loading && !error && orders.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                    Nenhuma ordem de serviço aberta — crie a primeira acima.
                  </div>
                )}

                {!loading &&
                  !error &&
                  orders.map((order) => (
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
                      className="w-full cursor-pointer rounded-3xl border border-border bg-muted/20 p-5 text-left transition hover:border-brand/30 hover:bg-muted/30"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[120px_1fr_1fr]">
                          <div>
                            <p className="text-xs uppercase text-muted-foreground">OS</p>
                            <p className="mt-1 text-lg font-bold">
                              #{order.service_order_id}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs uppercase text-muted-foreground">
                              Cliente / Veículo
                            </p>
                            <p className="mt-1 font-semibold">{order.client.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.car.brand} {order.car.model}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {order.car.year} · {order.car.color} · {order.car.plate}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs uppercase text-muted-foreground">Relato</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {order.client_complaint}
                            </p>
                          </div>
                        </div>

                        <div className="flex min-w-[240px] flex-col gap-3">
                          <span
                            className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusPillClass(
                              order.status,
                            )}`}
                          >
                            {formatStatus(order.status)}
                          </span>

                          <div className="rounded-2xl bg-muted/40 p-3 text-sm">
                            <p className="font-medium">KM entrada</p>
                            <p className="text-muted-foreground">
                              {order.car.mileage_in.toLocaleString("pt-BR")}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-muted/40 p-3 text-sm">
                            <p className="font-medium">Criada em</p>
                            <p className="text-muted-foreground">
                              {formatDate(order.created_at)}
                            </p>
                          </div>

                          <div className="flex flex-col gap-2 pt-1">
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/os/${order.service_order_id}`);
                              }}
                            >
                              Trabalhar nesta OS
                            </Button>

                            <Button
                              className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                              onClick={(e) => {
                                e.stopPropagation();

                                if (order.public_url) {
                                  window.open(order.public_url, "_blank");
                                  return;
                                }

                                if (order.public_token) {
                                  window.open(
                                    `${window.location.origin}/servico/${order.public_token}`,
                                    "_blank",
                                  );
                                }
                              }}
                            >
                              Ver página do cliente
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </>
  );
}
