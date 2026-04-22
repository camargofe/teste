const fs = require('fs');
const path = require('path');

// Ensure media directory exists in out
const mediaSrc = path.join(__dirname, '..', 'media');
const mediaDest = path.join(__dirname, '..', 'out', 'media');

if (!fs.existsSync(mediaDest)) {
  fs.mkdirSync(mediaDest, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  const items = fs.readdirSync(src);
  items.forEach(item => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

copyDir(mediaSrc, mediaDest);
console.log('Media files copied successfully');
