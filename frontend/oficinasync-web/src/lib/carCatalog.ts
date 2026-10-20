// Catálogo da abertura guiada: modelos por marca (os mais comuns na frota brasileira primeiro),
// anos, cores e combustíveis. Lista própria, sem API externa — "Não achei" cobre o resto.
import type { CAR_BRANDS } from "./carBrands";

type Brand = (typeof CAR_BRANDS)[number];

export const MODELS_BY_BRAND: Record<Brand, readonly string[]> = {
  Chevrolet: ["Onix", "Celta", "Corsa", "Prisma", "Classic", "Cobalt", "Spin", "S10", "Tracker", "Cruze", "Montana", "Agile", "Astra", "Vectra", "Meriva", "Captiva"],
  Volkswagen: ["Gol", "Voyage", "Fox", "Polo", "Saveiro", "Up!", "T-Cross", "Virtus", "Nivus", "Jetta", "Amarok", "Golf", "Parati", "Kombi", "SpaceFox", "Taos"],
  Fiat: ["Uno", "Palio", "Strada", "Siena", "Mobi", "Argo", "Toro", "Cronos", "Pulse", "Fastback", "Fiorino", "Doblò", "Punto", "Idea", "Grand Siena", "Weekend"],
  Ford: ["Ka", "Fiesta", "EcoSport", "Focus", "Ranger", "Courier", "Fusion", "Escort", "Territory", "Maverick", "Bronco Sport"],
  Toyota: ["Corolla", "Hilux", "Etios", "Yaris", "SW4", "Corolla Cross", "RAV4", "Prius"],
  Honda: ["Civic", "Fit", "City", "HR-V", "WR-V", "CR-V", "Accord"],
  Hyundai: ["HB20", "HB20S", "Creta", "Tucson", "ix35", "i30", "Azera", "Santa Fe"],
  Renault: ["Sandero", "Logan", "Kwid", "Duster", "Clio", "Captur", "Oroch", "Stepway", "Fluence", "Symbol", "Master"],
  Nissan: ["March", "Versa", "Kicks", "Frontier", "Sentra", "Livina", "Tiida"],
  Jeep: ["Renegade", "Compass", "Commander", "Wrangler", "Cherokee"],
  Peugeot: ["208", "207", "2008", "206", "308", "3008", "Partner", "Boxer"],
  "Citroën": ["C3", "C4 Cactus", "C4", "Aircross", "C3 Aircross", "Xsara Picasso", "Jumper"],
  Mitsubishi: ["L200", "Pajero", "ASX", "Outlander", "Eclipse Cross", "Lancer"],
  Kia: ["Sportage", "Cerato", "Picanto", "Soul", "Sorento", "Stonic"],
  BMW: ["Série 3", "Série 1", "X1", "X3", "Série 5", "X5"],
  "Mercedes-Benz": ["Classe C", "Classe A", "GLA", "Sprinter", "Classe E", "GLC"],
  Audi: ["A3", "A4", "Q3", "Q5", "A5", "A1"],
  "Land Rover": ["Evoque", "Discovery Sport", "Defender", "Freelander", "Discovery"],
  Volvo: ["XC60", "XC40", "XC90", "S60", "V40"],
  "Caoa Chery": ["Tiggo 5x", "Tiggo 7", "Tiggo 8", "Tiggo 2", "Arrizo 6", "QQ"],
  BYD: ["Dolphin", "Song Plus", "Yuan Plus", "Seal", "Dolphin Mini", "King"],
  RAM: ["Rampage", "1500", "2500", "3500"],
  Suzuki: ["Jimny", "Vitara", "S-Cross", "Swift", "Grand Vitara"],
};

/** Modelos da marca escolhida; marca fora da lista ("Outra") devolve vazio. */
export function modelsFor(brand: string): readonly string[] {
  return (MODELS_BY_BRAND as Record<string, readonly string[]>)[brand] ?? [];
}

/** Do ano que vem (modelo lançado antes) até 1980, do mais novo pro mais velho. */
export function yearOptions(now: Date = new Date()): number[] {
  const newest = now.getFullYear() + 1;
  return Array.from({ length: newest - 1980 + 1 }, (_, i) => newest - i);
}

export const COMMON_COLORS: { name: string; hex: string }[] = [
  { name: "Branco", hex: "#f5f5f5" },
  { name: "Prata", hex: "#a8adb3" },
  { name: "Preto", hex: "#111111" },
  { name: "Cinza", hex: "#5b6168" },
  { name: "Vermelho", hex: "#b91c1c" },
  { name: "Azul", hex: "#1d4ed8" },
  { name: "Bege", hex: "#c8b28a" },
  { name: "Verde", hex: "#15803d" },
  { name: "Amarelo", hex: "#eab308" },
];

/** Exatamente os valores do enum FuelType do backend. */
export const FUEL_OPTIONS: { value: "flex" | "gasolina" | "diesel" | "eletrico"; label: string }[] = [
  { value: "flex", label: "Flex" },
  { value: "gasolina", label: "Gasolina" },
  { value: "diesel", label: "Diesel" },
  { value: "eletrico", label: "Elétrico" },
];
