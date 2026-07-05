import { useEffect, useState } from "react";
import { Loader2, Search, User } from "lucide-react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { apiFetch } from "@/lib/api";
import { formatPhone, e164ToDigits } from "@/lib/validators";
import { useDarkTheme } from "@/hooks/useDarkTheme";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Client = {
  client_id: number;
  name: string;
  phone: string;
  cpf: string;
  email: string;
  address: string;
  created_at: string;
};

export function ClientsPage() {
  useDarkTheme();

  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handle = setTimeout(async () => {
      try {
        setLoading(true);
        const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
        const result = await apiFetch<Client[]>(`/clients${query}`, { silent: true });
        setClients(result);
      } catch {
        setClients([]);
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
                <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
                <p className="text-sm text-muted-foreground">
                  Todos os clientes já cadastrados na oficina
                </p>
              </div>
            </div>

            <div className="relative mt-6">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nome, CPF ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={inputClass}
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="mt-4 space-y-2">
              {!loading && clients.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                  {search.trim()
                    ? "Nenhum cliente encontrado."
                    : "Nenhum cliente cadastrado ainda."}
                </div>
              )}

              {clients.map((client) => (
                <div
                  key={client.client_id}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/40">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{client.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {formatPhone(e164ToDigits(client.phone))}
                      {client.cpf && ` · CPF ${client.cpf}`}
                      {client.email && ` · ${client.email}`}
                    </p>
                    {client.address && (
                      <p className="truncate text-xs text-muted-foreground">{client.address}</p>
                    )}
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
