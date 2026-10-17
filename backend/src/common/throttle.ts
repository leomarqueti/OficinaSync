const DEFAULT_LIMIT = 60;

/**
 * Limite global de requisições por IP por minuto. Padrão 60; THROTTLE_LIMIT ajusta
 * (valor inválido ou < 1 volta pro padrão — a proteção nunca é desligada por engano).
 * Login/cadastro têm limite próprio, mais rígido, no AuthController.
 */
export function globalThrottleLimit(env: Record<string, string | undefined>): number {
  const parsed = Number.parseInt(env.THROTTLE_LIMIT ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : DEFAULT_LIMIT;
}
