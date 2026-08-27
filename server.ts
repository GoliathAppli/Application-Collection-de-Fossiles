import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { exec } from "child_process";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Augment body limit
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Explicit route to serve the complete self-contained offline bundle for PWA and offline precache
  app.get(['/app-bundle.html', '/Mon_Exposition_Fossiles.html'], (req, res) => {
    const distPath = path.join(process.cwd(), 'dist', 'index.html');
    const publicBundle = path.join(process.cwd(), 'public', 'Mon_Exposition_Fossiles.html');
    if (fs.existsSync(distPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.sendFile(distPath);
    } else if (fs.existsSync(publicBundle)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.sendFile(publicBundle);
    } else {
      res.status(404).send("Bundle in preparation");
    }
  });

  app.post("/api/download-app", async (req, res) => {
    try {
      const { data, banner } = req.body;
      const distPath = path.join(process.cwd(), 'dist', 'index.html');
      
      // Always freshly compile the standalone bundle if in development mode or if dist is missing
      if (process.env.NODE_ENV !== 'production' || !fs.existsSync(distPath)) {
        await new Promise<void>((resolve, reject) => {
          exec('npx vite build', (err, stdout, stderr) => {
            if (err) {
              console.error("Vite build error during download-app:", stderr || err);
              if (fs.existsSync(distPath)) return resolve();
              return reject(err);
            }
            try {
              if (fs.existsSync(distPath)) {
                fs.copyFileSync(distPath, path.join(process.cwd(), 'Mon_Exposition_Fossiles.html'));
                const publicDir = path.join(process.cwd(), 'public');
                if (fs.existsSync(publicDir)) {
                  fs.copyFileSync(distPath, path.join(publicDir, 'Mon_Exposition_Fossiles.html'));
                }
              }
            } catch (copyErr) {
              console.warn("Notice during standalone file copy:", copyErr);
            }
            resolve();
          });
        });
      }
      
      if (!fs.existsSync(distPath)) {
        return res.status(500).send("Erreur: Le fichier autonome n'a pas pu être compilé.");
      }
      
      let html = fs.readFileSync(distPath, 'utf8');
      
      if (data) {
        let dataString = typeof data === 'string' ? data : JSON.stringify(data);
        const safeDataJson = dataString.replace(/<\/script/gi, '<\\/script');
        
        if (html.includes('id="__FOSSIL_APP_INITIAL_DATA__"')) {
          html = html.replace(
            /<script id="__FOSSIL_APP_INITIAL_DATA__" type="application\/json">[\s\S]*?<\/script>/,
            () => `<script id="__FOSSIL_APP_INITIAL_DATA__" type="application/json">${safeDataJson}</script>`
          );
        } else if (html.includes('window.__INITIAL_DATA__ = null;')) {
          html = html.replace('window.__INITIAL_DATA__ = null;', () => `window.__INITIAL_DATA__ = ${safeDataJson};`);
        } else {
          html = html.replace('<head>', () => `<head><script id="__FOSSIL_APP_INITIAL_DATA__" type="application/json">${safeDataJson}</script>`);
        }
      }
      
      let bannerContent = banner;
      if (!bannerContent || bannerContent === '/banner.png') {
         try {
           const bannerPath = path.join(process.cwd(), 'public', 'banner.png');
           if (fs.existsSync(bannerPath)) {
             const bannerBuffer = fs.readFileSync(bannerPath);
             bannerContent = 'data:image/png;base64,' + bannerBuffer.toString('base64');
           }
         } catch(e) {
           console.error("banner read error", e);
         }
      }
      
      if (bannerContent) {
         const bannerJson = JSON.stringify(bannerContent).replace(/<\/script/gi, '<\\/script');
         if (html.includes('id="__FOSSIL_APP_INITIAL_BANNER__"')) {
           html = html.replace(
             /<script id="__FOSSIL_APP_INITIAL_BANNER__" type="application\/json">[\s\S]*?<\/script>/,
             () => `<script id="__FOSSIL_APP_INITIAL_BANNER__" type="application/json">${bannerJson}</script>`
           );
         } else if (html.includes('window.__INITIAL_BANNER__ = null;')) {
           html = html.replace('window.__INITIAL_BANNER__ = null;', () => `window.__INITIAL_BANNER__ = ${bannerJson};`);
         } else {
           html = html.replace('<head>', () => `<head><script id="__FOSSIL_APP_INITIAL_BANNER__" type="application/json">${bannerJson}</script>`);
         }
      }
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="Mon_Exposition_Fossiles.html"');
      res.send(html);
    } catch (e: any) {
      console.error(e);
      res.status(500).send("Erreur serveur lors de la génération de l'application autonome: " + (e?.message || e));
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const publicPath = path.join(process.cwd(), 'public');
    app.use(express.static(publicPath));
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
