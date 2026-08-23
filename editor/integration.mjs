// Dev-only Medium-style editor for the blog content collection.
// Routes and API middleware are registered exclusively during `astro dev`;
// `astro build` never sees them, so nothing ships to production.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const BLOG_DIR = 'src/content/blog';
const IMAGES_DIR = 'public/images/blog';
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,49}$/;
const CATEGORIES = ['systems', 'ai', 'productivity', 'security', 'cloud', 'ideas', 'reading', 'philosophy', 'me'];

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

function serializeFrontmatter(fm) {
  const quote = (s) => `"${String(s).replaceAll('"', '\\"')}"`;
  const lines = [
    `id: ${fm.id}`,
    `slug: ${quote(fm.slug)}`,
    `title: ${quote(fm.title)}`,
    `publishedDate: ${fm.publishedDate}`,
    `category: ${quote(fm.category)}`,
  ];
  if (fm.readingTime != null) lines.push(`readingTime: ${fm.readingTime}`);
  lines.push(`isDraft: ${fm.isDraft}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

function validatePost({ frontmatter: fm, body }) {
  if (!fm || typeof body !== 'string') return 'Payload incompleto';
  if (!Number.isInteger(fm.id) || fm.id < 1) return 'id inválido';
  if (!SLUG_RE.test(fm.slug ?? '')) return 'slug inválido (kebab-case, máx 50)';
  if (!fm.title || fm.title.length > 50) return 'title requerido (máx 50)';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.publishedDate ?? '')) return 'publishedDate inválida (YYYY-MM-DD)';
  if (!CATEGORIES.includes(fm.category)) return 'category inválida';
  if (typeof fm.isDraft !== 'boolean') return 'isDraft requerido';
  return null;
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

async function listPosts() {
  const dir = path.join(projectRoot, BLOG_DIR);
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.md'));
  const posts = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(dir, file), 'utf8');
    const { frontmatter, body } = parseFrontmatter(raw);
    posts.push({ file, ...frontmatter, words: body.trim().split(/\s+/).length });
  }
  posts.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  return posts;
}

async function handleApi(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean); // e.g. ['posts', 'slug']

  if (req.method === 'GET' && parts[0] === 'posts' && parts.length === 1) {
    return sendJson(res, 200, { posts: await listPosts(), categories: CATEGORIES });
  }

  if (req.method === 'GET' && parts[0] === 'posts' && parts.length === 2) {
    const slug = parts[1];
    if (!SLUG_RE.test(slug)) return sendJson(res, 400, { error: 'slug inválido' });
    const filePath = path.join(projectRoot, BLOG_DIR, `${slug}.md`);
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const { frontmatter, body } = parseFrontmatter(raw);
      return sendJson(res, 200, { frontmatter, body });
    } catch {
      return sendJson(res, 404, { error: 'Post no encontrado' });
    }
  }

  if (req.method === 'POST' && parts[0] === 'posts') {
    const payload = JSON.parse(await readBody(req));
    const error = validatePost(payload);
    if (error) return sendJson(res, 400, { error });
    const { frontmatter: fm, body } = payload;
    const filePath = path.join(projectRoot, BLOG_DIR, `${fm.slug}.md`);
    const content = serializeFrontmatter(fm) + '\n' + body.replace(/\s+$/, '') + '\n';
    await fs.writeFile(filePath, content, 'utf8');
    return sendJson(res, 200, { ok: true, file: `${fm.slug}.md` });
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
