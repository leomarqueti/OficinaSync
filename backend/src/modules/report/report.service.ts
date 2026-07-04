import { ForbiddenException, Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import * as QRCode from 'qrcode';
import { ServiceOrdersService } from '../serviceOrder/serviceOrder.service';
import { UsersService } from '../users/users.service';
import { MinioService } from '../minio/minio.service';
import {
  ReportChapter,
  ReportPhoto,
  ReportProcedureStep,
  buildFooterTemplate,
  buildHeaderTemplate,
  buildReportHtml,
} from './report.template';

const sectionVisualOrder: Record<string, number> = {
  checkin: 1,
  obd_scan: 2,
  diagnosis: 3,
  repair: 4,
  preventive: 5,
  final: 6,
};

const chapterLabels: Record<string, string> = {
  checkin: 'Check-in',
  obd_scan: 'Scanner / OBD',
  diagnosis: 'Diagnóstico',
  repair: 'Execução do serviço',
  preventive: 'Inspeção geral',
  final: 'Entrega final',
};

@Injectable()
export class ReportService {
  constructor(
    private readonly serviceOrdersService: ServiceOrdersService,
    private readonly usersService: UsersService,
    private readonly minioService: MinioService,
  ) {}

  async generate(orderId: number, userId: number): Promise<Buffer> {
    const order = await this.serviceOrdersService.findEntityById(orderId);
    const user = await this.usersService.findById(userId);

    if (order.tenant.id !== user.tenant?.id) {
      throw new ForbiddenException(
        'Essa ordem de serviço não pertence ao tenant do usuário.',
      );
    }

    const sections = [...(order.sections ?? [])].sort(
      (a, b) =>
        (sectionVisualOrder[a.type] ?? 999) - (sectionVisualOrder[b.type] ?? 999),
    );

    // Fotos já usadas dentro de um bloco especializado (cilindro/injetor) não
    // devem aparecer de novo na galeria genérica da etapa.
    const claimedMediaIds = new Set<number>();
    for (const section of sections) {
      for (const test of section.tests ?? []) {
        if (test.test_type === 'compressao_mecanica') {
          for (const cyl of (test.data as any)?.cylinders ?? []) {
            if (cyl.media_id) claimedMediaIds.add(cyl.media_id);
          }
        }
        if (test.test_type === 'injetores_banco') {
          const data = test.data as any;
          if (data?.fotoAntesMediaId) claimedMediaIds.add(data.fotoAntesMediaId);
          if (data?.fotoDepoisMediaId) claimedMediaIds.add(data.fotoDepoisMediaId);
        }
      }
    }

    const photoLookup = new Map<number, string>();

    const chapters: ReportChapter[] = [];

    for (const section of sections) {
      const photos: ReportPhoto[] = [];

      for (const media of section.medias ?? []) {
        if (media.type !== 'photo') continue;

        try {
          const buffer = await this.minioService.getObjectBuffer(
            media.object_name,
          );
          const dataUri = `data:${media.mime_type};base64,${buffer.toString('base64')}`;

          photoLookup.set(media.media_id, dataUri);

          if (!claimedMediaIds.has(media.media_id)) {
            photos.push({
              label: media.label ?? 'Registro fotográfico',
              dataUri,
            });
          }
        } catch {
          // Mídia ausente no storage (ex: dado órfão de testes antigos) — não deve derrubar o relatório inteiro.
        }
      }

      const tests: ReportProcedureStep[] = (section.tests ?? []).map((test) => ({
        title: test.title,
        measurements: test.measurements ?? [],
        test_type: test.test_type,
        data: test.data,
        verdict: test.verdict,
        notes: test.notes,
      }));

      chapters.push({
        type: section.type,
        label: chapterLabels[section.type] ?? section.type,
        notes: section.notes,
        photos,
        tests,
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const publicUrl = `${frontendUrl}/servico/${order.public_token}`;
    const qrCodeDataUri = await QRCode.toDataURL(publicUrl, { margin: 1, width: 180 });

    const html = buildReportHtml({
      tenantName: order.tenant.name,
      tenantCnpj: order.tenant.cnpj,
      car: {
        brand: order.car.brand,
        model: order.car.model,
        year: order.car.year,
        plate: order.car.plate,
        color: order.car.color,
        fuel_type: order.car.fuel_type,
        mileage_in: order.car.mileage_in,
      },
      clientName: order.car.client?.name ?? null,
      clientComplaint: order.client_complaint,
      createdAt: order.created_at,
      finishedAt: order.finished_at,
      chapters,
      photoLookup,
      rootCause: order.root_cause,
      conclusion: order.conclusion,
      finalVerdict: order.final_verdict,
      responsavelTecnico: order.user?.name ?? null,
      publicUrl,
      qrCodeDataUri,
    });

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: buildHeaderTemplate(order.tenant.name),
        footerTemplate: buildFooterTemplate(order.tenant.name),
        margin: { top: '90px', bottom: '50px', left: '32px', right: '32px' },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
