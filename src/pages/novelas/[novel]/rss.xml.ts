import type { APIRoute, GetStaticPaths } from "astro";
import { feed } from "../../../utils/feed";
import { getNovels, getInstallmentsOf, slugOf, pad } from "../../../utils/novels";

export const getStaticPaths = (async () => {
  const novels = await getNovels();
  return novels.map((novel) => ({
    params: { novel: slugOf(novel) },
    props: { novel }
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async (context) => {
  const novel = (context.props as { novel: Awaited<ReturnType<typeof getNovels>>[number] }).novel;
  const slug = slugOf(novel);
  const installments = await getInstallmentsOf(slug);

  return feed({
    title: `${novel.data.title} — renacentista.dev`,
    description: novel.data.synopsis,
    site: context.site as URL,
    self: `/novelas/${slug}/rss.xml`,
    items: installments
      .slice()
      .reverse()
      .map((item) => ({
        title: `${pad(item.number)} · ${item.entry.data.title}`,
        link: `/novelas/${slug}/${item.entry.data.slug}`,
        pubDate: item.entry.data.publishedDate,
        description: `Entrega ${pad(item.number)} de ${novel.data.title}.`
      }))
  });
};
