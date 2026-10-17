import { Role } from '../users/role.enum';

export type Viewer = { userId: number; role: Role; isResponsible: boolean };

export type Permissions = {
  edit_items: boolean;
  edit_team: boolean;
  edit_notes: boolean;
  change_responsible: boolean;
  see_sheet: boolean;
  see_all_team: boolean;
};

/** Dono e recepção formam o "escritório": veem e editam tudo, mesmo com a OS finalizada. */
export const isOffice = (role: Role): boolean =>
  role === Role.OWNER || role === Role.RECEPTIONIST;

export function permissionsFor(viewer: Viewer, orderDone: boolean): Permissions {
  const office = isOffice(viewer.role);
  return {
    edit_items: office || !orderDone,
    edit_team: office || (viewer.isResponsible && !orderDone),
    edit_notes: office || viewer.isResponsible,
    change_responsible: office,
    see_sheet: office || viewer.isResponsible,
    see_all_team: office || viewer.isResponsible,
  };
}

/** A parte do responsável não é digitada: é o que sobra dos ajudantes. */
export const responsibleShare = (shares: number[]): number =>
  100 - shares.reduce((acc, n) => acc + n, 0);

/** O responsável precisa ficar com pelo menos 1%. */
export function validateShares(shares: number[]): string | null {
  const sum = shares.reduce((acc, n) => acc + n, 0);
  return sum > 99
    ? 'A soma das porcentagens dos ajudantes passa de 99% (o responsável fica com pelo menos 1%).'
    : null;
}
