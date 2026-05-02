/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { fileTypeFromBuffer } from 'file-type';
import { randomUUID } from 'crypto';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly client: Minio.Client;
  private readonly bucketName: string;

  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ];

  constructor(private readonly configService: ConfigService) {
    const endPoint = this.configService.get<string>('MINIO_ENDPOINT');
    const port = this.configService.get<string>('MINIO_PORT');
    const useSSL = this.configService.get<string>('MINIO_USE_SSL');
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY');
    const bucketName = this.configService.get<string>('MINIO_BUCKET');

    if (!endPoint) throw new Error('MINIO_ENDPOINT is required');
    if (!port) throw new Error('MINIO_PORT is required');
    if (!useSSL) throw new Error('MINIO_USE_SSL is required');
    if (!accessKey) throw new Error('MINIO_ACCESS_KEY is required');
    if (!secretKey) throw new Error('MINIO_SECRET_KEY is required');
    if (!bucketName) throw new Error('MINIO_BUCKET is required');

    this.bucketName = bucketName;

    this.client = new Minio.Client({
      endPoint,
      port: Number(port),
      useSSL: useSSL === 'true',
      accessKey,
      secretKey,
    });
  }

  async onModuleInit() {
    const exists = await this.client.bucketExists(this.bucketName);

    if (!exists) {
      await this.client.makeBucket(this.bucketName, 'us-east-1');
    }
  }

  async upload(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado.');
    }

    const detected = await fileTypeFromBuffer(file.buffer);

    const detectedMimeType = detected?.mime ?? file.mimetype;
    const extension =
      detected?.ext ?? file.originalname.split('.').pop() ?? 'bin';

    if (
      !detectedMimeType ||
      !this.allowedMimeTypes.includes(detectedMimeType)
    ) {
      throw new BadRequestException(
        'Tipo de arquivo não permitido. Envie apenas imagem, áudio ou vídeo válidos.',
      );
    }

    const objectName = `orders/${randomUUID()}.${extension}`;

    await this.client.putObject(
      this.bucketName,
      objectName,
      file.buffer,
      file.size,
      {
        'Content-Type': detectedMimeType,
      },
    );

    return {
      bucket: this.bucketName,
      object_name: objectName,
      mime_type: detectedMimeType,
      size: file.size,
    };
  }

  async getPresignedUrl(
    objectName: string,
    expiresInSeconds = 60 * 60,
  ): Promise<string> {
    return this.client.presignedGetObject(
      this.bucketName,
      objectName,
      expiresInSeconds,
    );
  }
}
