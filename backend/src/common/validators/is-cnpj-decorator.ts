/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsCnpjConstraint } from './is-cnpj-constraint';

export function IsCnpj(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsCnpj',
      target: object.constructor,   
      propertyName,
      options: validationOptions,
      validator: IsCnpjConstraint,
    });
  };
}
