import { SetMetadata } from '@nestjs/common';

export const TOKEN_SCOPE_KEY = 'token_scope';

/** Escopo de JWT exigido pela rota. Sem o decorator, a rota exige 'access'. */
export const RequireTokenScope = (scope: 'access' | 'onboarding') =>
  SetMetadata(TOKEN_SCOPE_KEY, scope);
