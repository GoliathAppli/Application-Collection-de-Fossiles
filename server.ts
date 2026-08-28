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
    const standalonePath = path.join(process.cwd(), 'dist', 'Mon_Exposition_Fossiles.html');
    const publicBundle = path.join(process.cwd(), 'public', 'Mon_Exposition_Fossiles.html');
    const distPath = path.join(process.cwd(), 'dist', 'index.html');
    
    let targetPath = fs.existsSync(standalonePath) ? standalonePath : (fs.existsSync(publicBundle) ? publicBundle : (fs.existsSync(distPath) ? distPath : null));
    
    if (targetPath) {
      let raw = fs.readFileSync(targetPath, 'utf8');
      raw = raw.replace(/<link\s+[^>]*rel=["']modulepreload["'][^>]*>/gi, '');
      raw = raw.replace(/<script\b([^>]*)type=["']module["']([^>]*)>/gi, '<script$1$2>');
      raw = raw.replace(/<script\b([^>]*)crossorigin(?:="[^"]*")?([^>]*)>/gi, '<script$1$2>');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(raw);
    } else {
      res.status(404).send("Bundle in preparation");
    }
  });

  app.post("/api/download-app", async (req, res) => {
    try {
      const { data, banner } = req.body;
      const standalonePath = path.join(process.cwd(), 'dist', 'Mon_Exposition_Fossiles.html');
      const distPath = path.join(process.cwd(), 'dist', 'index.html');
      
      // Use pre-compiled bundle if available for instant download, or compile on demand if missing
      if (!fs.existsSync(distPath) && !fs.existsSync(standalonePath)) {
        await new Promise<void>((resolve, reject) => {
          exec('npx vite build', { env: { ...process.env, NODE_ENV: 'production' } }, (err, stdout, stderr) => {
            if (err) {
              console.error("Vite build error during download-app:", stderr || err);
              if (fs.existsSync(distPath) || fs.existsSync(standalonePath)) return resolve();
              return reject(err);
            }
            resolve();
          });
        });
      }
      
      const sourceFile = fs.existsSync(standalonePath) ? standalonePath : (fs.existsSync(distPath) ? distPath : null);
      if (!sourceFile) {
        return res.status(500).send("Erreur: Le fichier autonome n'a pas pu être compilé.");
      }
      
      let html = fs.readFileSync(sourceFile, 'utf8');
      
      // Guarantee classic script compatibility for double-click file:// execution
      html = html.replace(/<link\s+[^>]*rel=["']modulepreload["'][^>]*>/gi, '');
      html = html.replace(/<script\b([^>]*)type=["']module["']([^>]*)>/gi, '<script$1$2>');
      html = html.replace(/<script\b([^>]*)crossorigin(?:="[^"]*")?([^>]*)>/gi, '<script$1$2>');
      html = html.replace(/<style\b([^>]*)crossorigin(?:="[^"]*")?([^>]*)>/gi, '<style$1$2>');
      
      if (data) {
        let dataString = typeof data === 'string' ? data : JSON.stringify(data);
        const safeDataJson = dataString.split('</' + 'script').join('<\\/' + 'script');
        const scriptDataTag = '<' + 'script id="__FOSSIL_APP_INITIAL_DATA__" type="application/json">' + safeDataJson + '</' + 'script>';
        
        if (html.indexOf('id="__FOSSIL_APP_INITIAL_DATA__"') !== -1) {
          html = html.replace(
            /<script id="__FOSSIL_APP_INITIAL_DATA__" type="application\/json">[\s\S]*?<\/script>/,
            () => scriptDataTag
          );
        } else if (html.indexOf('window.__INITIAL_DATA__ = null;') !== -1) {
          html = html.replace('window.__INITIAL_DATA__ = null;', () => `window.__INITIAL_DATA__ = ${safeDataJson};`);
        } else {
          html = html.replace('<head>', () => `<head>${scriptDataTag}`);
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
         const bannerJson = JSON.stringify(bannerContent).split('</' + 'script').join('<\\/' + 'script');
         const scriptBannerTag = '<' + 'script id="__FOSSIL_APP_INITIAL_BANNER__" type="application/json">' + bannerJson + '</' + 'script>';
         if (html.indexOf('id="__FOSSIL_APP_INITIAL_BANNER__"') !== -1) {
           html = html.replace(
             /<script id="__FOSSIL_APP_INITIAL_BANNER__" type="application\/json">[\s\S]*?<\/script>/,
             () => scriptBannerTag
           );
         } else if (html.indexOf('window.__INITIAL_BANNER__ = null;') !== -1) {
           html = html.replace('window.__INITIAL_BANNER__ = null;', () => `window.__INITIAL_BANNER__ = ${bannerJson};`);
         } else {
           html = html.replace('<head>', () => `<head>${scriptBannerTag}`);
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
