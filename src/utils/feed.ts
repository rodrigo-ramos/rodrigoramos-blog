type FeedItem = {
  title: string;
  link: string;
  pubDate: Date;
  description: string;
};

const escape = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** RSS 2.0 a mano: son treinta líneas y evita una dependencia más. */
export function feed(opts: {
  title: string;
  description: string;
  site: URL;
  self: string;
  items: FeedItem[];
}): Response {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(opts.title)}</title>
    <description>${escape(opts.description)}</description>
    <link>${opts.site.href}</link>
    <language>es-MX</language>
    <atom:link href="${new URL(opts.self, opts.site).href}" rel="self" type="application/rss+xml" />
${opts.items
  .map(
    (item) => `    <item>
      <title>${escape(item.title)}</title>
      <link>${new URL(item.link, opts.site).href}</link>
      <guid isPermaLink="true">${new URL(item.link, opts.site).href}</guid>
      <pubDate>${item.pubDate.toUTCString()}</pubDate>
      <description>${escape(item.description)}</description>
    </item>`
  )
  .join("\n")}
  </channel>
</rss>`;

  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" }
  });
}
