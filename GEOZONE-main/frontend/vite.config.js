import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Đổi bằng VITE_PROXY_TARGET trong file .env nếu backend chạy cổng khác
  const target = env.VITE_PROXY_TARGET || 'http://localhost:5000';

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes, req) => {
              if (proxyRes.statusCode === 404) {
                console.warn(`[proxy] 404 từ backend ${target}: ${req.method} ${req.url}`);
              }
            });
            proxy.on('error', (err, req) => {
              console.error(`[proxy] Không kết nối được backend ${target}: ${req.url} (${err.code})`);
            });
          }
        }
      }
    }
  };
});
