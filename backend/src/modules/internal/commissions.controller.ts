import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';
import { CommissionsQueryDto } from './dto/commissions-query.dto';
import { TeamService } from './team.service';

@Controller('commissions')
@UseGuards(JwtAuthGuard)
export class CommissionsController {
  constructor(private readonly team: TeamService) {}

  @Get()
  list(@Query() query: CommissionsQueryDto, @Req() req: any) {
    return this.team.commissions(req.user.sub, query);
  }
}
