import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceOrders } from '../serviceOrder/serviceOrder.entity';
import { Status } from '../serviceOrder/status.enum';
import { Tenants } from '../tenants/tenants.entity';
import { Users } from '../users/users.entity';
import { UsersService } from '../users/users.service';
import { Permissions, Viewer, permissionsFor } from './internal-access';

export type OrderContext = {
  order: ServiceOrders;
  user: Users;
  tenant: Tenants;
  responsible: Users;
  viewer: Viewer;
  done: boolean;
  can: Permissions;
};

/** Resolve "quem é quem nesta OS" e o que cada um pode — ponto único de checagem de oficina e perfil. */
@Injectable()
export class InternalContextService {
  constructor(
    @InjectRepository(ServiceOrders)
    private readonly orders: Repository<ServiceOrders>,
    private readonly usersService: UsersService,
  ) {}

  async load(orderId: number, userId: number): Promise<OrderContext> {
    const user = await this.usersService.findById(userId);
    const order = await this.orders.findOne({
      where: { service_order_id: orderId },
      relations: { tenant: true, user: true, responsible: true },
    });

    if (!order) {
      throw new NotFoundException('Ordem de serviço não encontrada!');
    }
    if (!user.tenant || order.tenant.id !== user.tenant.id) {
      throw new ForbiddenException('Essa ordem de serviço não pertence à sua oficina.');
    }

    const responsible = order.responsible ?? order.user;
    const viewer: Viewer = {
      userId: user.user_id,
      role: user.role,
      isResponsible: user.user_id === responsible.user_id,
    };
    const done = order.status === Status.DONE;

    return {
      order,
      user,
      tenant: user.tenant,
      responsible,
      viewer,
      done,
      can: permissionsFor(viewer, done),
    };
  }

  require(ctx: OrderContext, key: keyof Permissions, message: string): void {
    if (!ctx.can[key]) {
      throw new ForbiddenException(message);
    }
  }
}
