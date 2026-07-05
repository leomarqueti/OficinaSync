import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { PasswordStrength } from "@/components/fields/PasswordStrength";
import { apiFetch } from "@/lib/api";
import { isStrongPassword } from "@/lib/validators";
import { useDarkTheme } from "@/hooks/useDarkTheme";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function SettingsPage() {
  useDarkTheme();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit =
    currentPassword.length > 0 && isStrongPassword(newPassword) && passwordsMatch;

  const submit = async () => {
    if (!canSubmit) return;

    try {
      setLoading(true);
      await apiFetch("/users/me/password", {
        method: "PATCH",
        json: { current_password: currentPassword, new_password: newPassword },
      });
      toast.success("Senha atualizada com sucesso.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      // apiFetch já mostrou o toast de erro
    } finally {
      setLoading(false);
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
                <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie sua conta e preferências
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-brand" />
                <h2 className="text-lg font-semibold">Trocar senha</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Escolha uma senha forte e diferente das anteriores.
              </p>

              <form
                className="mt-6 flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <div className="flex flex-col gap-2">
                  <label htmlFor="current" className="text-sm font-medium">
                    Senha atual
                  </label>
                  <input
                    id="current"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="new" className="text-sm font-medium">
                    Nova senha
                  </label>
                  <input
                    id="new"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                  />
                  <PasswordStrength password={newPassword} />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="confirm" className="text-sm font-medium">
                    Confirmar nova senha
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                  />
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-xs text-red-400">As senhas não coincidem.</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="h-11 w-fit bg-brand text-brand-foreground hover:bg-brand/90"
                  disabled={loading || !canSubmit}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Salvando..." : "Salvar nova senha"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </SidebarInset>
    </>
  );
}
