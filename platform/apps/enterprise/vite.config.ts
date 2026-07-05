import { defineConfig } from 'vite';
import { loadEnv } from 'vite';
import path from 'path';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import UnoCSS from 'unocss/vite';

const pathUiSrc = path.resolve(__dirname, '../../packages/ui/src');

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  let env = {
    SERVER_URL: '',
    VITE_SERVER_URL: '',
  } as {
    SERVER_URL?: string;
    VITE_SERVER_URL?: string;
  };
  
  env = { ...env, ...loadEnv(mode, path.resolve(__dirname, '../../')) };
  
  const result = {
    root: __dirname,
    publicDir: path.resolve(__dirname, '../../public'),
    resolve: {
      alias: {
        '@/': pathUiSrc + '/',
      },
    },
    server: { port: 5174, proxy: {} },
    plugins: [
      react(),
      babel({
        presets: [reactCompilerPreset()],
      }),
      UnoCSS({
        configFile: '../../uno.config.ts'
      }),
    ],
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@mui/material',
        '@mui/icons-material',
      ],
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (
                id.includes('react') ||
                id.includes('react-dom') ||
                id.includes('react-router-dom') ||
                id.includes('react-router')
              ) {
                return 'react-vendor';
              }
              if (id.includes('@mui/material')) {
                return 'mui-vendor';
              }
              if (id.includes('@mui/icons-material')) {
                return 'mui-icons';
              }
            }
          },
        },
      },
    },
  };
  
  if (mode === 'development') {
    if (env.SERVER_URL || env.VITE_SERVER_URL) {
      result.server.proxy = {
        '/api': {
          target: env.SERVER_URL || env.VITE_SERVER_URL,
          ws: false,
          changeOrigin: true,
        },
      };
    }
  }
  return result;
});
