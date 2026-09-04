// Dev-only Medium-style editor for the content collections.
// Routes and API middleware are registered exclusively during `astro dev`;
// `astro build` never sees them, so nothing ships to production.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const IMAGES_DIR = 'public/images/blog';
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,49}$/;
const CATEGORY_RE = /^[a-z][a-z0-9-]{0,29}$/;
// Shared with src/content.config.ts, so the schema and the editor never drift.
const CATEGORIES_FILE = 'src/data/categories.json';

// Collections the editor can write to. `menu` is the top nav entry and `sub` the
// submenu under it (null when the menu has no submenu), mirroring NavBar.astro.
const COLLECTIONS = {
  journaling: { dir: 'src/content/journaling', menu: 'writing', sub: 'journaling', nav: '/writing/journaling', maxTitle: 50, full: true },
  trinos: { dir: 'src/content/trinos', menu: 'writing', sub: 'trinos', nav: '/writing/trinos', maxTitle: 80, full: false },
  ensayo: { dir: 'src/content/ensayo', menu: 'writing', sub: 'ensayo', nav: '/writing/ensayo', maxTitle: 50, full: true },
  microfiction: { dir: 'src/content/microfiction', menu: 'microfiction', sub: null, nav: '/microfiction', maxTitle: 80, full: false },
  audiofilia: { dir: 'src/content/audiofilia', menu: 'audiofilia', sub: null, nav: '/audiofilia', maxTitle: 80, full: false },
};

let projectRoot = process.cwd();

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { frontmatter: {}, body: raw };
  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (/^".*"$/.test(value)) value = value.slice(1, -1).replaceAll('\\"', '"');
    if (key === 'id' || key === 'readingTime') frontmatter[key] = Number(value);
    else if (key === 'isDraft') frontmatter[key] = value === 'true';
    else frontmatter[key] = value;
  }
  return { frontmatter, body: raw.slice(match[0].length) };
}

