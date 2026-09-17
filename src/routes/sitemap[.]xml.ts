import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL, fetchPublishedPosts } from "@/lib/blog";
import { fetchProfessionals } from "@/lib/marketplace";
import {
  SEO_LEVELS,
  SEO_SUBJECTS,
  isProfileIndexable,
  loadSeoCities,
  proSlug,
} from "@/lib/seo-taxonomy";
import { cityStats, comboStats, isCityIndexable, isComboIndexable } from "@/lib/seo-eligibility";

const LANGS = ["fr", "ar"] as const;

/**
 * Sitemap : uniquement les pages utiles — hubs éditoriaux, villes et matières
 * curatées, combinaisons ville × matière (× niveau) qui ont au moins un
 * professeur réel, fiches professeurs actives et articles publiés.
 */
type SitemapUrl = { loc: string; lastmod?: string };

async function buildUrls(): Promise<SitemapUrl[]> {
  const paths = new Set<string>();
  const lastmods = new Map<string, string>();
  const add = (p: string) => LANGS.forEach((l) => paths.add(`/${l}${p}`));

  add("");
  add("/professeurs");
  add("/cours-particuliers");
  add("/matieres");
  add("/villes");
  add("/niveaux");
  add("/blog");

  for (const s of SEO_SUBJECTS) {
    add(`/matieres/${s.slug}`);
    add(`/professeurs/${s.slug}`);
  }
  for (const l of SEO_LEVELS) add(`/niveaux/${l.slug}`);

  const pros = await fetchProfessionals().catch(() => []);

  // Villes issues des données réelles (table `cities`), jamais d'une liste figée.
  const cities = await loadSeoCities();

  for (const c of cities) {
    const stats = cityStats(pros, c);
    // Langues où la ville a une vraie valeur SEO (l'arabe exige un nom arabe réel).
    const langs = LANGS.filter((l) => isCityIndexable(stats, l));
    if (langs.length === 0) continue;
    const addCity = (p: string) => langs.forEach((l) => paths.add(`/${l}${p}`));

    addCity(`/villes/${c.slug}`);
    addCity(`/professeurs/${c.slug}`);
    addCity(`/cours-particuliers/${c.slug}`);

    for (const s of stats.subjects) {
      const combo = comboStats(pros, c, s);
      if (!isComboIndexable(combo)) continue;
      addCity(`/professeurs/${c.slug}/${s.slug}`);
      addCity(`/cours-particuliers/${c.slug}/${s.slug}`);
      for (const lv of stats.levels) {
        if (!isComboIndexable(comboStats(pros, c, s, lv), { level: true })) continue;
        addCity(`/professeurs/${c.slug}/${s.slug}/${lv.slug}`);
      }
    }
  }

  for (const p of pros.filter(isProfileIndexable)) add(`/professeur/${proSlug(p)}`);

  // Pages institutionnelles publiques, uniquement en français (pas de version arabe).
  for (const p of ["/devenir-professeur", "/conditions", "/confidentialite"]) paths.add(p);

  for (const lang of LANGS) {
    const posts = await fetchPublishedPosts(lang).catch(() => []);
    for (const post of posts) {
      const path = `/${lang}/blog/${post.slug}`;
      paths.add(path);
      if (post.published_at) lastmods.set(path, post.published_at.slice(0, 10));
    }
  }

  return [...paths].map((loc) => {
    const lastmod = lastmods.get(loc);
    return lastmod ? { loc, lastmod } : { loc };
  });
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = await buildUrls();
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${SITE_URL}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`,
  )
  .join("\n")}
</urlset>`;
        return new Response(body, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
