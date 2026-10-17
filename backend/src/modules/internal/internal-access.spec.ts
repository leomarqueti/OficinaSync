import { Role } from '../users/role.enum';
import {
  isOffice,
  permissionsFor,
  responsibleShare,
  validateShares,
  type Viewer,
} from './internal-access';

const viewer = (role: Role, isResponsible = false): Viewer => ({
  userId: 1,
  role,
  isResponsible,
});

describe('permissionsFor', () => {
  it('dono e recepção são escritório e podem tudo, mesmo com a OS finalizada', () => {
    for (const role of [Role.OWNER, Role.RECEPTIONIST]) {
      expect(isOffice(role)).toBe(true);
      expect(permissionsFor(viewer(role), true)).toEqual({
        edit_items: true,
        edit_team: true,
        edit_notes: true,
        change_responsible: true,
        see_sheet: true,
        see_all_team: true,
      });
    }
  });

  it('mecânico responsável: edita itens/equipe enquanto aberta; vê ficha e anotações; não troca responsável', () => {
    expect(permissionsFor(viewer(Role.MECHANIC, true), false)).toEqual({
      edit_items: true,
      edit_team: true,
      edit_notes: true,
      change_responsible: false,
      see_sheet: true,
      see_all_team: true,
    });
  });

  it('mecânico responsável com a OS finalizada: não edita itens nem equipe', () => {
    const p = permissionsFor(viewer(Role.MECHANIC, true), true);
    expect(p.edit_items).toBe(false);
    expect(p.edit_team).toBe(false);
  });

  it('mecânico comum: só edita itens enquanto aberta; sem equipe, anotações, ficha nem troca de responsável', () => {
    expect(permissionsFor(viewer(Role.MECHANIC), false)).toEqual({
      edit_items: true,
      edit_team: false,
      edit_notes: false,
      change_responsible: false,
      see_sheet: false,
      see_all_team: false,
    });
    expect(permissionsFor(viewer(Role.MECHANIC), true).edit_items).toBe(false);
  });
});

describe('porcentagens', () => {
  it('o responsável fica com o que sobra', () => {
    expect(responsibleShare([])).toBe(100);
    expect(responsibleShare([30, 20])).toBe(50);
  });

  it('a soma dos ajudantes pode chegar a 99, não a 100', () => {
    expect(validateShares([99])).toBeNull();
    expect(validateShares([50, 49])).toBeNull();
    expect(validateShares([50, 50])).toMatch(/99%/);
    expect(validateShares([60, 40])).toMatch(/99%/);
  });
});
