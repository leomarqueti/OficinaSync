import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, UserPlus } from "lucide-react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useDarkTheme } from "@/hooks/useDarkTheme";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Invite = {
  id: number;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
};

const roleLabels: Record<string, string> = {
  mechanic: "Mecânico",
  receptionist: "Recepcionista",
};

function inviteStatus(invite: Invite) {
  if (invite.used_at) return { label: "Aceito", className: "text-brand" };
  if (new Date(invite.expires_at) < new Date())
    return { label: "Expirado", className: "text-red-400" };
  return { label: "Pendente", className: "text-amber-400" };
}

export function TeamPage() {
  useDarkTheme();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("mechanic");
  const [sending, setSending] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInvites = async () => {
    try {
      setLoading(true);
      const result = await apiFetch<Invite[]>("/invites", { silent: true });
      setInvites(result);
    } catch {
      // silencioso — não é crítico exibir erro aqui
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, []);

  const sendInvite = async () => {
    if (!email) return;

    try {
      setSending(true);
      await apiFetch("/invites", {
        method: "POST",
        json: { email, role },
      });
      toast.success("Convite enviado!");
      setEmail("");
      await loadInvites();
    } catch {
      // apiFetch já mostrou o toast de erro
    } finally {
      setSending(false);
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
                <h1 className="text-2xl font-bold tracking-tight">Equipe</h1>
                <p className="text-sm text-muted-foreground">
                  Convide mecânicos e recepcionistas pra sua oficina
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-brand" />
                <h2 className="text-lg font-semibold">Convidar novo membro</h2>
              </div>

              <form
                className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendInvite();
                }}
              >
                <div className="flex flex-1 flex-col gap-2">
                  <label htmlFor="invite-email" className="text-sm font-medium">
                    Email
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    placeholder="funcionario@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="invite-role" className="text-sm font-medium">
                    Cargo
                  </label>
                  <select
                    id="invite-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className={inputClass}
                  >
                    <option value="mechanic">Mecânico</option>
                    <option value="receptionist">Recepcionista</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  className="h-11 bg-brand text-brand-foreground hover:bg-brand/90"
                  disabled={sending || !email}
                >
                  {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar convite
                </Button>
              </form>
            </div>

            <div className="mt-6 rounded-3xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Convites enviados</h2>
              </div>

              <div className="mt-4 space-y-2">
                {loading && (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                )}

                {!loading && invites.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum convite enviado ainda.
                  </p>
                )}

                {!loading &&
                  invites.map((invite) => {
                    const status = inviteStatus(invite);
                    return (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between rounded-2xl bg-muted/20 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">{invite.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {roleLabels[invite.role] ?? invite.role}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </>
  );
}
