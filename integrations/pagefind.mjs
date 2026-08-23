// Pagefind static search: indexes `dist/` after every build and, during
// `astro dev`, serves the last built index so /search works locally.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const MIME = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
};

let projectRoot = process.cwd();

export default function pagefindIntegration() {
  return {
    name: 'pagefind',
    hooks: {
      'astro:config:setup': ({ config }) => {
        projectRoot = fileURLToPath(config.root);
      },
      'astro:build:done': ({ dir, logger }) => {
        const sitePath = fileURLToPath(dir);
        const bin = path.join(projectRoot, 'node_modules', '.bin', 'pagefind');
        execFileSync(bin, ['--site', sitePath], { stdio: 'inherit' });
        logger.info('Search index generated');
      },
      'astro:server:setup': ({ server }) => {
        server.middlewares.use('/pagefind', (req, res, next) => {
          const requested = path.normalize(new URL(req.url, 'http://localhost').pathname);
          const filePath = path.join(projectRoot, 'dist', 'pagefind', requested);
          if (!filePath.startsWith(path.join(projectRoot, 'dist', 'pagefind'))) return next();
          fs.readFile(filePath, (err, data) => {
            if (err) return next();
            res.setHeader('Content-Type', MIME[path.extname(filePath)] ?? 'application/octet-stream');
            res.end(data);
          });
        });
      },
    },
  };
}
