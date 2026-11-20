/**
 * Quita "workspaces" anidados de dependencias (p.ej. vitefu) que en Windows
 * provocan errores ENOENT raros al resolver workspaces de npm.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['node_modules/vitefu/package.json'];

for (const rel of targets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  try {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (pkg.workspaces) {
      delete pkg.workspaces;
      fs.writeFileSync(file, `${JSON.stringify(pkg, null, '\t')}\n`);
      console.log(`[fix-npm] workspaces removidos de ${rel}`);
    }
  } catch (err) {
    console.warn(`[fix-npm] No se pudo parchear ${rel}:`, err.message);
  }
}

const lockPath = path.join(root, 'package-lock.json');
if (fs.existsSync(lockPath)) {
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    const vitefu = lock.packages?.['node_modules/vitefu'];
    if (vitefu?.workspaces) {
      delete vitefu.workspaces;
      fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
      console.log('[fix-npm] workspaces removidos de package-lock (vitefu)');
    }
  } catch (err) {
    console.warn('[fix-npm] No se pudo parchear package-lock:', err.message);
  }
}
