import { seoRouteHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage } from "@/components/seo-landing";
import { coursesCopy, nav } from "@/lib/seo-copy";
import { cityLinks, homeCrumb, subjectLinks } from "@/lib/seo-links";
import { seoCities, type SeoLang } from "@/lib/seo-taxonomy";
import { citiesWithOffer } from "@/lib/seo-eligibility";
import { fetchProfessionals } from "@/lib/marketplace";

export const Route = createFileRoute("/$lang/cours-particuliers/")({
  loader: async () => {
    const pros = await fetchProfessionals().catch(() => []);
    // Le hub ne renvoie que vers des villes réellement pourvues.
    return { cities: citiesWithOffer(pros).map((s) => s.city.slug) };
  },
  head: ({ params }) => seoRouteHead({ type: "courses", lang: params.lang as SeoLang }),
  component: CoursesHub,
});

function CoursesHub() {
  const lang = Route.useParams().lang as SeoLang;
  const { cities } = Route.useLoaderData();
  const c = coursesCopy(lang, null, null);
  const list = seoCities().filter((city) => cities.includes(city.slug));
  return (
    <SeoLandingPage
      lang={lang}
      h1={c.h1}
      intro={c.intro}
      filter={{}}
      breadcrumbs={[homeCrumb(lang)]}
      sections={[
        ...(list.length
          ? [
              {
                title: nav("cities", lang),
                items: cityLinks(lang, list, "/$lang/cours-particuliers/$ville"),
              },
            ]
          : []),
        { title: nav("subjects", lang), items: subjectLinks(lang) },
      ]}
    />
  );
}
