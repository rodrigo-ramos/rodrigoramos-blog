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


export const collections = { projects, journaling, ensayo, trinos, microfiction, audiofilia, experience, education, skillsAndTools };