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
  console.log('Generating API docs from', SERVER_URL || VITE_SERVER_URL);
  const child = childProcess.exec(
    `npx openapi-typescript ${SERVER_URL || VITE_SERVER_URL}/doc.json -o ./src/types/openapi.d.ts`,
  );
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
    try {
      getAPIDocs(env);
    } catch (e) {
      console.error('getAPIDocs error', e);
    }
  }
  return result;
});
