import { getCollection, type CollectionEntry } from "astro:content";

export type Novel = CollectionEntry<"novels">;
export type Installment = CollectionEntry<"installments">;

export type NumberedInstallment = {
  entry: Installment;
  number: number;
  novelSlug: string;
};

// La carpeta es la fuente de verdad: el loader deriva el id del campo `slug`
// del frontmatter, que en una entrega no dice a que obra pertenece.
const novelKeyOf = (entry: { filePath?: string; id: string }): string => {
  const match = /novels\/([^/]+)\//.exec(entry.filePath ?? "");
  return match?.[1] ?? entry.id.split("/")[0];
};

export const statusLabel: Record<string, string> = {
  "en-curso": "En curso",
  completa: "Completa",
  pausada: "En pausa"
};

export function slugOf(novel: Novel): string {
  return novelKeyOf(novel);
}

export async function getNovels(): Promise<Novel[]> {
  const novels = await getCollection("novels", ({ data }) => !data.isDraft);
  return novels.sort(
    (a, b) => b.data.startedDate.getTime() - a.data.startedDate.getTime()
  );
}

export async function getNovel(slug: string): Promise<Novel | undefined> {
  const novels = await getNovels();
  return novels.find((novel) => slugOf(novel) === slug);
}

// Numera cada entrega por orden de publicacion dentro de su obra; `number` en
// el frontmatter gana cuando el autor quiere forzar el orden.
async function numbered(): Promise<NumberedInstallment[]> {
  const installments = await getCollection("installments", ({ data }) => !data.isDraft);
  const byNovel = new Map<string, Installment[]>();
  for (const entry of installments) {
    const key = novelKeyOf(entry);
    byNovel.set(key, [...(byNovel.get(key) ?? []), entry]);
  }

  const out: NumberedInstallment[] = [];
  for (const [novelSlug, entries] of byNovel) {
    entries
      .sort((a, b) => a.data.publishedDate.getTime() - b.data.publishedDate.getTime())
      .forEach((entry, index) => {
        out.push({ entry, number: entry.data.number ?? index + 1, novelSlug });
      });
  }
  return out;
}

/** Entregas de una obra, de la primera a la última: el orden en que se lee. */
export async function getInstallmentsOf(novelSlug: string): Promise<NumberedInstallment[]> {
  const all = await numbered();
  return all
    .filter((item) => item.novelSlug === novelSlug)
    .sort((a, b) => a.number - b.number);
}

/** Todas las entregas del sitio, de la más reciente a la más vieja. */
export async function getTimeline(): Promise<NumberedInstallment[]> {
  const all = await numbered();
  return all.sort(
    (a, b) => b.entry.data.publishedDate.getTime() - a.entry.data.publishedDate.getTime()
  );
}

export async function getLatestOf(novelSlug: string): Promise<NumberedInstallment | undefined> {
  const installments = await getInstallmentsOf(novelSlug);
  return installments.at(-1);
}

export const pad = (n: number): string => String(n).padStart(2, "0");
