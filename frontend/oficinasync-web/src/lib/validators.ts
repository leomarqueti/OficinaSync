/** Validação/formatação espelhando o que o backend confere (validation-br). */

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/* ----------------------------- CPF ----------------------------- */

export function formatCpf(digits: string) {
  const d = onlyDigits(digits).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

export function isValidCpf(digits: string) {
  const d = onlyDigits(digits);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * (10 - i);
  let check1 = (sum * 10) % 11;
  if (check1 === 10) check1 = 0;
  if (check1 !== Number(d[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(d[i]) * (11 - i);
  let check2 = (sum * 10) % 11;
  if (check2 === 10) check2 = 0;
  return check2 === Number(d[10]);
}

/* ---------------------------- Telefone --------------------------- */

export function formatPhone(digits: string) {
  const d = onlyDigits(digits).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

export function isValidPhone(digits: string) {
  const d = onlyDigits(digits);
  return d.length === 10 || d.length === 11;
}

/** Converte pro E.164 que o backend espera — usuário nunca digita o +55. */
export function phoneToE164(digits: string) {
  const d = onlyDigits(digits);
  return d ? `+55${d}` : "";
}

export function e164ToDigits(e164: string) {
  return onlyDigits(e164).replace(/^55/, "");
}

/* ------------------------------ Placa ----------------------------- */

export function formatPlate(raw: string) {
  const cleaned = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
  if (cleaned.length <= 3) return cleaned;

  const fifthChar = cleaned[4];
  const isMercosul = fifthChar !== undefined && /[A-Z]/.test(fifthChar);
  if (isMercosul) return cleaned;

  return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
}

export function isValidPlate(raw: string) {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z]{3}\d{4}$/.test(cleaned) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(cleaned);
}

/* ------------------------------- Ano ------------------------------ */

export function isValidYear(value: string) {
  const year = Number(value);
  const currentYear = new Date().getFullYear();
  return Number.isInteger(year) && year >= 1950 && year <= currentYear + 1;
}

/* -------------------------------- KM ------------------------------- */

export function formatKm(digits: string) {
  const d = onlyDigits(digits).slice(0, 7);
  if (!d) return "";
  return Number(d).toLocaleString("pt-BR");
}
