import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FieldShell } from "@/components/fields/FieldShell";
import { PhoneField } from "@/components/fields/PhoneField";
import { CpfField } from "@/components/fields/CpfField";
import { apiFetch } from "@/lib/api";
import { onlyDigits } from "@/lib/validators";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export type EditableClient = {
  client_id: number;
  name: string;
  phone: string;
  cpf: string;
  email: string;
  address: string;
};

type EditClientSheetProps = {
  client: EditableClient | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

export function EditClientSheet({ client, onClose, onSaved }: EditClientSheetProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!client) return;
    setName(client.name);
    setPhone(client.phone);
    setCpf(client.cpf);
    setEmail(client.email);
    setAddress(client.address);
  }, [client]);

  const submit = async () => {
    if (!client) return;

    try {
      setSaving(true);
      await apiFetch(`/clients/${client.client_id}`, {
        method: "PATCH",
        json: {
          name: name.trim(),
          phone,
          cpf: onlyDigits(cpf),
          email: email.trim(),
          address: address.trim(),
        },
      });
      toast.success("Cliente atualizado!");
      onClose();
      await onSaved();
    } catch {
      // apiFetch já mostrou o toast de erro
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={client !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Editar cliente</SheetTitle>
          <SheetDescription>Corrija os dados de contato do cliente.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-8">
          <FieldShell label="Nome completo" htmlFor="edit-name">
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </FieldShell>

          <PhoneField value={phone} onChange={setPhone} />
          <CpfField value={cpf} onChange={setCpf} />

          <FieldShell label="Email" htmlFor="edit-email">
            <input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </FieldShell>

          <FieldShell label="Endereço" htmlFor="edit-address">
            <input
              id="edit-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass}
            />
          </FieldShell>

          <div className="flex gap-2 pt-2">
            <Button
              className="h-11 flex-1 bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={submit}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
            <Button className="h-11" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
