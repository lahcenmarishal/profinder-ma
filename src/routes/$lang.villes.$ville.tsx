import { seoRouteHead } from "@/lib/seo";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { SeoLandingPage } from "@/components/seo-landing";
import { cityCopy, label, nav } from "@/lib/seo-copy";
import { homeCrumb, subjectsInCity } from "@/lib/seo-links";
import {
  SEO_LEVELS, SEO_SUBJECTS, findCity, type SeoLang
} from "@/lib/seo-taxonomy";
import { cityStats, isCityIndexable } from "@/lib/seo-eligibility";
import { fetchProfessionals } from "@/lib/marketplace";

export const Route = createFileRoute("/$lang/villes/$ville")({
  loader: async ({ params }) => {
    const city = findCity(params.ville);
    if (!city) throw notFound();
    const pros = await fetchProfessionals().catch(() => []);
    const stats = cityStats(pros, city);
    return {
      // Indexable uniquement si la ville a une vraie offre locale (et, en arabe,
      // un nom arabe réel en base).
      indexable: isCityIndexable(stats, params.lang as SeoLang),
      subjects: stats.subjects.map((s) => s.slug),
      levels: stats.levels.map((l) => l.slug),
    };
  },
  head: ({ params, loaderData }) =>
    seoRouteHead({
      type: "city",
      lang: params.lang as SeoLang,
      city: findCity(params.ville),
      index: loaderData?.indexable ?? false,
    }),
  component: CityPage,
});

function CityPage() {
  const { lang: rawLang, ville } = Route.useParams();
  const lang = rawLang as SeoLang;
  const { subjects, levels } = Route.useLoaderData();
  const city = findCity(ville)!;
  const c = cityCopy(lang, city);

  // Matières et niveaux réellement disponibles dans la ville.
  const realSubjects = SEO_SUBJECTS.filter((s) => subjects.includes(s.slug));
  const realLevels = SEO_LEVELS.filter((l) => levels.includes(l.slug));

  const sections = [
    ...(realSubjects.length
      ? [{ title: nav("subjects", lang), items: subjectsInCity(lang, city, realSubjects) }]
      : []),
    ...(realLevels.length
      ? [
          {
            title: nav("levels", lang),
            items: realLevels.map((l) => ({
              to: "/$lang/niveaux/$niveau",
              params: { lang, niveau: l.slug },
              label: label.level(l, lang),
            })),
          },
        ]
      : []),
    {
      title: nav("courses", lang),
      items: [
        {
          to: "/$lang/cours-particuliers/$ville",
          params: { lang, ville },
          label: lang === "fr" ? `Cours particuliers à ${city.fr}` : `دروس خصوصية في ${city.ar}`,
        },
      ],
    },
  ];

  return (
    <SeoLandingPage
      lang={lang}
      h1={c.h1}
      intro={c.intro}
      filter={{ city }}
      breadcrumbs={[
        homeCrumb(lang),
        { to: "/$lang/villes", params: { lang }, label: nav("cities", lang) },
      ]}
      sections={sections}
    />
  );
}
