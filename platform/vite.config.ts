import { defineConfig } from 'vite';
import { loadEnv } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react-swc';
import UnoCSS from 'unocss/vite';
import childProcess from 'child_process';
import fs from 'fs/promises';
import axios from 'axios';

const pathSrc = path.resolve(__dirname, 'src');

async function getAPIDocs(env: { SERVER_URL?: string; VITE_SERVER_URL?: string }) {
  const { SERVER_URL, VITE_SERVER_URL } = env;
  const baseUrl = SERVER_URL || VITE_SERVER_URL;
  if (!baseUrl) return;
  const docUrl = `${baseUrl}/doc.json`;
  // 1. 生成 TypeScript 类型 (保持原有逻辑)
  const command = `npx openapi-typescript ${docUrl} -o ./src/types/openapi.d.ts`;
  console.log('Executing command:', command);
  childProcess.exec(command);

  // 2. 处理并拆分 JSON Schemas
  try {
    const response = await axios.get(docUrl);
    const doc = response.data;
    const schemas = doc.components?.schemas;

    if (schemas) {
      const outputDir = path.resolve(__dirname, 'src/assets/schemas');
      await fs.mkdir(outputDir, { recursive: true });

      // 递归删除无用字段的函数
      const cleanSchema = (obj: Record<string, unknown>) => {
        if (typeof obj !== 'object' || obj === null) return;
        const keysToRemove = ['description', 'examples', 'default', 'x-displayName', 'x-id'];
        keysToRemove.forEach((key) => delete obj[key]);
        Object.values(obj).forEach((value) => {
          if (typeof value === 'object' && value !== null) {
            cleanSchema(value as Record<string, unknown>);
          }
        });
      };

      for (const [name, schema] of Object.entries(schemas)) {
        const cleaned = JSON.parse(JSON.stringify(schema));
        cleanSchema(cleaned);
        await fs.writeFile(path.join(outputDir, `${name}.json`), JSON.stringify(cleaned, null, 2));
      }
      console.log(`Successfully generated ${Object.keys(schemas).length} schemas.`);
    }
  } catch (error) {
    console.error('Failed to split schemas:', error);
  }
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
