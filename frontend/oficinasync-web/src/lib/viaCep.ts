export type ViaCepResult = {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
};

/** Busca endereço por CEP via ViaCEP (API pública, sem chave). Retorna null se o CEP não existir ou a busca falhar. */
export async function fetchAddressByCep(cep: string): Promise<ViaCepResult | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.erro) return null;

    return {
      logradouro: data.logradouro ?? "",
      bairro: data.bairro ?? "",
      localidade: data.localidade ?? "",
      uf: data.uf ?? "",
    };
  } catch {
    return null;
  }
}

export function formatCep(digits: string): string {
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}
