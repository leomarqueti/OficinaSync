/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';
import { ReportService } from './report.service';

@Controller('service_orders')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get(':id/report.pdf')
  @UseGuards(JwtAuthGuard)
  async getReport(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user.sub;
    const pdf = await this.reportService.generate(id, userId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="laudo-os-${id}.pdf"`,
      'Content-Length': pdf.length,
    });

    res.send(pdf);
  }
}
