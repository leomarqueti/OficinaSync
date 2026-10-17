/** decimal do SQL Server volta como string no driver; aqui vira number (ou null). */
export const decimalTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | number | null) =>
    value === null || value === undefined ? null : Number(value),
};
