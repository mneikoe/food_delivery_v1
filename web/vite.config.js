import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//https://www.chatoraadda.in
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://www.chatoraadda.in',
       // target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/uploads': {
        target: 'https://www.chatoraadda.in',
       // target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
})
