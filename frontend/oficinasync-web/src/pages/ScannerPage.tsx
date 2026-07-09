import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Plus, Radio, Trash2 } from "lucide-react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiFetch } from "@/lib/api";
import { useDarkTheme } from "@/hooks/useDarkTheme";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type ObdDevice = {
  device_id: number;
  name: string;
  is_active: boolean;
  online: boolean;
  last_seen_at: string | null;
  last_reading_at: string | null;
  created_at: string;
};

type CreatedDevice = {
  device_id: number;
  name: string;
  device_token: string;
};

export function ScannerPage() {
  useDarkTheme();

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [devices, setDevices] = useState<ObdDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [createdDevice, setCreatedDevice] = useState<CreatedDevice | null>(null);
  const [deletingDevice, setDeletingDevice] = useState<ObdDevice | null>(null);

  const loadDevices = async () => {
    try {
      const result = await apiFetch<ObdDevice[]>("/obd/devices", { silent: true });
      setDevices(result);
    } catch {
      // silencioso — badge fica como estava
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
    // Badge online/offline atualiza sozinho enquanto a página está aberta
    const handle = setInterval(loadDevices, 15000);
    return () => clearInterval(handle);
  }, []);

  const createDevice = async () => {
    if (!name.trim()) return;

    try {
      setCreating(true);
      const created = await apiFetch<CreatedDevice>("/obd/devices", {
        method: "POST",
        json: { name: name.trim() },
      });
      setCreatedDevice(created);
      setName("");
      await loadDevices();
    } catch {
      // apiFetch já mostrou o toast de erro
    } finally {
      setCreating(false);
    }
  };

  const copyToken = async () => {
    if (!createdDevice) return;
    try {
      await navigator.clipboard.writeText(createdDevice.device_token);
      toast.success("Token copiado!");
    } catch {
      toast.error("Não foi possível copiar — selecione e copie manualmente.");
    }
  };

  const deleteDevice = async () => {
    if (!deletingDevice) return;

    try {
      await apiFetch(`/obd/devices/${deletingDevice.device_id}`, {
        method: "DELETE",
      });
      toast.success("Dispositivo removido.");
      setDeletingDevice(null);
      await loadDevices();
    } catch {
      // apiFetch já mostrou o toast de erro
    }
  };

  return (
    <>
      <DashboardSidebar />

      <SidebarInset className="dark bg-background">
        <div className="min-h-screen p-4 text-foreground md:p-6">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Scanner OBD</h1>
                <p className="text-sm text-muted-foreground">
                  Dongles da oficina conectados ao sistema
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-brand" />
                <h2 className="text-lg font-semibold">Cadastrar dispositivo</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Dê um nome pro dongle (ex: "Scanner bancada 1"). O token gerado
                vai configurado no aparelho — ele aparece uma única vez.
              </p>

              <form
                className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  createDevice();
                }}
              >
                <div className="flex flex-1 flex-col gap-2">
                  <label htmlFor="device-name" className="text-sm font-medium">
                    Nome do dispositivo
                  </label>
                  <input
                    id="device-name"
                    type="text"
                    placeholder="Scanner bancada 1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <Button
                  type="submit"
                  className="h-11 bg-brand text-brand-foreground hover:bg-brand/90"
                  disabled={creating || !name.trim()}
                >
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cadastrar
                </Button>
              </form>

              {createdDevice && (
                <div className="mt-4 rounded-2xl border border-brand/30 bg-brand/5 p-4">
                  <p className="text-sm font-semibold text-brand">
                    Token do "{createdDevice.name}" — anote agora, não aparece de novo:
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 overflow-x-auto rounded-lg bg-background px-3 py-2 font-mono text-xs">
                      {createdDevice.device_token}
                    </code>
                    <Button variant="outline" size="sm" onClick={copyToken}>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copiar
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Cole esse token na página de configuração do dongle (setup Wi-Fi do ESP32).
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-3xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Dispositivos</h2>
              </div>

              <div className="mt-4 space-y-2">
                {loading && (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                )}

                {!loading && devices.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum dispositivo cadastrado ainda.
                  </p>
                )}

                {!loading &&
                  devices.map((device) => (
                    <div
                      key={device.device_id}
                      className="flex items-center justify-between rounded-2xl bg-muted/20 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            device.online ? "bg-brand" : "bg-muted-foreground/40"
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium">{device.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {device.online
                              ? "Online agora"
                              : device.last_seen_at
                                ? `Visto por último em ${new Date(device.last_seen_at).toLocaleString("pt-BR")}`
                                : "Nunca conectou"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold ${
                            device.online ? "text-brand" : "text-muted-foreground"
                          }`}
                        >
                          {device.online ? "Online" : "Offline"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => setDeletingDevice(device)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

      <AlertDialog
        open={deletingDevice !== null}
        onOpenChange={(open) => !open && setDeletingDevice(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover "{deletingDevice?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              O token deixa de funcionar na hora — o dongle vai parar de conectar
              até ser cadastrado de novo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={deleteDevice}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
