import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    viteCompression({
      verbose: false,
      disable: false,
      threshold: 1024,
      algorithm: 'gzip',
      ext: '.gz',
    }),
    viteCompression({
      verbose: false,
      disable: false,
      threshold: 1024,
      algorithm: 'brotliCompress',
      ext: '.br',
    })
  ],
  server: {
    allowedHosts: true,
    host: '127.0.0.1',
    port: 5300,
    strictPort: false
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: 'esbuild',
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        manualChunks(id) {
          if (id.includes('node_modules/react-dom')) return 'vendor-dom'
          if (id.includes('node_modules/react/')) return 'vendor-react'
          if (id.includes('node_modules/framer-motion')) return 'vendor-anim'
          if (id.includes('node_modules/recharts')) return 'vendor-charts'
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons'
          if (id.includes('node_modules/react-router')) return 'vendor-router'
          if (id.includes('node_modules/socket.io-client')) return 'vendor-socket'
          if (id.includes('node_modules/date-fns')) return 'vendor-date'
        }
      }
    }
  }
})
