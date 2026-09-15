import type { APIRoute } from "astro";
import { feed } from "../utils/feed";
import { getNovels, getTimeline, slugOf, pad } from "../utils/novels";

export const GET: APIRoute = async (context) => {
  const novels = await getNovels();
  const bySlug = new Map(novels.map((novel) => [slugOf(novel), novel]));
  const timeline = await getTimeline();

  return feed({
    title: "renacentista.dev",
    description: "Novelas web por entregas.",
    site: context.site as URL,
    self: "/rss.xml",
    items: timeline.map((item) => ({
      title: `${bySlug.get(item.novelSlug)?.data.title} · ${pad(item.number)} · ${item.entry.data.title}`,
      link: `/novelas/${item.novelSlug}/${item.entry.data.slug}`,
      pubDate: item.entry.data.publishedDate,
      description: `Entrega ${pad(item.number)} de ${bySlug.get(item.novelSlug)?.data.title}.`
    }))
  });
};
