import { glob, file } from 'astro/loaders';
import { defineCollection } from 'astro/content/config';
import { z } from 'astro/zod'
import categories from './data/categories.json'

const projects = defineCollection({
    loader: glob({pattern: "src/content/projects/**/*.md"}),
    schema: z.object({
        id: z.number(),
        title: z.string().max(50),
        tools: z.preprocess(
            (val) => (Array.isArray(val) ? val : [val]),
            z.array(z.enum([
                "TypeScript", "LIVE", "HTML", "JavaScript", "React Native", "Backend API", "Node.js", "Docker", "Tailwind",
                "Python", "asyncio", "Telethon", "SQLite", "mpv", "Bash", "CLI",
                "OpenTofu", "Ansible", "AWS", "GCP", "Azure", "Kubernetes",
                "GitHub Actions", "GitLab CI", "PostgreSQL"
            ]))),
        year: z.string().max(4),
        liveSite: z.url().optional(),
        github: z.url().optional(),
        description: z.string().max(350),
        isFeatured: z.boolean(),
        isDraft: z.boolean()
    })
});

// /writing groups three sections; journaling and ensayo share the long-form schema.
const longForm = z.object({
    id: z.number(),
    slug: z.string().max(50),
    title: z.string().max(50),
    publishedDate: z.date(),
    category: z.enum(categories as [string, ...string[]]),
    readingTime: z.number().optional(),
    isDraft: z.boolean()
});

const journaling = defineCollection({
    loader: glob({pattern: "src/content/journaling/**/*.md"}),
    schema: longForm
})

const ensayo = defineCollection({
    loader: glob({pattern: "src/content/ensayo/**/*.md"}),
    schema: longForm
})

const trinos = defineCollection({
    loader: glob({pattern: "src/content/trinos/**/*.md"}),
    schema: z.object({
        slug: z.string().max(50),
        title: z.string().max(80),
        publishedDate: z.date(),
        isDraft: z.boolean()
    })
})

const microfiction = defineCollection({
    loader: glob({pattern: "src/content/microfiction/**/*.md"}),
    schema: z.object({
        slug: z.string().max(50),
        title: z.string().max(80),
        publishedDate: z.date(),
        isDraft: z.boolean()
    })
})

const audiofilia = defineCollection({
    loader: glob({pattern: "src/content/audiofilia/**/*.md"}),
    schema: z.object({
        slug: z.string().max(50),
        title: z.string().max(80),
        publishedDate: z.date(),
        isDraft: z.boolean()
    })
})

const experience = defineCollection({
    loader: file("src/content/resume/experience.yaml"),
    schema: z.object({
        title: z.string().max(70),
        timeline: z.string().max(15),
        description: z.string().max(500)
    })
})

const education = defineCollection({
    loader: file("src/content/resume/education.yaml"),
    schema: z.object({
        title: z.string().max(70),
        timeline: z.string().max(15),
        school: z.string().max(70)
    })
})

const skillsAndTools = defineCollection({
    loader: file("src/content/skills-and-tools/skillsAndTools.yaml"),
    schema: z.object({
        title: z.string().max(70),
        items: z.array(z.string())
    })
})


// --- renacentista.dev: ficcion por entregas -------------------------------
// Una obra por carpeta: src/content/novels/<novela>/obra.md + installments/*.md
// El slug de la novela sale del id del glob, asi que una entrega no repite a
// que obra pertenece: basta con moverla de carpeta.
const novels = defineCollection({
    loader: glob({base: "src/content/novels", pattern: "*/obra.md"}),
    schema: z.object({
        slug: z.string().max(50),
        title: z.string().max(60),
        tagline: z.string().max(90),
        synopsis: z.string().max(400),
        status: z.enum(["en-curso", "completa", "pausada"]),
        // Cada obra toma un fosforo distinto: es lo que la hace reconocible
        // de un vistazo sin salirse de la estetica de terminal.
        phosphor: z.enum(["ambar", "verde", "cian", "magenta", "violeta", "rojo", "blanco"]).default("ambar"),
        sigil: z.string().max(4).default("::"),
        genre: z.array(z.string()).default([]),
        startedDate: z.date(),
        isDraft: z.boolean()
    })
});

// `number` es opcional: por defecto la entrega se numera por orden de
// publicacion dentro de su novela, que es como se lee una serie.
const installments = defineCollection({
    loader: glob({base: "src/content/novels", pattern: "*/installments/*.md"}),
    schema: z.object({
        slug: z.string().max(50),
        title: z.string().max(80),
        publishedDate: z.date(),
        number: z.number().optional(),
        isDraft: z.boolean()
    })
});


export const collections = { novels, installments, projects, journaling, ensayo, trinos, microfiction, audiofilia, experience, education, skillsAndTools };