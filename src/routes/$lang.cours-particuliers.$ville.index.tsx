import { seoRouteHead } from "@/lib/seo";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { SeoLandingPage } from "@/components/seo-landing";
import { coursesCopy, label, nav } from "@/lib/seo-copy";
import { homeCrumb } from "@/lib/seo-links";
import {
  SEO_SUBJECTS, findCity, type SeoLang
} from "@/lib/seo-taxonomy";
import { cityStats, isCityIndexable } from "@/lib/seo-eligibility";
import { fetchProfessionals } from "@/lib/marketplace";

export const Route = createFileRoute("/$lang/cours-particuliers/$ville/")({
  loader: async ({ params }) => {
    const city = findCity(params.ville);
    if (!city) throw notFound();
    const pros = await fetchProfessionals().catch(() => []);
    const stats = cityStats(pros, city);
    return {
      indexable: isCityIndexable(stats, params.lang as SeoLang),
      subjects: stats.subjects.map((s) => s.slug),
    };
  },
  head: ({ params, loaderData }) =>
    seoRouteHead({
      type: "courses",
      lang: params.lang as SeoLang,
      city: findCity(params.ville),
      index: loaderData?.indexable ?? false,
    }),
  component: CoursesCity,
});

function CoursesCity() {
  const { lang: rawLang, ville } = Route.useParams();
  const lang = rawLang as SeoLang;
  const { subjects } = Route.useLoaderData();
  const city = findCity(ville);
  const c = coursesCopy(lang, city, null);
  const realSubjects = SEO_SUBJECTS.filter((s) => subjects.includes(s.slug));
  return (
    <SeoLandingPage
      lang={lang}
      h1={c.h1}
      intro={c.intro}
      filter={{ city }}
      breadcrumbs={[
        homeCrumb(lang),
        { to: "/$lang/cours-particuliers", params: { lang }, label: nav("courses", lang) },
      ]}
      sections={[
        ...(realSubjects.length
          ? [
              {
                title: nav("subjects", lang),
                items: realSubjects.map((s) => ({
                  to: "/$lang/cours-particuliers/$ville/$matiere",
                  params: { lang, ville, matiere: s.slug },
                  label: label.subject(s, lang),
                })),
              },
            ]
          : []),
        {
          title: nav("teachers", lang),
          items: [
            {
              to: "/$lang/professeurs/$ville",
              params: { lang, ville },
              label: city ? (lang === "fr" ? `Professeurs à ${city.fr}` : `أساتذة في ${city.ar}`) : ville,
            },
          ],
        },
      ]}
    />
  );
}
