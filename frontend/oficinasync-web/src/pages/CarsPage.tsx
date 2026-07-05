import { useEffect, useState } from "react";
import { Car, Loader2, Search } from "lucide-react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { apiFetch } from "@/lib/api";
import { useDarkTheme } from "@/hooks/useDarkTheme";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type CarItem = {
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

export function CarsPage() {
  useDarkTheme();

  const [search, setSearch] = useState("");
  const [cars, setCars] = useState<CarItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handle = setTimeout(async () => {
      try {
        setLoading(true);
        const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
        const result = await apiFetch<CarItem[]>(`/cars${query}`, { silent: true });
        setCars(result);
      } catch {
        setCars([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [search]);

  return (
    <>
      <DashboardSidebar />

      <SidebarInset className="dark bg-background">
        <div className="min-h-screen p-4 text-foreground md:p-6">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Veículos</h1>
                <p className="text-sm text-muted-foreground">
                  Todos os veículos já cadastrados na oficina
                </p>
              </div>
            </div>

            <div className="relative mt-6">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por placa, marca ou modelo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={inputClass}
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="mt-4 space-y-2">
              {!loading && cars.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                  {search.trim()
                    ? "Nenhum veículo encontrado."
                    : "Nenhum veículo cadastrado ainda."}
                </div>
              )}

              {cars.map((car) => (
                <div
                  key={car.car_id}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/40">
                    <Car className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {car.brand} {car.model} · {car.year}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {car.plate} · {car.color}
                      {car.client_name && ` · dono: ${car.client_name}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SidebarInset>
    </>
  );
}
