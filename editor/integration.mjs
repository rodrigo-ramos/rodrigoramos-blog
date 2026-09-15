// Dev-only Medium-style editor for the content collections.
// Routes and API middleware are registered exclusively during `astro dev`;
// `astro build` never sees them, so nothing ships to production.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const IMAGES_DIR = 'public/images/blog';
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,49}$/;

// El editor escribe entregas de novelas: una "collection" por obra, descubierta
// leyendo src/content/novels/. Crear una novela nueva es crear su carpeta; el
// editor la muestra sola, sin tocar este archivo.
const NOVELS_DIR = 'src/content/novels';

async function collections() {
  const root = path.join(projectRoot, NOVELS_DIR);
  const dirs = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const out = {};
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const obra = path.join(root, dir.name, 'obra.md');
    const exists = await fs.access(obra).then(() => true, () => false);
    if (!exists) continue;
    const { frontmatter } = parseFrontmatter(await fs.readFile(obra, 'utf8'));
    await fs.mkdir(path.join(root, dir.name, 'installments'), { recursive: true });
    out[dir.name] = {
      dir: `${NOVELS_DIR}/${dir.name}/installments`,
      sub: frontmatter.title ?? dir.name,
      nav: `/novelas/${dir.name}`,
      maxTitle: 80,
    };
  }
  return out;
}

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
    if (/^\[.*\]$/.test(value)) {
      frontmatter[key] = JSON.parse(value);
      continue;
    }
    if (/^".*"$/.test(value)) value = value.slice(1, -1).replaceAll('\\"', '"');
    if (key === 'id' || key === 'readingTime') frontmatter[key] = Number(value);
    else if (key === 'isDraft') frontmatter[key] = value === 'true';
    else frontmatter[key] = value;
  }
  return { frontmatter, body: raw.slice(match[0].length) };
}

// El frontmatter de una entrega: la obra sale de la carpeta y el numero del
// orden de publicacion, asi que aqui no hay nada mas que escribir.
function serializeFrontmatter(fm) {
  const quote = (s) => `"${String(s).replaceAll('"', '\\"')}"`;
  const lines = [
    `slug: ${quote(fm.slug)}`,
    `title: ${quote(fm.title)}`,
    `publishedDate: ${fm.publishedDate}`,
    `isDraft: ${fm.isDraft}`,
  ];
  return `---\n${lines.join('\n')}\n---\n`;
}

const NOVEL_STATUS = ['en-curso', 'completa', 'pausada'];
const PHOSPHORS = ['ambar', 'verde', 'cian', 'magenta', 'violeta', 'rojo', 'blanco'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function serializeNovel(fm) {
  const quote = (s) => `"${String(s).replaceAll('"', '\\"')}"`;
  const lines = [
    `slug: ${quote(fm.slug)}`,
    `title: ${quote(fm.title)}`,
    `tagline: ${quote(fm.tagline)}`,
    `synopsis: ${quote(fm.synopsis)}`,
    `status: ${quote(fm.status)}`,
    `phosphor: ${quote(fm.phosphor)}`,
    `sigil: ${quote(fm.sigil)}`,
    `genre: ${JSON.stringify(fm.genre)}`,
    `startedDate: ${fm.startedDate}`,
    `isDraft: ${fm.isDraft}`,
  ];
  return `---\n${lines.join('\n')}\n---\n`;
}

function validateNovel({ slug, frontmatter: fm }) {
  if (!SLUG_RE.test(slug ?? '')) return 'slug inválido (kebab-case, máx 50)';
  if (!fm) return 'Payload incompleto';
  if (!fm.title || fm.title.length > 60) return 'título requerido (máx 60)';
  if (!fm.tagline || fm.tagline.length > 90) return 'línea de gancho requerida (máx 90)';
  if (!fm.synopsis || fm.synopsis.length > 400) return 'sinopsis requerida (máx 400)';
  if (!NOVEL_STATUS.includes(fm.status)) return 'estado inválido';
  if (!PHOSPHORS.includes(fm.phosphor)) return 'fósforo inválido';
  if (!fm.sigil || fm.sigil.length > 4) return 'sigilo requerido (máx 4 caracteres)';
  if (!Array.isArray(fm.genre) || fm.genre.some((g) => typeof g !== 'string' || g.length > 30))
    return 'géneros inválidos';
  if (!DATE_RE.test(fm.startedDate ?? '')) return 'fecha de inicio inválida (YYYY-MM-DD)';
  if (typeof fm.isDraft !== 'boolean') return 'isDraft requerido';
  return null;
}

async function readNovels() {
  const root = path.join(projectRoot, NOVELS_DIR);
  const dirs = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const novels = [];
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const obra = path.join(root, dir.name, 'obra.md');
    const raw = await fs.readFile(obra, 'utf8').catch(() => null);
    if (raw === null) continue;
    const { frontmatter, body } = parseFrontmatter(raw);
    const files = await fs.readdir(path.join(root, dir.name, 'installments')).catch(() => []);
    novels.push({
      slug: dir.name,
      frontmatter,
      body,
      installments: files.filter((f) => f.endsWith('.md')).length,
    });
  }
  return novels.sort((a, b) => (a.frontmatter.startedDate < b.frontmatter.startedDate ? 1 : -1));
}

