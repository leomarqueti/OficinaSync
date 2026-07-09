import { IsArray, IsNumber, IsObject, IsOptional } from 'class-validator';

/**
 * Snapshot que o ESP32 empurra. Validação solta de propósito (mesmo débito
 * aceito do `data` dos testes especializados): o firmware evolui mais rápido
 * que o backend e campos novos não podem quebrar a ingestão.
 * Formato esperado: { voltage, params: {rpm, temp, ...}, dtcs: [{code}] }
 */
export class ObdReadingDto {
  @IsOptional()
  @IsNumber()
  voltage?: number;

  @IsOptional()
  @IsObject()
  params?: Record<string, number | null>;

  @IsOptional()
  @IsArray()
  dtcs?: { code: string }[];
}
