export type MissingItem = { field: string; label: string };
export type MissingData = { client: MissingItem[]; car: MissingItem[] };

type ClientLike = {
  name?: string | null;
  phone?: string | null;
  cpf?: string | null;
  address?: string | null;
};

type CarLike = {
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  fuel_type?: string | null;
  color?: string | null;
  chassis?: string | null;
  mileage_in?: number | null;
};

const MIN_CHASSIS_LENGTH = 5;

const filled = (value?: string | null): boolean =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * O que ainda falta preencher pra finalizar a OS — calculado a cada leitura, nunca guardado.
 * Regra = a que o wizard completo já exige hoje (e-mail é opcional).
 */
export function computeMissingData(
  car: CarLike | null | undefined,
  client: ClientLike | null | undefined,
): MissingData {
  const clientMissing: MissingItem[] = [];
  if (!filled(client?.name)) {
    clientMissing.push({ field: 'name', label: 'nome do cliente' });
  }
  if (!filled(client?.phone)) {
    clientMissing.push({ field: 'phone', label: 'telefone do cliente' });
  }
  if (!filled(client?.cpf)) {
    clientMissing.push({ field: 'cpf', label: 'CPF do cliente' });
  }
  if (!filled(client?.address)) {
    clientMissing.push({ field: 'address', label: 'endereço do cliente' });
  }

  const carMissing: MissingItem[] = [];
  if (!filled(car?.brand)) carMissing.push({ field: 'brand', label: 'marca' });
  if (!filled(car?.model)) carMissing.push({ field: 'model', label: 'modelo' });
  if (typeof car?.year !== 'number') {
    carMissing.push({ field: 'year', label: 'ano' });
  }
  if (!filled(car?.fuel_type)) {
    carMissing.push({ field: 'fuel_type', label: 'combustível' });
  }
  if (!filled(car?.color)) carMissing.push({ field: 'color', label: 'cor' });
  if (
    !filled(car?.chassis) ||
    (car?.chassis ?? '').trim().length < MIN_CHASSIS_LENGTH
  ) {
    carMissing.push({ field: 'chassis', label: 'chassi' });
  }
  if (typeof car?.mileage_in !== 'number') {
    carMissing.push({ field: 'mileage_in', label: 'KM de entrada' });
  }

  return { client: clientMissing, car: carMissing };
}

export function isComplete(missing: MissingData): boolean {
  return missing.client.length === 0 && missing.car.length === 0;
}
