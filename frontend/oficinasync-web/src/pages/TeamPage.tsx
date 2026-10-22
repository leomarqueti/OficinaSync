import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2, MessageCircle, UserPlus, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { BigButton, fieldClass } from "@/components/kit";
import { PhoneField } from "@/components/fields/PhoneField";
import { apiFetch } from "@/lib/api";
import { useDarkTheme } from "@/hooks/useDarkTheme";
import { formatPhone, e164ToDigits, isValidPhone } from "@/lib/validators";
import { whatsappInviteUrl } from "@/lib/whatsapp";
import { useMe } from "@/lib/me";

type Invite = {
  id: number;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
};

type Member = {
  user_id: number;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
};

type InviteLink = { message: string; link: string; qr_data_url: string; expires_at: string; email_sent?: boolean };

/** O que a folha de acesso mostra depois de gerar o link. */
type AccessResult = InviteLink & { name: string; phone: string | null; byEmail: boolean };

const roleLabels: Record<string, string> = {
  owner: "Dono",
  mechanic: "Mecânico",
  receptionist: "Recepcionista",
};

function inviteStatus(invite: Invite) {
  if (invite.used_at) return { label: "Aceito", className: "text-brand" };
  if (new Date(invite.expires_at) < new Date()) return { label: "Expirado", className: "text-red-400" };
  return { label: "Pendente", className: "text-amber-400" };
}

const contactOf = (c: { phone: string | null; email: string | null }) =>
  c.phone ? formatPhone(e164ToDigits(c.phone)) : (c.email ?? "");

/**
 * Equipe (só o dono): cadastrar funcionário pelo CELULAR (link de uso único pelo WhatsApp/QR, ele cria
 * um PIN — não precisa de e-mail), mandar "novo acesso" pra quem esqueceu o PIN e desativar quem saiu.
 */
