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
   writing (journaling, trinos, ensayo), microfiction y audiofilia juntos, cada uno
   con su etiqueta de sección.
2. **Nueva historia**. Escribes el título arriba; con Enter bajas al cuerpo.
3. Seleccionas texto y sale el menú flotante: negrita, cursiva, enlace, `T` grande (`#`),
   `T` chica (`##`) y cita. En una línea vacía aparece el **+** a la izquierda: imagen
   (se copia a `public/images/blog/` y queda enlazada), bloque de código o separador.
   También funcionan los atajos de Markdown al teclear: `##`, `>`, `-`.
4. **⌘S** guarda. Arriba dice "Sin guardar" mientras hay cambios y "Guardado" cuando ya
   está en disco. Nace como borrador, y un borrador no entra al build: no se lista, no
   genera página y no se indexa, ni siquiera si le llega el enlace directo.
5. **Publicar…** abre el panel: menú y submenú, slug (solo al crear), categoría (solo
   journaling y ensayo), fecha y la casilla de borrador. Desmarcas "Borrador" y guardas.
   - **Menú** es la entrada del nav (`/writing`, `/microfiction`, `/audiofilia`) y
     **Submenú** la sección dentro de `/writing`: journaling, trinos o ensayo. El
     submenú solo aparece en los menús que agrupan más de una colección.
   - **Cambiar de sección mueve el post:** al guardar, el `.md` se escribe en la colección
     nueva y se borra el de origen. Si el slug ya existe allá, no se mueve nada.
   - El **+** junto a la categoría agrega una categoría nueva a `src/data/categories.json`,
     que es de donde `src/content.config.ts` toma el enum del esquema. Como el config
     depende de ese archivo, el dev server se reinicia solo al agregarla.
6. `git add` + commit + push manual. Vercel despliega y regenera el índice de búsqueda.

El `id`, el slug y el tiempo de lectura se calculan solos. Para editar algo viejo, clic en
la lista. Cada colección respeta su propio esquema: journaling y ensayo llevan categoría
y tiempo de lectura; trinos, microfiction y audiofilia no, y admiten títulos de 80
caracteres.

> La **primera** entrada de una sección vacía (hoy trinos y ensayo) no aparece en el sitio
> hasta reiniciar `astro dev`: el watcher de contenido no vigila colecciones sin archivos.
> A partir de la segunda, el recargado en caliente funciona normal.

## Búsqueda

`/search` usa [Pagefind](https://pagefind.app): el índice se genera en cada `astro build`
(ver `integrations/pagefind.mjs`) y se sirve estático, sin backend.

- En local el índice viene del último `npm run build`. Si `/search` dice
  *"search index not built yet"*, corre un build.
- Se busca por **palabra completa**: cada término va entrecomillado contra Pagefind, que
  de otro modo trata la última palabra como prefijo (una palabra que empieza con `a`
  devolvía todo lo que empieza con `a`). Con varias palabras se cruzan los resultados de
  cada una.
- Se indexa lo que esté dentro de `data-pagefind-body`, presente en las tres plantillas de
  detalle (`journaling`, `ensayo`, `trinos`, `microfiction`, `audiofilia`).


