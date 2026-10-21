import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.dirname(fileURLToPath(import.meta.url));
const uiRoot = path.resolve(root, '../../../packages/ui');

export default defineConfig({
  root,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.join(uiRoot, 'src'),
      react: path.join(uiRoot, 'node_modules/react'),
      'react-dom': path.join(uiRoot, 'node_modules/react-dom'),
      'react-router-dom': path.join(uiRoot, 'node_modules/react-router-dom'),
      '@mui/material': path.join(uiRoot, 'node_modules/@mui/material'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: { host: '127.0.0.1', port: 4176, strictPort: true },
});
