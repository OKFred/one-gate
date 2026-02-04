import { defineConfig } from 'vite';
import { loadEnv } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react-swc';
import UnoCSS from 'unocss/vite';
import childProcess from 'child_process';

const pathSrc = path.resolve(__dirname, 'src');

async function getAPIDocs(env: { SERVER_URL?: string; VITE_SERVER_URL?: string }) {
  //npx openapi-typescript SERVER_URL/doc.json -o ./types/openapi.d.ts
  const { SERVER_URL, VITE_SERVER_URL } = env;
  const command = `npx openapi-typescript ${SERVER_URL || VITE_SERVER_URL}/doc.json -o ./src/types/openapi.d.ts`;
  console.log('Executing command:', command);
  const child = childProcess.exec(command);
  await new Promise((resolve, reject) => {
    child.on('close', (code) => {
      if (code === 0) {
        resolve(null);
      } else {
        reject(new Error(code?.toString()));
      }
    });
  });
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  let env = {
    SERVER_URL: '',
    VITE_SERVER_URL: '',
  } as {
    SERVER_URL?: string;
    VITE_SERVER_URL?: string;
  };
  if (command === 'build') {
    const { SERVER_URL } = process.env;
    env = { SERVER_URL };
  }
  env = { ...env, ...loadEnv(mode, process.cwd()) };
  const result = {
    resolve: {
      alias: {
        '@/': pathSrc + '/',
      },
    },
    server: { proxy: {} },
    plugins: [react(), UnoCSS()],
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@mui/material',
        '@mui/icons-material',
        '@iconify/react',
        '@iconify-json/material-symbols',
        'axios',
      ],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'mui-vendor': ['@mui/material'],
            'mui-icons': ['@mui/icons-material'],
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
          // rewrite: (path: string) => path.replace(new RegExp(`^/api`), ""),
        },
      };
    }
    getAPIDocs(env).catch((err) => {
      console.error('Error generating API docs:', err);
    });
  }
  return result;
});
