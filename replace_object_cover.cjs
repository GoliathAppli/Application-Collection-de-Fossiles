const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'views', 'FossilFormView.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/object-cover/g, 'object-contain');
fs.writeFileSync(file, content);
console.log('Updated object-cover to object-contain');
