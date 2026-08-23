# Decker - Astro & Tailwind Portfolio Template

A portfolio Astro & Tailwind theme built for developers and engineers. Decker was built with a retro tech design that combines the performance of Astro with the flexibility of Tailwind CSS to deliver a strong online presence.

- [**Live Demo**](https://decker-gmc.pages.dev) 
- [**Documentation**](https://jessgaspar.dev/docs/getting-started) 
- [**Changelog**](https://jessgaspar.dev/changelog/decker) 
- [**Support**](https://jessgaspar.dev/legal/support) 

## Pages Included

- Home
- Projects
- About
- Blog
- Blog post
- Contact
- 404

## Features

Built with both developers and content editors in mind, Decker ships with a comprehensive set of features:

- **Content Collections:** Structured data management for projects, blog posts, experience, education and skills — making updates quick, painless, and consistent across your entire site
- **Reusable Components:** A library of modular components that keep your codebase clean, readable, and straightforward to customize for your portfolio
- **Custom Tailwind Theme:** A bespoke design system built on Tailwind CSS with a clean, professional aesthetic that is easy to adapt to your portfolio's identity
- **Pagination:** Keeps your projects and blog scalable and navigable as your portfolio grows over time
- **Sitemap:** Auto-generated and search-engine ready, ensuring all your pages are indexed from day one without any manual configuration
- **Optimized for SEO:** Built-in best practices including semantic markup, meta tags, and structured data to help your portfolio rank higher and reach more people
- **Optimized for Accessibility:** Designed to be usable by everyone, with accessible patterns, and semantic HTML throughout
- **Ongoing Updates:** Regular improvements and continued compatibility with the latest Astro releases so your theme stays modern and well-maintained
- **Optional CMS with PagesCMS:** Manage your projects, blog posts, resume, and more site content through an intuitive visual interface — no code required

## 🧞 Astro Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

---

## Editor de escritura (estilo Medium)

Editor propio para escribir los posts sin tocar Markdown a mano. Vive en `editor/` y se
monta **solo en `astro dev`**: `astro build` no lo ve, así que nunca llega a Vercel.

### Cómo escribir

1. `npm run dev` y abre <http://localhost:4321/_editor>. Ves todo lo escrito —
   journal, microfiction y audiofilia juntos, cada uno con su etiqueta de sección.
2. **Nueva historia**. Escribes el título arriba; con Enter bajas al cuerpo.
3. Seleccionas texto y sale el menú flotante: negrita, cursiva, enlace, `T` grande (`#`),
   `T` chica (`##`) y cita. En una línea vacía aparece el **+** a la izquierda: imagen
   (se copia a `public/images/blog/` y queda enlazada), bloque de código o separador.
   También funcionan los atajos de Markdown al teclear: `##`, `>`, `-`.
4. **⌘S** guarda. Arriba dice "Sin guardar" mientras hay cambios y "Guardado" cuando ya
   está en disco. Nace como borrador: lo ves en el sitio local pero no se publica.
5. **Publicar…** abre el panel: sección (solo al crear), slug, categoría (solo journal),
   fecha y la casilla de borrador. Desmarcas "Borrador" y guardas.
6. `git add` + commit + push manual. Vercel despliega y regenera el índice de búsqueda.

El `id`, el slug y el tiempo de lectura se calculan solos. Para editar algo viejo, clic en
la lista. Cada colección respeta su propio esquema: journal lleva categoría y tiempo de
lectura; microfiction y audiofilia no, y admiten títulos de 80 caracteres.

## Búsqueda

`/search` usa [Pagefind](https://pagefind.app): el índice se genera en cada `astro build`
(ver `integrations/pagefind.mjs`) y se sirve estático, sin backend.

- En local el índice viene del último `npm run build`. Si `/search` dice
  *"search index not built yet"*, corre un build.
- Se busca por **palabra completa**: cada término va entrecomillado contra Pagefind, que
  de otro modo trata la última palabra como prefijo (buscar `Augusto` devolvía todo lo que
  empieza con `a`). Con varias palabras se cruzan los resultados de cada una.
- Se indexa lo que esté dentro de `data-pagefind-body`, presente en las tres plantillas de
  detalle (`blog`, `microfiction`, `audiofilia`).


