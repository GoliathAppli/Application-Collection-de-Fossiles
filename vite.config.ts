import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

function standaloneCopyPlugin(): Plugin {
  return {
    name: 'standalone-copy-plugin',
    closeBundle() {
      try {
        const distIndexPath = path.resolve(__dirname, 'dist', 'index.html');
        if (!fs.existsSync(distIndexPath)) return;

        const html = fs.readFileSync(distIndexPath, 'utf8');

        // Copy to public/Mon_Exposition_Fossiles.html and root Mon_Exposition_Fossiles.html
        const publicDir = path.resolve(__dirname, 'public');
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        fs.writeFileSync(path.resolve(publicDir, 'Mon_Exposition_Fossiles.html'), html, 'utf8');
        fs.writeFileSync(path.resolve(publicDir, 'app-bundle.html'), html, 'utf8');
        fs.writeFileSync(path.resolve(__dirname, 'Mon_Exposition_Fossiles.html'), html, 'utf8');
        console.log('[Standalone] Mon_Exposition_Fossiles.html generated successfully.');
      } catch (err) {
        console.warn('[Standalone] Copy notice:', err);
      }
    }
  };
}

export default defineConfig(() => {
  return {
    mode: 'production',
    base: './',
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
      minify: 'esbuild' as const,
      cssMinify: true,
      sourcemap: false,
    },
    plugins: [
      react(),
      tailwindcss(),
      viteSingleFile(),
      standaloneCopyPlugin()
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
