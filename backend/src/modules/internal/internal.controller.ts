import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';
import { SetNotesDto } from './dto/notes.dto';
import { SetResponsibleDto } from './dto/responsible.dto';
import { InternalContextService } from './internal-context.service';
import { responsibleShare } from './internal-access';
import { TeamService } from './team.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class InternalController {
  constructor(
    private readonly context: InternalContextService,
    private readonly team: TeamService,
  ) {}

  @Get('users/team')
  listTeam(@Req() req: any) {
    return this.team.listTeam(req.user.sub);
  }

  @Get('service_orders/:id/internal')
  async getInternal(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const ctx = await this.context.load(id, req.user.sub);

    return {
      service_order_id: ctx.order.service_order_id,
      status: ctx.order.status,
      viewer: {
        user_id: ctx.viewer.userId,
        role: ctx.viewer.role,
        is_responsible: ctx.viewer.isResponsible,
      },
      responsible: { user_id: ctx.responsible.user_id, name: ctx.responsible.name },
      notes: ctx.can.edit_notes ? ctx.order.internal_notes : null,
      parts: [],
      services: [],
      participants: [],
      responsible_share_percent: responsibleShare([]),
      my_share_percent: null,
      can: ctx.can,
    };
  }

  @Put('service_orders/:id/internal/notes')
  @HttpCode(HttpStatus.OK)
  setNotes(@Param('id', ParseIntPipe) id: number, @Body() dto: SetNotesDto, @Req() req: any) {
    return this.team.setNotes(id, req.user.sub, dto.notes);
  }

  @Patch('service_orders/:id/responsible')
  @HttpCode(HttpStatus.OK)
  setResponsible(@Param('id', ParseIntPipe) id: number, @Body() dto: SetResponsibleDto, @Req() req: any) {
    return this.team.setResponsible(id, req.user.sub, dto.user_id);
  }
}
