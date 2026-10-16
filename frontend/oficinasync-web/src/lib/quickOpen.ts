import {
  e164ToDigits,
  isValidCpf,
  isValidPhone,
  isValidPlate,
  isValidYear,
  onlyDigits,
} from "./validators";

// Regras do "modo rápido" do wizard de abertura de OS: o que dá pra deixar em branco
// agora (a pendência é cobrada ao finalizar — quem garante isso é o backend).

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_CHASSIS = 5;

export type QuickClient = {
  name: string;
  /** E.164, como o PhoneField entrega. */
  phone: string;
  /** só dígitos, como o CpfField entrega. */
  cpf: string;
  email: string;
  address: string;
};

export type QuickCar = {
  plate: string;
  brand: string;
  model: string;
  year: string;
  fuelType: string;
  color: string;
  chassis: string;
  mileageIn: string;
};

const blank = (value: string) => value.trim().length === 0;

export function quickClientValid(c: QuickClient): boolean {
  const allBlank =
    blank(c.name) &&
    blank(c.phone) &&
    blank(c.cpf) &&
    blank(c.email) &&
    blank(c.address);
  if (allBlank) return true; // "pular cliente"

  if (c.name.trim().length < 2) return false;
  if (!blank(c.phone) && !isValidPhone(e164ToDigits(c.phone))) return false;
  if (!blank(c.cpf) && !isValidCpf(onlyDigits(c.cpf))) return false;
  if (!blank(c.email) && !EMAIL_REGEX.test(c.email.trim())) return false;
  if (!blank(c.address) && c.address.trim().length < 3) return false;
  return true;
}

export function quickCarValid(c: QuickCar): boolean {
  if (!isValidPlate(c.plate)) return false;
  if (!blank(c.brand) && c.brand.trim().length < 2) return false;
  if (!blank(c.model) && c.model.trim().length < 1) return false;
  if (!blank(c.year) && !isValidYear(c.year)) return false;
  if (!blank(c.color) && c.color.trim().length < 2) return false;
  if (!blank(c.chassis) && c.chassis.trim().length < MIN_CHASSIS) return false;
  return true;
}

export function buildQuickClientPayload(c: QuickClient): Record<string, unknown> | null {
  if (blank(c.name)) return null;

  return {
    name: c.name.trim(),
    ...(blank(c.phone) ? {} : { phone: c.phone }),
    ...(blank(c.cpf) ? {} : { cpf: onlyDigits(c.cpf) }),
    ...(blank(c.email) ? {} : { email: c.email.trim() }),
    ...(blank(c.address) ? {} : { address: c.address.trim() }),
  };
}

export function buildQuickCarPayload(
  c: QuickCar,
  clientId: number | null,
): Record<string, unknown> {
  return {
    plate: c.plate.toUpperCase().replace(/[^A-Z0-9]/g, ""),
    ...(blank(c.brand) ? {} : { brand: c.brand.trim() }),
    ...(blank(c.model) ? {} : { model: c.model.trim() }),
    ...(blank(c.year) ? {} : { year: Number(c.year) }),
    ...(blank(c.fuelType) ? {} : { fuel_type: c.fuelType }),
    ...(blank(c.color) ? {} : { color: c.color.trim() }),
    ...(blank(c.chassis) ? {} : { chassis: c.chassis.trim().toUpperCase() }),
    ...(blank(c.mileageIn) ? {} : { mileage_in: Number(c.mileageIn) }),
    ...(clientId === null ? {} : { client_id: clientId }),
  };
}

/** Prévia, na revisão, do que vai ficar pendente. O backend é a autoridade (computeMissingData). */
export function pendingLabels(
  client: QuickClient,
  car: QuickCar,
  clientSelected: boolean,
): string[] {
  const labels: string[] = [];

  if (!clientSelected) {
    if (blank(client.name)) labels.push("nome do cliente");
    if (blank(client.phone)) labels.push("telefone do cliente");
    if (blank(client.cpf)) labels.push("CPF do cliente");
    if (blank(client.address)) labels.push("endereço do cliente");
  }

  if (blank(car.brand)) labels.push("marca");
  if (blank(car.model)) labels.push("modelo");
  if (blank(car.year)) labels.push("ano");
  if (blank(car.fuelType)) labels.push("combustível");
  if (blank(car.color)) labels.push("cor");
  if (car.chassis.trim().length < MIN_CHASSIS) labels.push("chassi");
  if (blank(car.mileageIn)) labels.push("KM de entrada");

  return labels;
}
