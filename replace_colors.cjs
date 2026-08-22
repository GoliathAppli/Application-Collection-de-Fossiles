const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'src');

const replacements = [
  { from: /#FAF7F2/g, to: '#F2E8DA' },
  { from: /#D8D0C5/g, to: '#C5A880' },
  { from: /#EAE6DF/g, to: '#E3D1B8' },
  { from: /#2D2A26/g, to: '#000000' },
  { from: /#A88143/g, to: '#8B5A2B' },
  { from: /#5D5A56/g, to: '#45311D' },
];

function walk(currentDir) {
  const files = fs.readdirSync(currentDir);
  for (const file of files) {
    const p = path.join(currentDir, file);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      let content = fs.readFileSync(p, 'utf8');
      let changed = false;
      for (const r of replacements) {
        if (content.match(r.from)) {
          content = content.replace(r.from, r.to);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(p, content);
        console.log(`Updated ${p}`);
      }
    }
  }
}
walk(dir);
