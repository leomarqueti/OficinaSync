// O que falta pra liberar o "Continuar" da abertura de OS — mesmas regras do wizard completo.
// O botão travado mostra isso embaixo, em vez de só ficar apagado.
import { e164ToDigits, isValidCpf, isValidPhone, isValidPlate, isValidYear } from "./validators";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function missingClientFields(c: { name: string; phone: string; cpf: string; email: string; address: string }): string[] {
  const missing: string[] = [];
  if (c.name.trim().length < 2) missing.push("nome");
  if (!isValidPhone(e164ToDigits(c.phone))) missing.push("telefone");
  if (!isValidCpf(c.cpf)) missing.push("CPF válido");
  if (c.email.trim().length > 0 && !emailRegex.test(c.email)) missing.push("e-mail válido");
  if (c.address.trim().length < 3) missing.push("endereço");
  return missing;
}

export function missingCarFields(c: {
  plate: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  chassis: string;
  mileageIn: string;
}): string[] {
  const missing: string[] = [];
  if (!isValidPlate(c.plate)) missing.push("placa");
  if (c.brand.trim().length < 2) missing.push("marca");
  if (c.model.trim().length < 1) missing.push("modelo");
  if (!isValidYear(c.year)) missing.push("ano");
  if (c.color.trim().length < 2) missing.push("cor");
  if (c.chassis.trim().length < 5) missing.push("chassi (5 ou mais letras/números)");
  if (c.mileageIn.length === 0) missing.push("KM");
  return missing;
}

export function nextHint(missing: string[]): string | undefined {
  return missing.length > 0 ? `Falta: ${missing.join(", ")}` : undefined;
}
