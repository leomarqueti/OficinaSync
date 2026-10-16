import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
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
import { YearField } from "@/components/fields/YearField";
import { KmField } from "@/components/fields/KmField";
import { ApiError, apiFetch } from "@/lib/api";
import { useDarkTheme } from "@/hooks/useDarkTheme";
import { onlyDigits } from "@/lib/validators";
import type { MissingData, MissingItem, OrderClient } from "./types";

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const fuelOptions = [
  { value: "flex", label: "Flex" },
  { value: "gasolina", label: "Gasolina" },
  { value: "diesel", label: "Diesel" },
  { value: "eletrico", label: "Elétrico" },
];

type ExistingClient = { client_id: number; name: string; cpf: string | null };
type Conflict = { client_id: number; name: string };

type CompleteDataSheetProps = {
  orderId: number;
  open: boolean;
  missing: MissingData;
  currentClient: OrderClient | null;
  onClose: () => void;
  onCompleted: () => Promise<void> | void;
};

const needs = (items: MissingItem[], field: string) =>
  items.some((i) => i.field === field);

/** Mostra só os campos que faltam e salva tudo de uma vez (PATCH /service_orders/:id/complete-data). */
export function CompleteDataSheet({
  orderId,
  open,
  missing,
  currentClient,
  onClose,
  onCompleted,
}: CompleteDataSheetProps) {
  useDarkTheme();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [address, setAddress] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [color, setColor] = useState("");
  const [chassis, setChassis] = useState("");
  const [mileageIn, setMileageIn] = useState("");

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ExistingClient[]>([]);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setPhone("");
    setCpf("");
    setAddress("");
    setBrand("");
    setModel("");
    setYear("");
    setFuelType("");
    setColor("");
    setChassis("");
    setMileageIn("");
    setSearch("");
    setResults([]);
    setConflict(null);
  }, [open, orderId]);

  // busca de cliente já cadastrado (só quando a OS ainda não tem cliente)
  useEffect(() => {
    const term = search.trim();
    if (!open || currentClient || term.length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        setResults(
          await apiFetch<ExistingClient[]>(
            `/clients?search=${encodeURIComponent(term)}`,
            { silent: true },
          ),
        );
      } catch {
        setResults([]);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [search, open, currentClient]);

  const send = async (payload: Record<string, unknown>) => {
    try {
      setSaving(true);
      setConflict(null);
      await apiFetch(`/service_orders/${orderId}/complete-data`, {
        method: "PATCH",
        json: payload,
        silent: true,
      });
      toast.success("Dados salvos!");
      onClose();
      await onCompleted();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as { existing_client?: Conflict } | null;
        if (body?.existing_client) {
          setConflict(body.existing_client);
          return;
        }
      }
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const carPayload = () => {
    const car: Record<string, unknown> = {};
    if (needs(missing.car, "brand") && brand.trim()) car.brand = brand.trim();
    if (needs(missing.car, "model") && model.trim()) car.model = model.trim();
    if (needs(missing.car, "year") && year) car.year = Number(year);
    if (needs(missing.car, "fuel_type") && fuelType) car.fuel_type = fuelType;
    if (needs(missing.car, "color") && color.trim()) car.color = color.trim();
    if (needs(missing.car, "chassis") && chassis.trim()) {
      car.chassis = chassis.trim().toUpperCase();
    }
    if (needs(missing.car, "mileage_in") && mileageIn) {
      car.mileage_in = Number(mileageIn);
    }
    return car;
  };

  const clientPayload = () => {
    const client: Record<string, unknown> = {};
    if (needs(missing.client, "name") && name.trim()) client.name = name.trim();
    if (needs(missing.client, "phone") && phone) client.phone = phone;
    if (needs(missing.client, "cpf") && cpf) client.cpf = onlyDigits(cpf);
    if (needs(missing.client, "address") && address.trim()) {
      client.address = address.trim();
    }
    return client;
  };

  const submit = () => {
    const car = carPayload();
    const client = clientPayload();
    send({
      ...(Object.keys(client).length > 0 ? { client } : {}),
      ...(Object.keys(car).length > 0 ? { car } : {}),
    });
  };

  const linkExistingClient = (clientId: number) => {
    const car = carPayload();
    send({
      client_id: clientId,
      ...(Object.keys(car).length > 0 ? { car } : {}),
    });
  };

  const labels = [...missing.client, ...missing.car].map((i) => i.label).join(", ");

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Completar dados</SheetTitle>
          <SheetDescription>
            Falta: {labels || "nada"}. Preencha o que tiver agora; o resto continua pendente.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-8">
          {missing.client.length > 0 && (
            <div className="space-y-4 rounded-2xl border border-border p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Cliente
              </p>

              {!currentClient && (
                <div className="space-y-2">
                  <FieldShell label="Já é cliente? Buscar cadastro" htmlFor="cd-search" optional>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="cd-search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Nome ou CPF..."
                        className={`${inputClass} pl-9`}
                      />
                    </div>
                  </FieldShell>
                  {results.map((c) => (
                    <button
                      key={c.client_id}
                      type="button"
                      onClick={() => linkExistingClient(c.client_id)}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/20 p-3 text-left text-sm hover:bg-muted/40"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-brand">usar este cadastro</span>
                    </button>
                  ))}
                </div>
              )}

              {needs(missing.client, "name") && (
                <FieldShell label="Nome do cliente" htmlFor="cd-client-name">
                  <input
                    id="cd-client-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                  />
                </FieldShell>
              )}
              {needs(missing.client, "phone") && <PhoneField value={phone} onChange={setPhone} />}
              {needs(missing.client, "cpf") && <CpfField value={cpf} onChange={setCpf} />}
              {needs(missing.client, "address") && (
                <FieldShell label="Endereço" htmlFor="cd-client-address">
                  <input
                    id="cd-client-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, número, bairro"
                    className={inputClass}
                  />
                </FieldShell>
              )}

              {conflict && (
                <div className="space-y-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm">
                  <p>
                    Já existe um cliente com esse CPF: <strong>{conflict.name}</strong>.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full"
                    disabled={saving}
                    onClick={() => linkExistingClient(conflict.client_id)}
                  >
                    Usar o cadastro de {conflict.name}
                  </Button>
                </div>
              )}
            </div>
          )}

          {missing.car.length > 0 && (
            <div className="space-y-4 rounded-2xl border border-border p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Veículo
              </p>
              {needs(missing.car, "brand") && (
                <FieldShell label="Marca" htmlFor="cd-brand">
                  <input
                    id="cd-brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className={inputClass}
                  />
                </FieldShell>
              )}
              {needs(missing.car, "model") && (
                <FieldShell label="Modelo" htmlFor="cd-model">
                  <input
                    id="cd-model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className={inputClass}
                  />
                </FieldShell>
              )}
              {needs(missing.car, "year") && <YearField value={year} onChange={setYear} />}
              {needs(missing.car, "fuel_type") && (
                <FieldShell label="Combustível" htmlFor="cd-fuel">
                  <select
                    id="cd-fuel"
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Selecione...</option>
                    {fuelOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </FieldShell>
              )}
              {needs(missing.car, "color") && (
                <FieldShell label="Cor" htmlFor="cd-color">
                  <input
                    id="cd-color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className={inputClass}
                  />
                </FieldShell>
              )}
              {needs(missing.car, "chassis") && (
                <FieldShell label="Chassi" htmlFor="cd-chassis">
                  <input
                    id="cd-chassis"
                    value={chassis}
                    onChange={(e) => setChassis(e.target.value.toUpperCase())}
                    className={`${inputClass} uppercase`}
                  />
                </FieldShell>
              )}
              {needs(missing.car, "mileage_in") && (
                <KmField value={mileageIn} onChange={setMileageIn} />
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              className="h-11 flex-1 bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={submit}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar dados
            </Button>
            <Button className="h-11" variant="outline" onClick={onClose} disabled={saving}>
              Agora não
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
