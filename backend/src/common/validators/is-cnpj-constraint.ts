/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isCNPJ } from 'validation-br';

@ValidatorConstraint({ name: 'IsCnpj', async: false })
export class IsCnpjConstraint implements ValidatorConstraintInterface {
  validate(value: any, _args: ValidationArguments): boolean {

    if (typeof value !== 'string') return false;

    return isCNPJ(value);
  }

  defaultMessage(_args: ValidationArguments): string {
      return 'CNPJ invalido'
  }
}
