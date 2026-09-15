# renacentista.dev

Publicación de **novelas web por entregas**. Cada obra es una carpeta; cada entrega, un
archivo Markdown dentro de ella. El sitio es estático (Astro) y se despliega solo en
Vercel al empujar a `main`.

- Producción: <https://renacentista.dev>
- Local: `http://localhost:4321` · Editor: `http://localhost:4321/_editor`

---

## Arrancar

```bash
cd ~/Personal/rodrigoramos-blog
npm install      # solo la primera vez
npm run dev      # abre http://localhost:4321
```

El editor vive en `/_editor` y **solo existe en `npm run dev`**: `astro build` no lo ve,
así que nunca llega a producción.

---

## Escribir con el editor (lo normal)

### Crear una novela

1. `/_editor` → **Nueva novela**.
2. Llena la ficha. Debajo del campo *Carpeta y URL* ves la ruta y la dirección que va a
   tener la obra antes de guardar.
3. **Guardar novela**. Eso crea en disco:

```
src/content/novels/<carpeta>/obra.md      ← la ficha
src/content/novels/<carpeta>/installments/ ← donde irán las entregas
```

### Escribir una entrega

1. **Nueva entrega**. Escribes el título arriba; con Enter bajas al cuerpo.
2. Seleccionas texto y sale el menú flotante: negrita, cursiva, enlace, `T` grande (`#`),
   `T` chica (`##`) y cita. En una línea vacía aparece el **+** a la izquierda: imagen
   (se copia a `public/images/blog/` y queda enlazada), bloque de código o separador.
   También funcionan los atajos de Markdown al teclear: `##`, `>`, `-`.
3. **⌘S** guarda. Arriba dice «Sin guardar» mientras hay cambios y «Guardado» cuando ya
   está en disco. Nace como **borrador**, y un borrador no entra al build: no se lista, no
   genera página y no se indexa, ni con el enlace directo.
4. **Publicar…** abre el panel:
   - **Novela**: a qué obra pertenece. Cambiarla **mueve** el archivo de carpeta.
   - **Dirección**: el último tramo de la URL. Solo se puede fijar al crear la entrega.
   - **Fecha de publicación**: es la que **ordena y numera** la obra. La entrega más
     antigua es la 01.
   - **Borrador**: desmárcalo y guarda para que salga en el sitio.
5. **Cancelar** vuelve a la lista; avisa si hay cambios sin guardar.

El editor recuerda la última novela en la que guardaste y propone esa para la siguiente
entrega.

### Terminar o pausar una obra

En la lista, clic en la novela → cambia **Estado** a `completa` o `pausada` → Guardar.
Al final de la última entrega, el sitio deja de decir «la siguiente aún no existe» y pasa
a «Aquí termina la obra».

---

## Escribir a mano, sin el editor

### Ficha de la obra — `src/content/novels/<carpeta>/obra.md`

```markdown
---
slug: "nave-impuluta"
title: "La Nave Impoluta"
tagline: "Una línea que enganche, máx 90 caracteres"
synopsis: "Dos o tres líneas, máx 400 caracteres."
status: "en-curso"
phosphor: "ambar"
sigil: "//"
genre: ["cyberpunk"]
startedDate: 2026-09-15
isDraft: false
---

Nota opcional de la obra (se muestra bajo la sinopsis).
```

| Campo | Valores | Para qué |
|---|---|---|
| `status` | `en-curso` · `completa` · `pausada` | Coloca la obra en el catálogo y cambia el pie de la última entrega |
| `phosphor` | `ambar` · `verde` · `cian` · `magenta` · `violeta` · `rojo` · `blanco` | El color con que se pinta el sitio entero mientras se lee esa obra |
| `sigil` | 1–4 caracteres (`//`, `[]`, `><`) | La marca que la identifica en listas y cronologías |
| `isDraft` | `true` / `false` | `true` esconde la obra completa del sitio |

> El **nombre de la carpeta** es lo que manda: es el slug de la obra y el tramo de la URL.
> Renombrar la carpeta cambia la dirección de todas sus entregas.

