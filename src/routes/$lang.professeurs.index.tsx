import { seoRouteHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage } from "@/components/seo-landing";
import { nav, teachersCopy } from "@/lib/seo-copy";
import { cityLinks, homeCrumb, levelLinks, subjectSegmentLinks } from "@/lib/seo-links";
import { seoCities, type SeoLang } from "@/lib/seo-taxonomy";
import { citiesWithOffer } from "@/lib/seo-eligibility";
import { fetchProfessionals } from "@/lib/marketplace";

export const Route = createFileRoute("/$lang/professeurs/")({
  loader: async () => {
    const pros = await fetchProfessionals().catch(() => []);
    return { cities: citiesWithOffer(pros).map((s) => s.city.slug) };
  },
  head: ({ params }) => seoRouteHead({ type: "teachers", lang: params.lang as SeoLang }),
  component: TeachersHub,
});

function TeachersHub() {
  const lang = Route.useParams().lang as SeoLang;
  const { cities } = Route.useLoaderData();
  const c = teachersCopy(lang, null, null, null);
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
          ? [{ title: nav("cities", lang), items: cityLinks(lang, list, "/$lang/professeurs/$ville") }]
          : []),
        { title: nav("subjects", lang), items: subjectSegmentLinks(lang) },
        { title: nav("levels", lang), items: levelLinks(lang) },
      ]}
    />
  );
}
