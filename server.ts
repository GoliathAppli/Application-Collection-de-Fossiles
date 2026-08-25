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

  app.post("/api/download-app", async (req, res) => {
    try {
      const { data, banner } = req.body;
      const distPath = path.join(process.cwd(), 'dist', 'index.html');
      
      if (!fs.existsSync(distPath)) {
        await new Promise<void>((resolve, reject) => {
          exec('npx vite build', (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      }
      
      if (!fs.existsSync(distPath)) {
        return res.status(500).send("Erreur: Le fichier autonome n'a pas pu être compilé.");
      }
      
      let html = fs.readFileSync(distPath, 'utf8');
      
      if (data) {
        html = html.replace('window.__INITIAL_DATA__ = null;', `window.__INITIAL_DATA__ = ${data};`);
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
         html = html.replace('window.__INITIAL_BANNER__ = null;', `window.__INITIAL_BANNER__ = ${JSON.stringify(bannerContent)};`);
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
