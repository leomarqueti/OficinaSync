import { Car, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ActionTile, PageHeader, StatusChip } from "@/components/kit";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Skeleton } from "@/components/ui/skeleton";
import { carDetails, carTitle } from "@/lib/display";

export type SimpleOrder = {
  service_order_id: number;
  photo_url: string | null;
  is_complete?: boolean;
  car: { brand: string | null; model: string | null; year: number | null; color: string | null; plate: string };
};

function greetingByHour(): string {
  const hour = new Date().getHours();
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

/** Início do modo simples: saudação, 2 atalhos grandes e os carros abertos em cartões grandes. */
export function SimpleHome({ orders, loading, userName }: { orders: SimpleOrder[]; loading: boolean; userName?: string }) {
  const navigate = useNavigate();
  const first = userName?.trim().split(/\s+/)[0];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 pt-5">
      <PageHeader
        title={`${greetingByHour()}${first ? `, ${first}` : ""}`}
        subtitle={
          loading
            ? "Carregando os carros..."
            : `${orders.length} ${orders.length === 1 ? "carro aberto" : "carros abertos"} na oficina`
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <ActionTile tone="brand" icon={<Plus />} label="Carro novo" onClick={() => navigate("/os-client-create")} />
        <ActionTile icon={<Search />} label="Buscar" onClick={() => navigate("/veiculos")} />
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : orders.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-base text-white/80">
          Nenhum carro aberto. Toque em <b className="text-brand">Carro novo</b> pra começar.
        </p>
      ) : (
        <Stagger className="flex flex-col gap-3">
          {orders.map((order) => (
            <StaggerItem key={order.service_order_id}>
              <button
                type="button"
                aria-label={`OS ${order.service_order_id}: ${carTitle(order.car)}`}
                onClick={() => navigate(`/os/${order.service_order_id}`)}
                className="flex min-h-24 w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-left transition-transform active:scale-[0.98]"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.06]">
                  {order.photo_url ? (
                    <img
                      src={order.photo_url}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  ) : (
                    <Car className="h-8 w-8 text-white/60" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xl font-extrabold uppercase leading-tight">{carTitle(order.car)}</p>
                  <p className="truncate text-sm text-white/70">{carDetails(order.car)}</p>
                  <div className="mt-1.5">
                    {order.is_complete === false ? (
                      <StatusChip tone="alert">Dados pendentes</StatusChip>
                    ) : (
                      <StatusChip tone="ok">Em andamento</StatusChip>
                    )}
                  </div>
                </div>
                <span aria-hidden="true" className="text-3xl text-white/60">
                  ›
                </span>
              </button>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
