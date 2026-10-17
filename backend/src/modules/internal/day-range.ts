/**
 * Períodos do relatório de comissões sempre no horário de Brasília (UTC-3, sem horário de verão
 * desde 2019). NÃO dependem do fuso do servidor: o container de produção roda em UTC e a
 * máquina de desenvolvimento em BRT — com fuso local, "hoje" mudaria de lugar.
 */
const BRT_HOURS = 3;
const DATE_ONLY = /^(\d{4}-\d{2}-\d{2})/;

const pad = (n: number) => String(n).padStart(2, '0');

/** Início do dia ('YYYY-MM-DD') em Brasília. Valor que não é data cai no `new Date` comum. */
export function brtDayStart(value: string): Date {
  const m = DATE_ONLY.exec(value);
  return m ? new Date(`${m[1]}T00:00:00.000-03:00`) : new Date(value);
}

/** Último instante do dia ('YYYY-MM-DD') em Brasília. */
export function brtDayEnd(value: string): Date {
  const m = DATE_ONLY.exec(value);
  return m ? new Date(`${m[1]}T23:59:59.999-03:00`) : new Date(value);
}

/** Dia do calendário de Brasília ('YYYY-MM-DD') de um instante. */
export function brtDateString(at: Date): string {
  const shifted = new Date(at.getTime() - BRT_HOURS * 3600 * 1000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** Primeiro instante do mês (de Brasília) em que `at` cai. */
export function brtMonthStart(at: Date): Date {
  const [year, month] = brtDateString(at).split('-');
  return brtDayStart(`${year}-${month}-01`);
}
