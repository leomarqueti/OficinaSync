import { Injectable } from '@nestjs/common';
import { ServiceOrdersService } from '../serviceOrder/serviceOrder.service';
import { computeMissingData } from '../serviceOrder/missing-data';
import { orderClient } from '../serviceOrder/order-client';
import { InternalContextService } from './internal-context.service';
import { itemTotals, lineTotal } from './internal-math';
import { PartsService } from './parts.service';
import { TeamService } from './team.service';

/** Ficha consolidada pro escritório lançar a OS formal/nota em outro sistema. Só escritório e responsável. */
@Injectable()
export class OfficeSheetService {
  constructor(
    private readonly context: InternalContextService,
    private readonly partsService: PartsService,
    private readonly team: TeamService,
    private readonly serviceOrders: ServiceOrdersService,
  ) {}

  async build(orderId: number, userId: number) {
    const ctx = await this.context.load(orderId, userId);
    this.context.require(ctx, 'see_sheet', 'Só o escritório e o responsável veem a ficha da OS.');

    const full = await this.serviceOrders.findEntityById(orderId);
    const car = full.car;
    const client = orderClient(full);

    const partViews = await this.partsService.listParts(ctx);
    const services = await this.partsService.listServices(ctx);
    const { participants, responsible_share_percent } = await this.team.listParticipants(ctx);

    const settled = partViews
      .filter((p) => p.used_quantity !== null)
      .map((p) => ({ ...p, line_total: lineTotal(p) }));

    return {
      service_order_id: full.service_order_id,
      status: full.status,
      created_at: full.created_at,
      finished_at: full.finished_at ?? null,
      complaint: full.client_complaint ?? '',
      mileage_in: full.mileage_in ?? car.mileage_in ?? null,
      client: client
        ? {
            name: client.name,
            phone: client.phone,
            cpf: client.cpf,
            address: client.address,
            email: client.email,
          }
        : null,
      car: {
        plate: car.plate,
        brand: car.brand,
        model: car.model,
        year: car.year,
        color: car.color,
        chassis: car.chassis,
        fuel_type: car.fuel_type,
      },
      missing_data: computeMissingData(car, client),
      work_done: (full.sections ?? [])
        .filter((s) => s.notes && s.notes.trim() !== '')
        .map((s) => ({ type: s.type, status: s.status, notes: s.notes as string })),
      parts: settled,
      pending_parts: partViews.filter((p) => p.used_quantity === null),
      services,
      responsible: {
        user_id: ctx.responsible.user_id,
        name: ctx.responsible.name,
        share_percent: responsible_share_percent ?? 0,
      },
      participants,
      internal_notes: ctx.order.internal_notes,
      totals: itemTotals(partViews, services),
    };
  }
}
