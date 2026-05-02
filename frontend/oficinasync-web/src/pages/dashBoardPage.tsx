import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Bell,
  Car,
  Clock3,
  ClipboardList,
  Plus,
  User,
} from "lucide-react";
import { DashboardSidebar } from "@/components/DashboardSidebar";

type OpenServiceOrder = {
  service_order_id: number;
  status: string;
  client_complaint: string;
  created_at: string;
  public_token?: string;
  public_url?: string;
  tenant: {
    name: string;
  };
  car: {
    brand: string;
    model: string;
    year: number;
    plate: string;
    mileage_in: number;
    color: string;
    fuel_type: string;
  };
  client: {
    name: string;
    phone: string;
  };
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
    open: "bg-amber-100 text-amber-700",
    in_progress: "bg-blue-100 text-blue-700",
    done: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return map[status] ?? "bg-muted text-foreground";
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
    <Card className="rounded-3xl border-0 shadow-sm">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-3xl font-bold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<OpenServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Token não encontrado");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch("http://localhost:3000/service_orders/orders", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        console.log("orders status:", response.status);
        console.log("orders result:", result);

        if (!response.ok) {
          setError(result?.message ?? "Não foi possível carregar as ordens.");
          return;
        }

        setOrders(result);
      } catch (err) {
        setError("Erro ao carregar ordens de serviço.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const metrics = useMemo(() => {
    const uniqueClients = new Set(orders.map((o) => o.client.name)).size;
    const uniqueCars = new Set(orders.map((o) => o.car.plate)).size;

    const today = new Date().toDateString();
    const createdToday = orders.filter(
      (o) => new Date(o.created_at).toDateString() === today
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

      <SidebarInset className="bg-[#f6f7fb]">
        <div className="min-h-screen p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <SidebarTrigger className="mt-1" />

                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Bom dia!
                  </h1>
                  <p className="text-sm text-muted-foreground capitalize">
                    {formatShortDate()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Bell className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-500 font-semibold text-black">
                    C
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Carlos Silva</p>
                    <p className="text-xs text-muted-foreground">Dono da oficina</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Button
                className="h-12 w-full rounded-full bg-lime-500 text-black hover:bg-lime-600"
                onClick={() => navigate("/os-client-create")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Ordem de Serviço
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DashboardMetricCard
                title="Ordens abertas"
                value={metrics.open}
                subtitle="Aguardando andamento"
                icon={<Clock3 className="h-5 w-5 text-amber-500" />}
              />
              <DashboardMetricCard
                title="Clientes"
                value={metrics.clients}
                subtitle="Com OS abertas"
                icon={<User className="h-5 w-5 text-blue-500" />}
              />
              <DashboardMetricCard
                title="Veículos"
                value={metrics.cars}
                subtitle="Atualmente em atendimento"
                icon={<Car className="h-5 w-5 text-violet-500" />}
              />
              <DashboardMetricCard
                title="Criadas hoje"
                value={metrics.today}
                subtitle="Ordens abertas hoje"
                icon={<ClipboardList className="h-5 w-5 text-emerald-500" />}
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_0.8fr]">
              <Card className="rounded-3xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">Ordens de Serviço</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Visualize e continue trabalhando nas OS abertas
                  </p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {loading && (
                    <div className="rounded-2xl border bg-background p-6 text-sm text-muted-foreground">
                      Carregando ordens abertas...
                    </div>
                  )}

                  {!loading && error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  {!loading && !error && orders.length === 0 && (
                    <div className="rounded-2xl border bg-background p-6 text-sm text-muted-foreground">
                      Nenhuma ordem de serviço aberta encontrada.
                    </div>
                  )}

                  {!loading &&
                    !error &&
                    orders.map((order) => (
                      <button
                        key={order.service_order_id}
                        onClick={() => navigate(`/os/${order.service_order_id}`)}
                        className="w-full rounded-3xl border bg-white p-5 text-left transition hover:shadow-md"
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
                                {order.car.year} • {order.car.color} • {order.car.plate}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs uppercase text-muted-foreground">
                                Relato
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {order.client_complaint}
                              </p>
                            </div>
                          </div>

                          <div className="flex min-w-[240px] flex-col gap-3">
                            <span
                              className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusPillClass(
                                order.status
                              )}`}
                            >
                              {formatStatus(order.status)}
                            </span>

                            <div className="rounded-2xl bg-muted/50 p-3 text-sm">
                              <p className="font-medium">KM entrada</p>
                              <p className="text-muted-foreground">
                                {order.car.mileage_in.toLocaleString("pt-BR")}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-muted/50 p-3 text-sm">
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
                                className="w-full bg-lime-400 text-black hover:bg-lime-500"
                                onClick={(e) => {
                                  e.stopPropagation();

                                  if (order.public_url) {
                                    window.open(order.public_url, "_blank");
                                    return;
                                  }

                                  if (order.public_token) {
                                    window.open(
                                      `http://localhost:5173/servico/${order.public_token}`,
                                      "_blank"
                                    );
                                  }
                                }}
                              >
                                Ver página do cliente
                              </Button>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="rounded-3xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl">Equipe hoje</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {["Carlos", "Lucas", "Pedro"].map((name, index) => (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded-2xl bg-muted/40 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-500 font-semibold text-black">
                            {name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{name}</p>
                            <p className="text-xs text-muted-foreground">
                              {index === 0 ? "4 ordens ativas" : "2 ordens ativas"}
                            </p>
                          </div>
                        </div>
                        <span className="h-2.5 w-2.5 rounded-full bg-lime-500" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-0 bg-black text-white shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl">Scanner OBD</CardTitle>
                    <span className="inline-flex items-center rounded-full bg-lime-500/20 px-3 py-1 text-xs text-lime-300">
                      Online
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-white/80">
                    <div className="flex justify-between">
                      <span>Dispositivo</span>
                      <span className="font-medium text-white">OficinaSync-OBD</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Conexão</span>
                      <span className="font-medium text-white">Wi-Fi</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bluetooth</span>
                      <span className="font-medium text-white">ELM327</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Última leitura</span>
                      <span className="font-medium text-white">há 4 min</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl">Acesso rápido</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <button className="rounded-2xl bg-blue-50 p-4 text-left transition hover:bg-blue-100">
                      <p className="font-medium text-blue-700">Clientes</p>
                      <p className="mt-1 text-xs text-blue-600">
                        Gerenciar cadastro
                      </p>
                    </button>

                    <button className="rounded-2xl bg-amber-50 p-4 text-left transition hover:bg-amber-100">
                      <p className="font-medium text-amber-700">Veículos</p>
                      <p className="mt-1 text-xs text-amber-600">
                        Histórico e consulta
                      </p>
                    </button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </>
  );
}