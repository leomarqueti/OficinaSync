import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';
import { SetNotesDto } from './dto/notes.dto';
import { CreatePartDto, UpdatePartDto } from './dto/part.dto';
import { SetResponsibleDto } from './dto/responsible.dto';
import { CreateServiceItemDto, UpdateServiceItemDto } from './dto/service-item.dto';
import { UploadConcurrencyInterceptor } from '../medias/upload-concurrency.interceptor';
import { HARD_UPLOAD_LIMIT_BYTES } from '../minio/upload-limits';
import { InternalContextService } from './internal-context.service';
import { responsibleShare } from './internal-access';
import { PartsService } from './parts.service';
import { TeamService } from './team.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class InternalController {
  constructor(
    private readonly context: InternalContextService,
    private readonly team: TeamService,
    private readonly partsService: PartsService,
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
      parts: await this.partsService.listParts(ctx),
      services: await this.partsService.listServices(ctx),
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

  @Post('service_orders/:id/parts')
  async createPart(@Param('id', ParseIntPipe) id: number, @Body() dto: CreatePartDto, @Req() req: any) {
    return this.partsService.createPart(await this.context.load(id, req.user.sub), dto);
  }

  @Patch('service_orders/:id/parts/:partId')
  @HttpCode(HttpStatus.OK)
  async updatePart(
    @Param('id', ParseIntPipe) id: number,
    @Param('partId', ParseIntPipe) partId: number,
    @Body() dto: UpdatePartDto,
    @Req() req: any,
  ) {
    return this.partsService.updatePart(await this.context.load(id, req.user.sub), partId, dto);
  }

  @Delete('service_orders/:id/parts/:partId')
  @HttpCode(HttpStatus.OK)
  async deletePart(
    @Param('id', ParseIntPipe) id: number,
    @Param('partId', ParseIntPipe) partId: number,
    @Req() req: any,
  ) {
    return this.partsService.deletePart(await this.context.load(id, req.user.sub), partId);
  }

  @Post('service_orders/:id/parts/:partId/photo')
  @UseInterceptors(
    UploadConcurrencyInterceptor,
    FileInterceptor('file', { limits: { fileSize: HARD_UPLOAD_LIMIT_BYTES } }),
  )
  async uploadPartPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Param('partId', ParseIntPipe) partId: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.partsService.uploadPhoto(await this.context.load(id, req.user.sub), partId, file);
  }

  @Post('service_orders/:id/services')
  async createService(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateServiceItemDto, @Req() req: any) {
    return this.partsService.createService(await this.context.load(id, req.user.sub), dto);
  }

  @Patch('service_orders/:id/services/:serviceId')
  @HttpCode(HttpStatus.OK)
  async updateService(
    @Param('id', ParseIntPipe) id: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Body() dto: UpdateServiceItemDto,
    @Req() req: any,
  ) {
    return this.partsService.updateService(await this.context.load(id, req.user.sub), serviceId, dto);
  }

  @Delete('service_orders/:id/services/:serviceId')
  @HttpCode(HttpStatus.OK)
  async deleteService(
    @Param('id', ParseIntPipe) id: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Req() req: any,
  ) {
    return this.partsService.deleteService(await this.context.load(id, req.user.sub), serviceId);
  }
}
