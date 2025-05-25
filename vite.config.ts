import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@utils': path.resolve(__dirname, './src/utils'),
      'pdfjs-dist': path.resolve(__dirname, 'node_modules/pdfjs-dist/legacy/build/pdf')
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
  },
  optimizeDeps: {
    include: [
      'pdfjs-dist',
      'mammoth',
      'jspdf'
    ],
    exclude: ['pdfjs-dist/legacy/build/pdf.worker.js']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist'],
          mammoth: ['mammoth'],
          jspdf: ['jspdf']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    fs: {
      strict: false
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
});