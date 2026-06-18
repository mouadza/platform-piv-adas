import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      all: false,
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/api/index.js',
        'src/utils/authStorage.js',
        'src/utils/globalGammeComments.js',
        'src/utils/modifiedGammeExcelDownload.js',
        'src/utils/projectKPI.js',
        'src/utils/roles.js',
        'src/components/validation/validationConstants.js',
      ],
      exclude: [
        'src/**/*.test.{js,jsx}',
        'src/main.jsx',
      ],
    },
  },
  server: {
    proxy: {
      '/admin_config': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  define: {
    global: 'globalThis',
  }
})
