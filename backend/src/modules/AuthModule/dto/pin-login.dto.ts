import { IsPhoneNumber, Matches } from 'class-validator';

export class PinLoginDto {
  @IsPhoneNumber()
  phone: string;

  @Matches(/^\d{6}$/, { message: 'O PIN tem 6 números.' })
  pin: string;
}
