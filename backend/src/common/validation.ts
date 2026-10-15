import { ValidationPipe } from '@nestjs/common';

/**
 * Pipe de validação global (usado em main.ts e nos testes e2e — um lugar só pra não divergir).
 *
 * `whitelist: true` descarta do corpo qualquer campo que o DTO não declare com decorator.
 * Sem isso, vários services fazem `repository.create(dto)` / `Object.assign(entity, dto)`
 * e um atacante injetaria `tenant`, `is_active`, `role` ou a chave primária (`user_id`,
 * `car_id`...) — o que vira vazamento/sequestro entre oficinas.
 * Consequência: TODO campo de DTO de entrada precisa de ao menos um decorator do class-validator.
 */
export const appValidationPipe = () => new ValidationPipe({ whitelist: true });
