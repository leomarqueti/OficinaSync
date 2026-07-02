import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { path as ffprobePath } from 'ffprobe-static';
import { ServiceOrdersService } from '../serviceOrder/serviceOrder.service';
import { UsersService } from '../users/users.service';
import { SectionsService } from '../sections/section.service';
import { MediaService } from '../medias/media.service';
import { MinioService } from '../minio/minio.service';
import { PromoVideoStatus } from '../serviceOrder/promoVideoStatus.enum';
import { SectionType } from '../sections/typeSection.enum';
import { Sections } from '../sections/section.entity';
import { ServiceOrders } from '../serviceOrder/serviceOrder.entity';

ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);
ffmpeg.setFfprobePath(ffprobePath);

const sectionVisualOrder: Record<string, number> = {
  checkin: 1,
  obd_scan: 2,
  diagnosis: 3,
  repair: 4,
  preventive: 5,
  final: 6,
};

const extensionByMime: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

@Injectable()
export class VideoService {
  constructor(
    private readonly serviceOrdersService: ServiceOrdersService,
    private readonly usersService: UsersService,
    private readonly sectionsService: SectionsService,
    private readonly mediaService: MediaService,
    private readonly minioService: MinioService,
  ) {}

  async triggerPromoVideo(
    orderId: number,
    userId: number,
  ): Promise<PromoVideoStatus> {
    const order = await this.serviceOrdersService.findEntityById(orderId);
    const user = await this.usersService.findById(userId);

    if (order.tenant.id !== user.tenant?.id) {
      throw new ForbiddenException(
        'Essa ordem de serviço não pertence ao tenant do usuário.',
      );
    }

    const hasVideo = (order.sections ?? []).some((section) =>
      (section.medias ?? []).some((media) => media.type === 'video'),
    );

    if (!hasVideo) {
      throw new BadRequestException(
        'Nenhum vídeo enviado nas etapas desta OS ainda.',
      );
    }

    await this.serviceOrdersService.setPromoVideoStatus(
      orderId,
      PromoVideoStatus.PROCESSING,
    );

    this.generate(orderId, userId).catch((error) => {
      console.error('Erro ao gerar vídeo de divulgação', error);
    });

    return PromoVideoStatus.PROCESSING;
  }

  private async generate(orderId: number, userId: number): Promise<void> {
    const workDir = path.join(os.tmpdir(), `promo-video-${randomUUID()}`);
    await fs.mkdir(workDir, { recursive: true });

    try {
      const order = await this.serviceOrdersService.findEntityById(orderId);

      const sections = [...(order.sections ?? [])]
        .filter((section) => section.type !== 'obd_scan')
        .sort(
          (a, b) =>
            (sectionVisualOrder[a.type] ?? 999) -
            (sectionVisualOrder[b.type] ?? 999),
        );

      const videoMedias = sections.flatMap((section) =>
        (section.medias ?? []).filter((media) => media.type === 'video'),
      );

      if (videoMedias.length === 0) {
        throw new BadRequestException(
          'Nenhum vídeo enviado nas etapas desta OS ainda.',
        );
      }

      const normalizedClips: string[] = [];

      for (let i = 0; i < videoMedias.length; i++) {
        const media = videoMedias[i];
        const extension = extensionByMime[media.mime_type] ?? 'mp4';
        const inputPath = path.join(workDir, `input_${i}.${extension}`);
        const outputPath = path.join(workDir, `clip_${i}.mp4`);

        const buffer = await this.minioService.getObjectBuffer(
          media.object_name,
        );
        await fs.writeFile(inputPath, buffer);

        const hasAudio = await this.hasAudioStream(inputPath);
        await this.normalizeClip(inputPath, outputPath, hasAudio);

        normalizedClips.push(outputPath);
      }

      const listPath = path.join(workDir, 'list.txt');
      const listContent = normalizedClips
        .map((clip) => `file '${clip.replace(/'/g, "'\\''")}'`)
        .join('\n');
      await fs.writeFile(listPath, listContent);

      const finalPath = path.join(workDir, 'final.mp4');
      await this.concatClips(listPath, finalPath);

      const finalBuffer = await fs.readFile(finalPath);
      const uploaded = await this.minioService.uploadBuffer(
        finalBuffer,
        'video/mp4',
        'mp4',
      );

      const finalSection = await this.getOrCreateFinalSection(order, userId);

      await this.mediaService.createFromUploadedObject(
        finalSection.section_id,
        'video',
        'Vídeo de divulgação',
        uploaded,
        userId,
      );

      await this.serviceOrdersService.setPromoVideoStatus(
        orderId,
        PromoVideoStatus.READY,
      );
    } catch (error) {
      await this.serviceOrdersService.setPromoVideoStatus(
        orderId,
        PromoVideoStatus.FAILED,
      );
      throw error;
    } finally {
      await fs.rm(workDir, { recursive: true, force: true });
    }
  }

  private async getOrCreateFinalSection(
    order: ServiceOrders,
    userId: number,
  ): Promise<Sections> {
    const existing = (order.sections ?? []).find(
      (section) => section.type === SectionType.FINAL,
    );

    if (existing) {
      return existing;
    }

    return this.sectionsService.create(
      {
        service_order_id: order.service_order_id,
        type: SectionType.FINAL,
      },
      userId,
    );
  }

  private hasAudioStream(filePath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(data.streams.some((stream) => stream.codec_type === 'audio'));
      });
    });
  }

  private normalizeClip(
    inputPath: string,
    outputPath: string,
    hasAudio: boolean,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .videoFilters(
          'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30',
        )
        .videoCodec('libx264')
        .outputOptions(['-preset veryfast', '-pix_fmt yuv420p', '-movflags +faststart']);

      if (hasAudio) {
        command.audioCodec('aac').audioChannels(2).audioFrequency(44100);
      } else {
        command.noAudio();
      }

      command
        .on('error', reject)
        .on('end', () => resolve())
        .save(outputPath);
    });
  }

  private concatClips(listPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions(['-c copy'])
        .on('error', reject)
        .on('end', () => resolve())
        .save(outputPath);
    });
  }
}
