import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Lógica pura (src/lib) e componentes renderizados em HTML estático (react-dom/server).
// React vem do node_modules do FRONTEND (mesma instância que os componentes usam).
const FRONT = path.resolve(import.meta.dirname, '../frontend/oficinasync-web');
const NM = path.join(FRONT, 'node_modules');

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: path.join(FRONT, 'src') + '/' },
      { find: /^react$/, replacement: path.join(NM, 'react') },
      { find: /^react\/(.*)$/, replacement: path.join(NM, 'react') + '/$1' },
      { find: /^react-dom\/(.*)$/, replacement: path.join(NM, 'react-dom') + '/$1' },
    ],
  },
  test: {
    include: ['unit/**/*.test.ts', 'unit/**/*.test.tsx'],
    environment: 'node',
  },
});
