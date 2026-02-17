import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Force Netlify rebuild - v3 - Timeline UX Deploy Fix
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Fix Google OAuth popup COOP issues and add CSP for development
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'credentialless',
      // Content Security Policy for development (more permissive for HMR)
      // TEMPORARY: Added 'unsafe-eval' to fix recharts/canvg CSP violations during debugging
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; media-src 'self' data: https: blob:; connect-src 'self' ws: https://*.supabase.co https://api.anthropic.com https://openrouter.ai https://api.openai.com https://accounts.google.com https://www.googleapis.com; frame-src https://accounts.google.com; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests",
      // Additional security headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
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
          'ai-vendor': ['openai'],
          // Timeline chunk splitting removed to prevent circular dependencies
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
