import { seoRouteHead } from "@/lib/seo";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { SeoLandingPage } from "@/components/seo-landing";
import { label, levelCopy, nav } from "@/lib/seo-copy";
import { cityLinks, homeCrumb } from "@/lib/seo-links";
import { SEO_SUBJECTS, findLevel, seoCities, type SeoLang } from "@/lib/seo-taxonomy";
import { citiesWithOffer, comboStats } from "@/lib/seo-eligibility";
import { fetchProfessionals } from "@/lib/marketplace";

export const Route = createFileRoute("/$lang/niveaux/$niveau")({
  loader: async ({ params }) => {
    const level = findLevel(params.niveau);
    if (!level) throw notFound();
    const pros = await fetchProfessionals().catch(() => []);
    // Villes couvrant réellement ce niveau.
    return {
      cities: citiesWithOffer(pros)
        .filter((s) => comboStats(pros, s.city, null, level).profiles > 0)
        .map((s) => s.city.slug),
    };
  },
  head: ({ params, loaderData }) =>
    seoRouteHead({
      type: "level",
      lang: params.lang as SeoLang,
      level: findLevel(params.niveau),
      index: (loaderData?.cities.length ?? 0) > 0,
    }),
  component: LevelPage,
});

function LevelPage() {
  const { lang: rawLang, niveau } = Route.useParams();
  const lang = rawLang as SeoLang;
  const level = findLevel(niveau)!;
  const { cities } = Route.useLoaderData();
  const c = levelCopy(lang, level);
  const list = seoCities().filter((city) => cities.includes(city.slug));
  return (
    <SeoLandingPage
      lang={lang}
      h1={c.h1}
      intro={c.intro}
      filter={{ level }}
      breadcrumbs={[
        homeCrumb(lang),
        { to: "/$lang/niveaux", params: { lang }, label: nav("levels", lang) },
      ]}
      sections={[
        {
          title: nav("subjects", lang),
          items: SEO_SUBJECTS.map((s) => ({
            to: "/$lang/matieres/$matiere",
            params: { lang, matiere: s.slug },
            label: label.subject(s, lang),
          })),
        },
        { title: nav("cities", lang), items: cityLinks(lang, list) },
      ]}
    />
  );
}
