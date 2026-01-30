import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Force Netlify rebuild - v2
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize chunk splitting for better loading
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            'lucide-react'
          ],
          'data-vendor': ['@supabase/supabase-js', '@tanstack/react-query'],
          'chart-vendor': ['recharts'],
          // Heavy libraries in separate chunks (loaded on demand)
          'office-vendor': ['pptxgenjs', 'docx', '@react-pdf/renderer'],
          'canvas-vendor': ['html2canvas', 'canvg', 'jspdf'],
          'ai-vendor': ['openai']
        }
      }
    },
    // Increase chunk size warning limit since we're optimizing
    chunkSizeWarningLimit: 1000,
    // Enable source maps for debugging (disable for production)
    sourcemap: mode === 'development',
    // Optimize for production
    minify: mode === 'production' ? 'terser' : false,
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      }
    } : undefined
  }
}));
