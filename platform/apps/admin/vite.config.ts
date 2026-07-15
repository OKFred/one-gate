import { defineConfig } from 'vite';
import { loadEnv } from 'vite';
import path from 'path';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import childProcess from 'child_process';
import babel from '@rolldown/plugin-babel';
import { federation } from '@module-federation/vite';

const pathUiSrc = path.resolve(__dirname, '../../packages/ui/src');

async function getAPIDocs(env: { SERVER_URL?: string; VITE_SERVER_URL?: string }) {
  const { SERVER_URL, VITE_SERVER_URL } = env;
  const baseUrl = SERVER_URL || VITE_SERVER_URL;
  if (!baseUrl) return;
  const docUrl = `${baseUrl}/doc.json`;

  // 1. 生成 TypeScript 类型，输出到共享包 @hodor/ui
  const command = `npx openapi-typescript ${docUrl} -o ../../packages/ui/src/types/openapi.d.ts`;
  console.log('Executing command:', command);
  childProcess.exec(command);
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  let env = {
    SERVER_URL: '',
    VITE_SERVER_URL: '',
  } as {
    SERVER_URL?: string;
    VITE_SERVER_URL?: string;
  };

  // 加载当前根目录下的环境变量配置
  env = { ...env, ...loadEnv(mode, path.resolve(__dirname, '../../')) };

  const result = {
    root: __dirname,
    publicDir: path.resolve(__dirname, '../../public'),
    resolve: {
      alias: {
        '@/': pathUiSrc + '/',
      },
    },
    server: { port: 5173, proxy: {} },
    plugins: [
      react(),
      babel({
        presets: [reactCompilerPreset()],
      }),
      federation({
        name: 'admin',
        dts: false,
        remotes: {},
        shared: {
          react: { singleton: true, requiredVersion: '^19.2.3' },
          'react-dom': { singleton: true, requiredVersion: '^19.2.3' },
          'react-router-dom': { singleton: true, requiredVersion: '^7.16.0' },
          '@mui/material': { singleton: true },
          '@emotion/react': { singleton: true },
          '@emotion/styled': { singleton: true },
          '@hodor/ui': { singleton: true },
        },
      }),
    ],
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@mui/material',
        '@mui/icons-material',
        '@emotion/react',
        '@emotion/styled',
        '@iconify/react',
        'axios',
      ],
    },
    build: {
      target: 'esnext',
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
    getAPIDocs(env).catch((err) => {
      console.error('Error generating API docs:', err);
    });
  }
  return result;
});
