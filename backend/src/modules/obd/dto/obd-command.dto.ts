import { IsIn } from 'class-validator';

export const OBD_COMMANDS = ['read_dtc', 'clear_dtc'] as const;
export type ObdCommand = (typeof OBD_COMMANDS)[number];

export class ObdCommandDto {
  @IsIn(OBD_COMMANDS)
  command: ObdCommand;
}
