// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from "@astrojs/sitemap";
import blogEditor from "./editor/integration.mjs";
import pagefind from "./integrations/pagefind.mjs";

// https://astro.build/config
export default defineConfig({
  fonts: [
    { 
      provider: fontProviders.fontsource(),
      name: "VT323",
      cssVariable: "--font-pixels",
      fallbacks: ["monospace"],
      styles: ["normal", "italic"],
    },
    { 
      provider: fontProviders.fontsource(),
      name: "JetBrains Mono",
      cssVariable: "--font-mono",
      fallbacks: ["monospace"],
      weights: [400, 500, 600, 700, 800],
      styles: ["normal", "italic"],
    }
  ],

  vite: {
    plugins: [tailwindcss()]
  },
  site: "https://renacentista.dev",
  // /journal moved under /writing; keep the published URLs alive.
  redirects: {
    '/blog': '/writing/journaling',
    '/blog/[page]': '/writing/journaling/[page]',
  },
  integrations: [sitemap(), blogEditor(), pagefind()]
});