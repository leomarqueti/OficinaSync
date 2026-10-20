// Textos reserva para OS aberta no modo rápido: cliente e carro podem não ter dados ainda.

export const NO_CLIENT_LABEL = "Cliente não identificado";

export function clientLabel(name?: string | null): string {
  return name?.trim() || NO_CLIENT_LABEL;
}

export function carTitle(car: { brand?: string | null; model?: string | null }): string {
  return [car.brand, car.model].filter(Boolean).join(" ") || "Veículo sem modelo informado";
}

export function carDetails(car: {
  year?: number | null;
  color?: string | null;
  plate?: string | null;
}): string {
  return [car.year, car.color, car.plate].filter(Boolean).join(" · ");
}

export function kmLabel(km?: number | null): string {
  return km == null ? "KM não informado" : `${km.toLocaleString("pt-BR")} km`;
}

const HONORIFICS = /^(sr|sra|srta|dr|dra|d|seu|dona)\.?$/i;

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function greeting(name?: string | null): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return "Olá!";
  // "Sr. Antônio" → "Olá, Sr. Antônio." (antes saía "Olá, Sr..")
  if (HONORIFICS.test(words[0])) {
    if (words.length < 2) return "Olá!";
    return `Olá, ${capitalize(words[0])} ${capitalize(words[1])}.`;
  }
  return `Olá, ${capitalize(words[0])}.`;
}
