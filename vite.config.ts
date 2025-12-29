import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const parsePort = (value?: string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const cliPort = parsePort(process.env.npm_config_port);
  const envPort = parsePort(process.env.PORT);
  const serverPort = cliPort ?? envPort ?? 5173;
  const clientPort = isVercel ? 3000 : serverPort;

    return {
      server: {
        host: '0.0.0.0',
        port: serverPort,
        strictPort: false,
        origin: isVercel ? 'http://localhost:3000' : undefined,
        hmr: {
          host: isVercel ? 'localhost' : '127.0.0.1',
          port: serverPort,
          clientPort, // when under vercel dev, websocket goes via 3000 proxy
          protocol: 'ws',
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
