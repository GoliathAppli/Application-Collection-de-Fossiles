import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

function standaloneCompatibilityPlugin(): Plugin {
  return {
    name: 'standalone-compatibility-plugin',
    closeBundle() {
      try {
        const distIndexPath = path.resolve(__dirname, 'dist', 'index.html');
        if (!fs.existsSync(distIndexPath)) return;

        let html = fs.readFileSync(distIndexPath, 'utf8');

        // 1. Remove modulepreload link tags
        html = html.replace(/<link[^>]*rel=["']modulepreload["'][^>]*>/gi, '');

        // 2. Remove crossorigin from style tags
        html = html.replace(/<style([^>]*)crossorigin([^>]*)>/gi, '<style$1$2>');

        // 3. Extract module script contents and convert to standard classic script at end of body
        const scripts: string[] = [];
        html = html.replace(/<script\s+type=["']module["'][^>]*>([\s\S]*?)<\/script>/gi, (_, scriptBody) => {
          scripts.push(scriptBody);
          return '';
        });

        // Also catch any other module scripts
        html = html.replace(/<script[^>]*type=["']module["'][^>]*>([\s\S]*?)<\/script>/gi, (_, scriptBody) => {
          scripts.push(scriptBody);
          return '';
        });

        if (scripts.length > 0) {
          const combinedScripts = scripts.map(s => `<script>\n${s}\n</script>`).join('\n');
          if (html.includes('</body>')) {
            html = html.replace('</body>', `${combinedScripts}\n</body>`);
          } else {
            html += `\n${combinedScripts}`;
          }
        }

        // Write back to dist/index.html
        fs.writeFileSync(distIndexPath, html, 'utf8');

        // Also copy to public/Mon_Exposition_Fossiles.html and public/app-bundle.html
        const publicDir = path.resolve(__dirname, 'public');
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        fs.writeFileSync(path.resolve(publicDir, 'Mon_Exposition_Fossiles.html'), html, 'utf8');
        fs.writeFileSync(path.resolve(publicDir, 'app-bundle.html'), html, 'utf8');
        fs.writeFileSync(path.resolve(__dirname, 'Mon_Exposition_Fossiles.html'), html, 'utf8');
        console.log('[Standalone] Mon_Exposition_Fossiles.html successfully sanitized and prepared for offline/file:// usage.');
      } catch (err) {
        console.warn('[Standalone] Post-processing notice:', err);
      }
    }
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), viteSingleFile(), standaloneCompatibilityPlugin()],
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
