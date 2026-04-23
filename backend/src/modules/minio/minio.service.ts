// src/minio/minio.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService {
  private readonly client: Minio.Client;

  constructor(private readonly configService: ConfigService) {
    const endPoint = this.configService.get<string>('MINIO_ENDPOINT');
    const port = this.configService.get<string>('MINIO_PORT');
    const useSSL = this.configService.get<string>('MINIO_USE_SSL');
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY');

    if (!endPoint) {
      throw new Error('MINIO_ENDPOINT is required');
    }

    if (!port) {
      throw new Error('MINIO_PORT is required');
    }

    if (!useSSL) {
      throw new Error('MINIO_USE_SSL is required');
    }

    if (!accessKey) {
      throw new Error('MINIO_ACCESS_KEY is required');
    }

    if (!secretKey) {
      throw new Error('MINIO_SECRET_KEY is required');
    }

    this.client = new Minio.Client({
      endPoint,
      port: Number(port),
      useSSL: useSSL === 'true',
      accessKey,
      secretKey,
    });
  }
}
