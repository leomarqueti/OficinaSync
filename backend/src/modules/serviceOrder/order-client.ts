import type { Clients } from '../clients/clients.entity';

/**
 * Cliente de uma OS: quem trouxe o carro nessa visita; nas OS antigas (sem cliente próprio),
 * o dono do carro. Fonte única — toda tela, laudo e ficha leem o cliente por aqui.
 */
export function orderClient(order: {
  client?: Clients | null;
  car?: { client?: Clients | null } | null;
}): Clients | null {
  return order.client ?? order.car?.client ?? null;
}
