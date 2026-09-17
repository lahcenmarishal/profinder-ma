/**
 * Contrôle interne des annotations multilingues : /api/public/seo-hreflang
 *
 * Rapport JSON en lecture seule (aucune donnée personnelle) : canonical
 * auto-référent, hreflang réciproques FR ⇄ AR, codes de langue valides,
 * x-default, et existence réelle des URLs annoncées (`?http=1`).
 */
import { createFileRoute } from "@tanstack/react-router";
import { fetchPublishedPosts } from "@/lib/blog";
import { fetchProfessionals } from "@/lib/marketplace";
import { buildSeo, type SeoPage } from "@/lib/seo";
import { validatePairs, checkUrlsReachable } from "@/lib/seo-validate";
import {
  SEO_LEVELS,
  SEO_SUBJECTS,
  isProfileIndexable,
  loadSeoCities,
  proSlug,
} from "@/lib/seo-taxonomy";
import { cityStats, comboStats, isCityIndexable, isComboIndexable } from "@/lib/seo-eligibility";

type Pair = { fr: SeoPage; ar: SeoPage | null };

async function buildPairs(): Promise<Pair[]> {
  const pairs: Pair[] = [];
  const both = (page: Omit<SeoPage, "lang">, withAr = true) =>
    pairs.push({
      fr: { ...page, lang: "fr" } as SeoPage,
      ar: withAr ? ({ ...page, lang: "ar" } as SeoPage) : null,
    });

  both({ type: "home" });
  both({ type: "teachers" });
  both({ type: "courses" });
  both({ type: "subjects" });
  both({ type: "cities" });
  both({ type: "levels" });
  both({ type: "blog" });

  for (const subject of SEO_SUBJECTS) {
    both({ type: "subject", subject });
    both({ type: "teachers", subject });
  }
  for (const level of SEO_LEVELS) both({ type: "level", level });

  const pros = await fetchProfessionals().catch(() => []);
  const cities = await loadSeoCities();

  for (const city of cities) {
    const stats = cityStats(pros, city);
    if (!isCityIndexable(stats, "fr")) continue;
    const withAr = isCityIndexable(stats, "ar");
    both({ type: "city", city }, withAr);
    both({ type: "teachers", city }, withAr);
    both({ type: "courses", city }, withAr);
    for (const subject of stats.subjects) {
      if (!isComboIndexable(comboStats(pros, city, subject))) continue;
      both({ type: "teachers", city, subject }, withAr);
      both({ type: "courses", city, subject }, withAr);
      for (const level of stats.levels) {
        if (!isComboIndexable(comboStats(pros, city, subject, level), { level: true })) continue;
        both({ type: "teachers", city, subject, level }, withAr);
      }
    }
  }

  for (const pro of pros.filter(isProfileIndexable)) {
    const slug = proSlug(pro);
    both({ type: "professional", pro: { slug, name: pro.display_name } });
  }

  // Blog : une paire n'existe que si la traduction existe réellement.
  const [fr, ar] = await Promise.all([
    fetchPublishedPosts("fr").catch(() => []),
    fetchPublishedPosts("ar").catch(() => []),
  ]);
  const arByKey = new Map(ar.filter((p) => p.translation_key).map((p) => [p.translation_key!, p]));
  for (const post of fr) {
    const twin = post.translation_key ? arByKey.get(post.translation_key) : undefined;
    const article = {
      slug: post.slug,
      title: post.title,
      description: post.meta_description,
      alternateSlug: twin?.slug ?? null,
    };
    pairs.push({
      fr: { type: "article", lang: "fr", article },
      ar: twin
        ? {
            type: "article",
            lang: "ar",
            article: {
              slug: twin.slug,
              title: twin.title,
              description: twin.meta_description,
              alternateSlug: post.slug,
            },
          }
        : null,
    });
  }

  return pairs;
}

export const Route = createFileRoute("/api/public/seo-hreflang")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const pairs = await buildPairs();
        const report = validatePairs(pairs);
        let httpIssues: typeof report.issues = [];
        if (url.searchParams.get("http") === "1") {
          const limit = Number(url.searchParams.get("limit") ?? 40);
          const urls = pairs
            .flatMap((p) => [p.fr, p.ar].filter(Boolean) as SeoPage[])
            .slice(0, Math.max(1, Math.min(limit, 200)))
            .map((p) => buildSeo(p).url);
          httpIssues = await checkUrlsReachable(urls, url.origin);
        }
        const issues = [...report.issues, ...httpIssues];
        return Response.json(
          { checked: report.checked, ok: issues.length === 0, count: issues.length, issues },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