### Entrega — `src/content/novels/<carpeta>/installments/<direccion>.md`

```markdown
---
slug: "origenes"
title: "Orígenes"
publishedDate: 2026-09-15
isDraft: false
---

El texto de la entrega, en Markdown.
```

Eso es todo el frontmatter. **No lleva número ni nombre de la obra**: el número sale del
orden por `publishedDate` dentro de su carpeta, y la obra, de la carpeta misma. Si alguna
vez necesitas forzar el orden, agrega `number: 7`.

---

## Publicar en internet

Vercel despliega solo lo que llegue a `main`. Desde el repo local:

```bash
cd ~/Personal/rodrigoramos-blog
git status --short                                        # qué hay pendiente

git add src/content/novels/                               # solo lo escrito
git commit -m "feat: nueva entrega de La Nave Impoluta"
git push origin main
```

El despliegue tarda ~1 minuto. Para comprobarlo:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://renacentista.dev/
curl -s https://renacentista.dev/rss.xml | head -20
```

> `git add -A` añade **todo** lo modificado, no solo el texto nuevo. Si solo quieres subir
> lo escrito, usa la ruta como arriba.

### Antes de subir, si tocaste código

```bash
npm run build     # tiene que terminar en "Complete!" sin errores
npm run preview   # sirve el resultado real en http://localhost:4321
```

---

## Cómo funciona el sitio

| Pieza | Dónde | Qué hace |
|---|---|---|
| Rutas | `src/pages/` | `/`, `/novelas`, `/novelas/<obra>`, `/novelas/<obra>/<entrega>`, `/acerca`, `/buscar` |
| Modelo | `src/content.config.ts` | Esquema de `novels` e `installments` |
| Consultas | `src/utils/novels.ts` | Numeración por fecha, orden, obra de cada entrega |
| Marcador de lectura | `src/scripts/lectura.ts` | Guarda en el navegador del lector dónde se quedó. Sin cuentas, sin servidor: nada sale de su máquina |
| RSS | `src/pages/rss.xml.ts` y `.../[novel]/rss.xml.ts` | Feed global y uno por obra |
| Estilos | `src/styles/global.css` | Paleta de terminal y los fósforos por obra |
| Editor | `editor/` | Solo en `astro dev` |

Si tocas `editor/integration.mjs`, **reinicia `npm run dev`**: las integraciones de Astro
se cargan al arrancar y el recargado en caliente no las alcanza.

## Búsqueda

`/buscar` usa [Pagefind](https://pagefind.app): el índice se genera en cada `astro build`
(ver `integrations/pagefind.mjs`) y se sirve estático, sin backend.

- En local el índice viene del último `npm run build`. Si `/buscar` dice
  *«search index not built yet»*, corre un build.
- Se busca por **palabra completa**: cada término va entrecomillado contra Pagefind.
- Se indexa lo que esté dentro de `data-pagefind-body`: las fichas de obra y las entregas.

## El blog personal anterior

El sitio fue un blog y portafolio. Nada de aquello se borró:

- Las páginas viven en `src/_archive/pages/` — fuera de `src/pages/`, así que no generan
  rutas ni salen en el sitemap.
- Los textos siguen en `src/content/` (`journaling`, `ensayo`, `trinos`, `microfiction`,
  `audiofilia`, `projects`, `resume`). **No se publican**: escribir ahí no sale en el sitio.
- Las URLs viejas (`/blog`, `/writing`, `/projects`, `/microfiction`, `/audiofilia`,
  `/about`, `/contact`, `/search`) redirigen; ver `astro.config.mjs`.

## Comandos de Astro

| Comando | Qué hace |
| :--- | :--- |
| `npm install` | Instala dependencias |
| `npm run dev` | Servidor local en `localhost:4321` (incluye `/_editor`) |
| `npm run build` | Compila a `./dist/` y genera el índice de búsqueda |
| `npm run preview` | Sirve `./dist/` para revisarlo antes de subir |

---

Tema base: [Decker](https://jessgaspar.dev/themes), de Jess Gaspar, modificado.
