import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ServiceOrders } from '../serviceOrder/serviceOrder.entity';
import { Status } from '../serviceOrder/status.enum';
import { Users } from '../users/users.entity';
import { UsersService } from '../users/users.service';
import { SetParticipantsDto } from './dto/participants.dto';
import { isOffice, responsibleShare, validateShares } from './internal-access';
import { InternalContextService, OrderContext } from './internal-context.service';
import { brtDateString, brtDayEnd, brtDayStart, brtMonthStart } from './day-range';
import { commissionTotals } from './internal-math';
import { ServiceOrderParticipants } from './service-order-participant.entity';

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(ServiceOrders)
    private readonly orders: Repository<ServiceOrders>,
    @InjectRepository(Users)
    private readonly users: Repository<Users>,
    @InjectRepository(ServiceOrderParticipants)
    private readonly participants: Repository<ServiceOrderParticipants>,
    private readonly usersService: UsersService,
    private readonly context: InternalContextService,
  ) {}

  /** Funcionários ativos da oficina do usuário (sem e-mail). */
  async listTeam(userId: number) {
    const me = await this.usersService.findById(userId);
    if (!me.tenant) return [];

    const staff = await this.users.find({
      where: { tenant: { id: me.tenant.id }, is_active: true },
      order: { name: 'ASC' },
    });

    return staff.map((u) => ({ user_id: u.user_id, name: u.name, role: u.role }));
  }

  async setNotes(orderId: number, userId: number, notes: string) {
    const ctx = await this.context.load(orderId, userId);
    this.context.require(ctx, 'edit_notes', 'Só o escritório e o responsável editam as anotações internas.');

    ctx.order.internal_notes = notes.trim() === '' ? null : notes.trim();
    await this.orders.save(ctx.order);

    return { notes: ctx.order.internal_notes };
  }

  async setResponsible(orderId: number, userId: number, newUserId: number) {
    const ctx = await this.context.load(orderId, userId);
    this.context.require(ctx, 'change_responsible', 'Só o escritório troca o responsável da OS.');

    const next = await this.users.findOne({
      where: { user_id: newUserId, tenant: { id: ctx.tenant.id }, is_active: true },
    });
    if (!next) {
      throw new BadRequestException('Esse funcionário não existe ou não pertence à sua oficina.');
    }

    // quem vira responsável não pode continuar como ajudante da mesma OS
    await this.participants.delete({
      serviceOrder: { service_order_id: ctx.order.service_order_id },
      user: { user_id: next.user_id },
    });

    ctx.order.responsible = next;
    await this.orders.save(ctx.order);

    return { responsible: { user_id: next.user_id, name: next.name } };
  }

  async listParticipants(ctx: OrderContext) {
    const rows = await this.participants.find({
      where: { serviceOrder: { service_order_id: ctx.order.service_order_id }, tenant: { id: ctx.tenant.id } },
      relations: { user: true },
      order: { participant_id: 'ASC' },
    });
    const all = rows.map((r) => ({
      user_id: r.user.user_id,
      name: r.user.name,
      share_percent: r.share_percent,
      task: r.task,
    }));

    const responsiblePct = responsibleShare(all.map((p) => p.share_percent));

    if (ctx.can.see_all_team) {
      return {
        participants: all,
        responsible_share_percent: responsiblePct as number | null,
        my_share_percent: ctx.viewer.isResponsible
          ? responsiblePct
          : (all.find((p) => p.user_id === ctx.viewer.userId)?.share_percent ?? null),
      };
    }

    // mecânico comum: só a própria linha — o resto não sai da API
    const mine = all.filter((p) => p.user_id === ctx.viewer.userId);
    return {
      participants: mine,
      responsible_share_percent: null as number | null,
      my_share_percent: mine[0]?.share_percent ?? null,
    };
  }

  async setParticipants(orderId: number, userId: number, dto: SetParticipantsDto) {
    const ctx = await this.context.load(orderId, userId);
    this.context.require(ctx, 'edit_team', 'Só o responsável (enquanto a OS está aberta) e o escritório editam a equipe.');

    const items = dto.participants;
    const ids = items.map((i) => i.user_id);

    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Cada funcionário só pode aparecer uma vez.');
    }
    if (ids.includes(ctx.responsible.user_id)) {
      throw new BadRequestException('O responsável não entra na lista de ajudantes — a parte dele é o que sobra.');
    }
    const sumError = validateShares(items.map((i) => i.share_percent));
    if (sumError) throw new BadRequestException(sumError);

    if (ids.length > 0) {
      const valid = await this.users.find({
        where: { user_id: In(ids), tenant: { id: ctx.tenant.id }, is_active: true },
      });
      if (valid.length !== ids.length) {
        throw new BadRequestException('Algum funcionário não existe, está inativo ou não pertence à sua oficina.');
      }
    }

    await this.participants.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ServiceOrderParticipants);
      await repo.delete({ serviceOrder: { service_order_id: ctx.order.service_order_id } });
      for (const item of items) {
        await repo.save(
          repo.create({
            serviceOrder: ctx.order,
            tenant: ctx.tenant,
            user: { user_id: item.user_id } as Users,
            share_percent: item.share_percent,
            task: item.task.trim(),
          }),
        );
      }
    });

    return this.listParticipants(ctx);
  }

  async commissions(userId: number, query: { from?: string; to?: string; user_id?: number }) {
    const me = await this.usersService.findById(userId);
    if (!me.tenant) return { from: '', to: '', people: [] };

    const now = new Date();
    // sempre no horário de Brasília, independente do fuso do servidor; 'to' inclui o dia inteiro
    const from = query.from ? brtDayStart(query.from) : brtMonthStart(now);
    const toEnd = query.to ? brtDayEnd(query.to) : now;

    const orders = await this.orders
      .createQueryBuilder('o')
      .innerJoin('o.tenant', 't')
      .innerJoinAndSelect('o.user', 'u')
      .leftJoinAndSelect('o.responsible', 'r')
      .innerJoinAndSelect('o.car', 'car')
      .where('t.id = :tenantId', { tenantId: me.tenant.id })
      .andWhere('o.status = :done', { done: Status.DONE })
      .andWhere('o.finished_at >= :from AND o.finished_at <= :to', { from, to: toEnd })
      .getMany();

    const rows = orders.length
      ? await this.participants.find({
          where: {
            serviceOrder: { service_order_id: In(orders.map((o) => o.service_order_id)) },
            tenant: { id: me.tenant.id },
          },
          relations: { user: true, serviceOrder: true },
        })
      : [];

    let people = commissionTotals(
      orders.map((o) => {
        const resp = o.responsible ?? o.user;
        return {
          service_order_id: o.service_order_id,
          plate: o.car.plate,
          finished_at: o.finished_at as Date,
          responsible_id: resp.user_id,
          responsible_name: resp.name,
          responsible_role: resp.role,
          participants: rows
            .filter((r) => r.serviceOrder.service_order_id === o.service_order_id)
            .map((r) => ({
              user_id: r.user.user_id,
              name: r.user.name,
              role: r.user.role,
              share_percent: r.share_percent,
              task: r.task,
            })),
        };
      }),
    );

    // mecânico só enxerga a si mesmo; escritório pode filtrar por funcionário
    const onlyUser = isOffice(me.role) ? query.user_id : me.user_id;
    if (onlyUser !== undefined) people = people.filter((p) => p.user_id === onlyUser);

    return {
      from: query.from ?? brtDateString(from),
      to: query.to ?? brtDateString(toEnd),
      people,
    };
  }
}
