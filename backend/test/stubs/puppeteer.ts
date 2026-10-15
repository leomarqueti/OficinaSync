// puppeteer@25 é ESM-only e não carrega no Jest (CJS). O e2e nunca gera PDF de verdade:
// a checagem de tenant do ReportService vem antes de abrir o navegador.
export default {
  launch: async (): Promise<never> => {
    throw new Error('puppeteer stub: geração de PDF não é exercitada no e2e');
  },
};