function serializeFrontmatter(fm, collection) {
  const quote = (s) => `"${String(s).replaceAll('"', '\\"')}"`;
  const lines = [];
  if (COLLECTIONS[collection].full) lines.push(`id: ${fm.id}`);
  lines.push(`slug: ${quote(fm.slug)}`, `title: ${quote(fm.title)}`, `publishedDate: ${fm.publishedDate}`);
  if (COLLECTIONS[collection].full) {
    lines.push(`category: ${quote(fm.category)}`);
    if (fm.readingTime != null) lines.push(`readingTime: ${fm.readingTime}`);
  }
  lines.push(`isDraft: ${fm.isDraft}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

async function readCategories() {
  return JSON.parse(await fs.readFile(path.join(projectRoot, CATEGORIES_FILE), 'utf8'));
}

function validatePost({ collection, frontmatter: fm, body }, categories) {
  const col = COLLECTIONS[collection];
  if (!col) return 'collection inválida';
  if (!fm || typeof body !== 'string') return 'Payload incompleto';
  if (!SLUG_RE.test(fm.slug ?? '')) return 'slug inválido (kebab-case, máx 50)';
  if (!fm.title || fm.title.length > col.maxTitle) return `title requerido (máx ${col.maxTitle})`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.publishedDate ?? '')) return 'publishedDate inválida (YYYY-MM-DD)';
  if (typeof fm.isDraft !== 'boolean') return 'isDraft requerido';
  if (col.full) {
    if (!Number.isInteger(fm.id) || fm.id < 1) return 'id inválido';
    if (!categories.includes(fm.category)) return 'category inválida';
  }
  return null;
}

async function readCollection(collection) {
  const dir = path.join(projectRoot, COLLECTIONS[collection].dir);
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.md'));
  const entries = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(dir, file), 'utf8');
    const { frontmatter, body } = parseFrontmatter(raw);
    entries.push({ file, collection, nav: COLLECTIONS[collection].nav, frontmatter, body });
  }
  return entries;
}

// The filename does not always match the slug, so resolve entries by frontmatter.
async function findEntry(collection, slug) {
  const entries = await readCollection(collection);
  return entries.find((e) => e.frontmatter.slug === slug) ?? null;
}

async function readBody(req, limit = 25 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('Body demasiado grande');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

async function handleApi(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean); // ['posts', collection?, slug?]

  if (req.method === 'GET' && parts[0] === 'posts' && parts.length === 1) {
    const posts = [];
    for (const name of Object.keys(COLLECTIONS)) {
      for (const e of await readCollection(name)) {
        posts.push({ collection: e.collection, nav: e.nav, file: e.file, ...e.frontmatter });
      }
    }
    posts.sort((a, b) => (a.publishedDate < b.publishedDate ? 1 : -1));
    const collections = Object.fromEntries(Object.entries(COLLECTIONS).map(([k, v]) => [k, { nav: v.nav, menu: v.menu, sub: v.sub, full: v.full, maxTitle: v.maxTitle }]));
    return sendJson(res, 200, { posts, categories: await readCategories(), collections });
  }

  if (req.method === 'GET' && parts[0] === 'posts' && parts.length === 3) {
    const [, collection, slug] = parts;
    if (!COLLECTIONS[collection] || !SLUG_RE.test(slug)) return sendJson(res, 400, { error: 'ruta inválida' });
    const entry = await findEntry(collection, slug);
    if (!entry) return sendJson(res, 404, { error: 'Post no encontrado' });
    return sendJson(res, 200, { collection, nav: entry.nav, frontmatter: entry.frontmatter, body: entry.body });
  }

  if (req.method === 'POST' && parts[0] === 'posts') {
    const payload = JSON.parse(await readBody(req));
    const error = validatePost(payload, await readCategories());
    if (error) return sendJson(res, 400, { error });
    const { collection, fromCollection, frontmatter: fm, body } = payload;
    // Moving between collections: write in the target, then drop the original file.
    const moving = Boolean(fromCollection) && fromCollection !== collection;
    if (moving && !COLLECTIONS[fromCollection]) return sendJson(res, 400, { error: 'collection de origen inválida' });
    const existing = await findEntry(collection, fm.slug);
    if (moving && existing) return sendJson(res, 409, { error: `Ya hay un post con el slug "${fm.slug}" en ${collection}` });
    const fileName = existing?.file ?? `${fm.slug}.md`;
    const filePath = path.join(projectRoot, COLLECTIONS[collection].dir, fileName);
    const content = serializeFrontmatter(fm, collection) + '\n' + body.replace(/\s+$/, '') + '\n';
    await fs.writeFile(filePath, content, 'utf8');
    if (moving) {
      const previous = await findEntry(fromCollection, fm.slug);
      if (previous) await fs.rm(path.join(projectRoot, COLLECTIONS[fromCollection].dir, previous.file));
    }
    return sendJson(res, 200, { ok: true, file: fileName, collection, moved: moving });
  }

  if (req.method === 'POST' && parts[0] === 'categories') {
    const value = String(JSON.parse(await readBody(req)).name ?? '').trim().toLowerCase();
    if (!CATEGORY_RE.test(value)) return sendJson(res, 400, { error: 'Categoría inválida (minúsculas y guiones, máx 30)' });
    const categories = await readCategories();
    if (categories.includes(value)) return sendJson(res, 409, { error: `La categoría "${value}" ya existe` });
    const next = [...categories, value];
    await fs.writeFile(path.join(projectRoot, CATEGORIES_FILE), `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    return sendJson(res, 200, { categories: next, added: value });
  }

  if (req.method === 'POST' && parts[0] === 'upload') {
    const { name, dataBase64 } = JSON.parse(await readBody(req));
    const ext = path.extname(name ?? '').toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) return sendJson(res, 400, { error: 'Extensión no permitida' });
    const base = path.basename(name, ext).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'imagen';
    const dir = path.join(projectRoot, IMAGES_DIR);
    await fs.mkdir(dir, { recursive: true });
    let fileName = `${base}${ext}`;
    let counter = 1;
    while (await fs.access(path.join(dir, fileName)).then(() => true, () => false)) {
      fileName = `${base}-${counter++}${ext}`;
    }
    await fs.writeFile(path.join(dir, fileName), Buffer.from(dataBase64, 'base64'));
    return sendJson(res, 200, { url: `/images/blog/${fileName}` });
  }

  return sendJson(res, 404, { error: 'Ruta no encontrada' });
}

export default function editorIntegration() {
  return {
    name: 'blog-editor-dev',
    hooks: {
      'astro:config:setup': ({ command, config, injectRoute }) => {
        if (command !== 'dev') return;
        projectRoot = fileURLToPath(config.root);
        injectRoute({
          pattern: '/_editor',
          entrypoint: './editor/pages/editor.astro',
          prerender: false,
        });
      },
      'astro:server:setup': ({ server }) => {
        server.middlewares.use('/_editor/api', (req, res) => {
          handleApi(req, res).catch((err) => sendJson(res, 500, { error: String(err.message ?? err) }));
        });
      },
    },
  };
}
