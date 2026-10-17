import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceOrders } from '../serviceOrder/serviceOrder.entity';
import { Users } from '../users/users.entity';
import { UsersService } from '../users/users.service';
import { InternalContextService } from './internal-context.service';

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(ServiceOrders)
    private readonly orders: Repository<ServiceOrders>,
    @InjectRepository(Users)
    private readonly users: Repository<Users>,
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

    ctx.order.responsible = next;
    await this.orders.save(ctx.order);

    return { responsible: { user_id: next.user_id, name: next.name } };
  }
}
