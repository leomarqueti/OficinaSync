import { UserCheck, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { CpfField } from "@/components/fields/CpfField";
import { PhoneField } from "@/components/fields/PhoneField";
import { AlertBanner, BigButton, TextField, fieldClass } from "@/components/kit";
import { apiFetch } from "@/lib/api";
import { isValidCpf, onlyDigits } from "@/lib/validators";
import type { StepProps } from "./types";

type FoundClient = { client_id: number; name: string; phone: string | null; cpf: string | null; email: string | null; address: string | null };

const emptyClient = { client_id: null, name: "", phone: "", cpf: "", email: "", address: "" };

/**
 * Tela 8: "O cliente está aqui?". Não → o escritório completa depois (a OS fica no nome do dono do carro,
 * se houver). Sim → confirma o dono, procura um cadastro ou pede nome e telefone.
 */
export function ClientStep({ state, onChange, onNext }: StepProps) {
  const owner = state.match?.owner ?? null;
  const [askOwner, setAskOwner] = useState(owner !== null && state.client.client_id === owner.client_id);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<FoundClient[]>([]);
  const [cpfOwner, setCpfOwner] = useState<FoundClient | null>(null);
  const c = state.client;

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      apiFetch<FoundClient[]>(`/clients?search=${encodeURIComponent(term)}`, { silent: true })
        .then(setResults)
        .catch(() => setResults([]));
    }, 350);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    const digits = onlyDigits(c.cpf);
    if (c.client_id !== null || !isValidCpf(digits)) {
      setCpfOwner(null);
      return;
    }
    let alive = true;
    apiFetch<FoundClient[]>(`/clients?search=${digits}`, { silent: true })
      .then((found) => alive && setCpfOwner(found.find((f) => onlyDigits(f.cpf ?? "") === digits) ?? null))
      .catch(() => alive && setCpfOwner(null));
    return () => {
      alive = false;
    };
  }, [c.cpf, c.client_id]);

  const pick = (f: FoundClient) => {
    onChange({ client: { client_id: f.client_id, name: f.name, phone: f.phone ?? "", cpf: f.cpf ?? "", email: f.email ?? "", address: f.address ?? "" } });
    setResults([]);
    setSearch("");
  };

  if (state.clientPresent === null) {
    return (
      <div className="flex flex-col gap-3">
        <BigButton size="hero" icon={<UserCheck />} onClick={() => onChange({ clientPresent: true })}>
          Sim, anotar os dados
        </BigButton>
        <BigButton
          size="hero"
          variant="secondary"
          icon={<UserX />}
          onClick={() => {
            onChange({ clientPresent: false, client: owner ? { ...emptyClient, client_id: owner.client_id, name: owner.name } : emptyClient });
            onNext();
          }}
        >
          Não, o escritório completa
        </BigButton>
      </div>
    );
  }

  if (state.clientPresent && askOwner && owner) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xl font-semibold">
          Quem trouxe é o <b className="text-brand">{owner.name}</b>?
        </p>
        <BigButton onClick={onNext}>Sim, é ele</BigButton>
        <BigButton
          variant="secondary"
          onClick={() => {
            setAskOwner(false);
            onChange({ client: emptyClient });
          }}
        >
          Não, é outra pessoa
        </BigButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {c.client_id !== null ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-brand/50 bg-brand/10 p-4">
          <div>
            <p className="text-sm text-white/70">Cliente já cadastrado</p>
            <p className="text-lg font-semibold">{c.name}</p>
          </div>
          <button type="button" className="min-h-11 rounded-xl border border-white/20 px-3 text-sm font-bold" onClick={() => onChange({ client: emptyClient })}>
            Trocar
          </button>
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="client-search" className="mb-2 block text-base font-semibold text-white/80">
              Já é cliente? Procure pelo nome, CPF ou telefone
            </label>
            <input id="client-search" value={search} onChange={(e) => setSearch(e.target.value)} className={fieldClass} />
            {results.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {results.map((f) => (
                  <button key={f.client_id} type="button" onClick={() => pick(f)} className="min-h-12 rounded-xl bg-white/[0.06] px-3 text-left text-base">
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <TextField id="client-name" label="Nome" value={c.name} onChange={(e) => onChange({ client: { ...c, name: e.target.value } })} />
          <PhoneField value={c.phone} onChange={(phone) => onChange({ client: { ...c, phone } })} />
          <CpfField value={c.cpf} onChange={(cpf) => onChange({ client: { ...c, cpf } })} optional />
          {cpfOwner && (
            <AlertBanner actionLabel="Usar esse cadastro" onAction={() => pick(cpfOwner)}>
              Este CPF já é do cliente {cpfOwner.name}.
            </AlertBanner>
          )}
          <TextField
            id="client-address"
            label="Endereço (opcional)"
            value={c.address}
            onChange={(e) => onChange({ client: { ...c, address: e.target.value } })}
          />
        </>
      )}
    </div>
  );
}