export function TeamPage() {
  useDarkTheme();
  const { me } = useMe();

  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("mechanic");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<AccessResult | null>(null);
  const [toggle, setToggle] = useState<Member | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [m, i] = await Promise.all([
        apiFetch<Member[]>("/users/members", { silent: true }).catch(() => []),
        apiFetch<Invite[]>("/invites", { silent: true }).catch(() => []),
      ]);
      setMembers(m);
      setInvites(i);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const closeForm = () => {
    setFormOpen(false);
    setResult(null);
    setName("");
    setPhone("");
    setEmail("");
    setRole("mechanic");
  };

  const phoneOk = isValidPhone(e164ToDigits(phone));
  const canSend = name.trim().length >= 2 && (phoneOk || /\S+@\S+\.\S+/.test(email));
  const sendHint = !name.trim() ? "Falta o nome." : !phoneOk && !email ? "Falta o celular." : undefined;

  const createAccess = async () => {
    try {
      setSending(true);
      const byEmail = !phoneOk;
      const res = await apiFetch<InviteLink>("/invites", {
        method: "POST",
        json: byEmail ? { name: name.trim(), email: email.trim(), role } : { name: name.trim(), phone, role },
      });
      setResult({ ...res, name: name.trim(), phone: byEmail ? null : phone, byEmail });
      void load();
    } catch {
      // apiFetch já mostrou o erro (ex.: celular já cadastrado)
    } finally {
      setSending(false);
    }
  };

  const newAccess = async (m: Member) => {
    try {
      const res = await apiFetch<InviteLink>("/invites/access-link", { method: "POST", json: { user_id: m.user_id } });
      setResult({ ...res, name: m.name, phone: m.phone, byEmail: false });
      setFormOpen(true);
    } catch {
      // apiFetch já mostrou o erro
    }
  };

  const runToggle = async () => {
    if (!toggle) return;
    try {
      setToggling(true);
      await apiFetch(`/users/${toggle.user_id}/active`, { method: "PATCH", json: { active: !toggle.is_active } });
      toast.success(toggle.is_active ? `${toggle.name} não entra mais no sistema.` : `${toggle.name} voltou a ter acesso.`);
      setToggle(null);
      await load();
    } catch {
      // apiFetch já mostrou o erro
    } finally {
      setToggling(false);
    }
  };

  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não deu pra copiar automático", { description: link, duration: 15000 });
    }
  };

  const tenantName = me?.tenant_name ?? "oficina";
  const pendingInvites = invites.filter((i) => !i.used_at);

  return (
    <div className="min-h-full p-4 text-foreground md:p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-3xl">Equipe</h1>
          <p className="text-sm text-muted-foreground">Cadastre pelo celular: o funcionário não precisa de e-mail.</p>
        </div>

        <BigButton icon={<UserPlus />} onClick={() => setFormOpen(true)}>
          Adicionar funcionário
        </BigButton>

        <section className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-brand" aria-hidden="true" />
            <h2 className="text-lg">Funcionários</h2>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {members.map((m) => (
                <li key={m.user_id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {m.name}{" "}
                      {!m.is_active && (
                        <span className="ml-1 rounded-full border border-red-400/40 bg-red-400/10 px-2 py-0.5 text-xs text-red-300">
                          Desativado
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {roleLabels[m.role] ?? m.role} · {contactOf(m)}
                    </p>
                  </div>
                  {m.role !== "owner" && (
                    <div className="flex gap-2">
                      {m.is_active && m.phone && (
                        <Button variant="outline" className="h-11" onClick={() => newAccess(m)}>
                          <KeyRound className="mr-1.5 h-4 w-4" aria-hidden="true" />
                          Novo acesso
                        </Button>
                      )}
                      <Button variant="outline" className="h-11" onClick={() => setToggle(m)}>
                        {m.is_active ? "Desativar" : "Reativar"}
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {pendingInvites.length > 0 && (
          <section className="rounded-3xl border border-border bg-card p-5">
            <h2 className="text-lg">Convites esperando</h2>
            <div className="mt-3 flex flex-col gap-2">
              {pendingInvites.map((invite) => {
                const status = inviteStatus(invite);
                return (
                  <div key={invite.id} className="flex items-center justify-between rounded-2xl bg-white/[0.04] p-3">
                    <div>
                      <p className="text-sm font-medium">{invite.name ?? contactOf(invite)}</p>
                      <p className="text-xs text-muted-foreground">
                        {roleLabels[invite.role] ?? invite.role} · {contactOf(invite)}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold ${status.className}`}>{status.label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <Sheet open={formOpen} onOpenChange={(o) => !o && closeForm()}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl">
          {!result ? (
            <>
              <SheetHeader>
                <SheetTitle>Adicionar funcionário</SheetTitle>
                <SheetDescription>Ele recebe um link no WhatsApp e cria um PIN de 6 números pra entrar.</SheetDescription>
              </SheetHeader>
              <form
                className="flex flex-col gap-4 px-4 pb-8"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (canSend) void createAccess();
                }}
              >
                <div className="flex flex-col gap-2">
                  <label htmlFor="member-name" className="text-sm font-medium">
                    Nome
                  </label>
                  <input id="member-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Toninho" className={fieldClass} />
                </div>
                <PhoneField value={phone} onChange={setPhone} label="Celular (WhatsApp)" />
                <div className="flex flex-col gap-2">
                  <label htmlFor="member-role" className="text-sm font-medium">
                    Cargo
                  </label>
                  <select id="member-role" value={role} onChange={(e) => setRole(e.target.value)} className={fieldClass}>
                    <option value="mechanic">Mecânico</option>
                    <option value="receptionist">Recepcionista</option>
                  </select>
                </div>
                <details className="text-sm text-muted-foreground">
                  <summary className="min-h-11 cursor-pointer py-2">Não tem WhatsApp? Mandar por e-mail</summary>
                  <input
                    aria-label="E-mail (opcional)"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="funcionario@email.com"
                    className={fieldClass}
                  />
                </details>
                <BigButton type="submit" disabled={!canSend || sending} hint={sendHint}>
                  {sending && <Loader2 className="animate-spin" aria-hidden="true" />}
                  Gerar acesso
                </BigButton>
              </form>
            </>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>Mande o acesso pro {result.name.split(" ")[0]}</SheetTitle>
                <SheetDescription>
                  {result.byEmail
                    ? result.message
                    : "Ele toca no link, cria o PIN e já entra. O link só funciona uma vez."}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col items-center gap-4 px-4 pb-8">
                {result.phone && (
                  <a
                    href={whatsappInviteUrl(result.phone, result.name, tenantName, result.link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand font-display text-xl font-extrabold uppercase text-brand-foreground"
                  >
                    <MessageCircle className="h-6 w-6" aria-hidden="true" />
                    Mandar no WhatsApp
                  </a>
                )}
                <img src={result.qr_data_url} alt="QR code do convite" className="h-56 w-56 rounded-2xl bg-white p-2" />
                <p className="text-center text-sm text-muted-foreground">
                  Ou ele aponta a câmera do celular pro QR. {result.byEmail ? "Vale por 7 dias." : "Vale por 24 horas."}
                </p>
                <Button variant="outline" className="h-12 w-full" onClick={() => copy(result.link)}>
                  <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Copiar link
                </Button>
                <Button variant="ghost" className="h-12 w-full" onClick={closeForm}>
                  Pronto
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={toggle !== null} onOpenChange={(o) => !o && setToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toggle?.is_active ? `Desativar ${toggle?.name}?` : `Reativar ${toggle?.name}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {toggle?.is_active
                ? "Ele sai do sistema na hora e não entra mais. O que ele registrou continua com o nome dele."
                : "Ele volta a entrar com o mesmo celular e PIN."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggling}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={toggling}
              onClick={(e) => {
                e.preventDefault();
                void runToggle();
              }}
            >
              {toggle?.is_active ? "Desativar" : "Reativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