// Crear la obra es crear su carpeta: el editor no deja trabajo a mano.
async function writeNovel({ slug, frontmatter: fm, body }) {
  const dir = path.join(projectRoot, NOVELS_DIR, slug);
  await fs.mkdir(path.join(dir, 'installments'), { recursive: true });
  const content = serializeNovel({ ...fm, slug }) + '\n' + String(body ?? '').replace(/\s+$/, '') + '\n';
  await fs.writeFile(path.join(dir, 'obra.md'), content, 'utf8');
}

function validatePost({ collection, frontmatter: fm, body }, COLLECTIONS) {
  const col = COLLECTIONS[collection];
  if (!col) return 'collection inválida';
  if (!fm || typeof body !== 'string') return 'Payload incompleto';
  if (!SLUG_RE.test(fm.slug ?? '')) return 'slug inválido (kebab-case, máx 50)';
  if (!fm.title || fm.title.length > col.maxTitle) return `title requerido (máx ${col.maxTitle})`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.publishedDate ?? '')) return 'publishedDate inválida (YYYY-MM-DD)';
  if (typeof fm.isDraft !== 'boolean') return 'isDraft requerido';
  return null;
}

async function readCollection(collection, COLLECTIONS) {
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
async function findEntry(collection, slug, COLLECTIONS) {
  const entries = await readCollection(collection, COLLECTIONS);
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
  const COLLECTIONS = await collections();
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean); // ['posts', collection?, slug?]

  if (req.method === 'GET' && parts[0] === 'posts' && parts.length === 1) {
    const posts = [];
    for (const name of Object.keys(COLLECTIONS)) {
      for (const e of await readCollection(name, COLLECTIONS)) {
        posts.push({ collection: e.collection, nav: e.nav, file: e.file, ...e.frontmatter });
      }
    }
    posts.sort((a, b) => (a.publishedDate < b.publishedDate ? 1 : -1));
    const collections = Object.fromEntries(Object.entries(COLLECTIONS).map(([k, v]) => [k, { nav: v.nav, sub: v.sub, maxTitle: v.maxTitle }]));
    return sendJson(res, 200, { posts, collections });
  }

  if (req.method === 'GET' && parts[0] === 'posts' && parts.length === 3) {
    const [, collection, slug] = parts;
    if (!COLLECTIONS[collection] || !SLUG_RE.test(slug)) return sendJson(res, 400, { error: 'ruta inválida' });
    const entry = await findEntry(collection, slug, COLLECTIONS);
    if (!entry) return sendJson(res, 404, { error: 'Post no encontrado' });
    return sendJson(res, 200, { collection, nav: entry.nav, frontmatter: entry.frontmatter, body: entry.body });
  }

  if (req.method === 'POST' && parts[0] === 'posts') {
    const payload = JSON.parse(await readBody(req));
    const error = validatePost(payload, COLLECTIONS);
    if (error) return sendJson(res, 400, { error });
    const { collection, fromCollection, frontmatter: fm, body } = payload;
    // Moving between collections: write in the target, then drop the original file.
    const moving = Boolean(fromCollection) && fromCollection !== collection;
    if (moving && !COLLECTIONS[fromCollection]) return sendJson(res, 400, { error: 'collection de origen inválida' });
    const existing = await findEntry(collection, fm.slug, COLLECTIONS);
    if (moving && existing) return sendJson(res, 409, { error: `Ya hay un post con el slug "${fm.slug}" en ${collection}` });
    const fileName = existing?.file ?? `${fm.slug}.md`;
    const filePath = path.join(projectRoot, COLLECTIONS[collection].dir, fileName);
    const content = serializeFrontmatter(fm) + '\n' + body.replace(/\s+$/, '') + '\n';
    await fs.writeFile(filePath, content, 'utf8');
    if (moving) {
      const previous = await findEntry(fromCollection, fm.slug, COLLECTIONS);
      if (previous) await fs.rm(path.join(projectRoot, COLLECTIONS[fromCollection].dir, previous.file));
    }
    return sendJson(res, 200, { ok: true, file: fileName, collection, moved: moving });
  }

  if (req.method === 'GET' && parts[0] === 'novels' && parts.length === 1) {
    return sendJson(res, 200, { novels: await readNovels(), status: NOVEL_STATUS, phosphors: PHOSPHORS });
  }

  if (req.method === 'POST' && parts[0] === 'novels') {
    const payload = JSON.parse(await readBody(req));
    const error = validateNovel(payload);
    if (error) return sendJson(res, 400, { error });
    const existed = Boolean(COLLECTIONS[payload.slug]);
    await writeNovel(payload);
    return sendJson(res, 200, { ok: true, slug: payload.slug, created: !existed });
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
