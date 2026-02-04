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
    // Fix Google OAuth popup COOP issues and add CSP for development
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'credentialless',
      // Content Security Policy for development (more permissive for HMR)
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://accounts.google.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' ws: https://*.supabase.co https://api.anthropic.com https://openrouter.ai https://api.openai.com https://accounts.google.com https://www.googleapis.com; frame-src https://accounts.google.com; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests",
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
    // Optimize chunk splitting for better loading and cache invalidation
    rollupOptions: {
      output: {
        // Improved chunk naming with hash for cache busting
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '') || 'chunk'
            : 'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'assets/entry-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',

        manualChunks: (id) => {
          // Dynamic chunking strategy to prevent chunk load errors
          if (id.includes('node_modules')) {
            // Core React dependencies - these change rarely
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }

            // UI components - moderate change frequency
            if (id.includes('@radix-ui') || id.includes('lucide-react')) {
              return 'ui-vendor';
            }

            // Data handling libraries - moderate change frequency
            if (id.includes('@supabase') || id.includes('@tanstack/react-query')) {
              return 'data-vendor';
            }

            // Chart libraries - rarely used, load on demand
            if (id.includes('recharts')) {
              return 'chart-vendor';
            }

            // Heavy document libraries - load on demand
            if (id.includes('pptxgenjs') || id.includes('docx') || id.includes('@react-pdf')) {
              return 'office-vendor';
            }

            // Canvas and PDF libraries - load on demand
            if (id.includes('html2canvas') || id.includes('canvg') || id.includes('jspdf')) {
              return 'canvas-vendor';
            }

            // AI libraries - load on demand
            if (id.includes('openai')) {
              return 'ai-vendor';
            }

            // All other node_modules - generic vendor chunk
            return 'vendor';
          }

          // Application code chunking by feature
          if (id.includes('/pages/')) {
            const page = id.split('/pages/')[1].split('/')[0];
            return `page-${page}`;
          }

          if (id.includes('/components/')) {
            // Keep commonly used components in main chunk
            if (id.includes('/ui/') || id.includes('/ErrorBoundary') || id.includes('/ChunkLoadErrorHandler')) {
              return 'ui-common';
            }
            return 'components';
          }
        }
      }
    },

    // Improve build reliability
    chunkSizeWarningLimit: 1000,
    sourcemap: mode === 'development',
    minify: mode === 'production' ? 'terser' : false,

    // Enhanced terser options for better error handling
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: true,
        drop_debugger: true,
        // Keep function names for better error reporting
        keep_fnames: true,
      },
      mangle: {
        // Keep class names for better error reporting
        keep_classnames: true,
      }
    } : undefined,

    // Ensure assets are properly versioned
    assetsDir: 'assets',

    // Build target for better compatibility
    target: 'es2020'
  }
}));
