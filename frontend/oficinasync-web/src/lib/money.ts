/**
 * Valor digitado no formato brasileiro → número. Aceita "R$", espaços, milhar com ponto e
 * centavos com vírgula: "1.200" → 1200, "1.200,50" → 1200.5, "25,5" → 25.5, "12.5" → 12.5.
 * Devolve null (nunca NaN) para vazio, lixo ou negativo — quem chama decide o que fazer.
 */
export function parseMoneyBR(raw: string): number | null {
  const text = raw.replace(/R\$/gi, "").replace(/\s/g, "");
  if (text === "") return null;

  let normalized: string;
  if (text.includes(",")) {
    // vírgula = decimal; pontos antes dela são milhar
    if ((text.match(/,/g) ?? []).length > 1) return null;
    normalized = text.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    // só pontos em grupos de 3 dígitos: milhar ("1.200", "1.234.567")
    normalized = text.replace(/\./g, "");
  } else {
    normalized = text;
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
