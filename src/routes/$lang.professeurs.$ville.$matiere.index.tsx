import { seoRouteHead } from "@/lib/seo";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { SeoLandingPage } from "@/components/seo-landing";
import { label, nav, teachersCopy } from "@/lib/seo-copy";
import { homeCrumb } from "@/lib/seo-links";
import {
  SEO_LEVELS, findCity, findSubject, type SeoLang
} from "@/lib/seo-taxonomy";
import { comboStats, isComboIndexable } from "@/lib/seo-eligibility";
import { fetchProfessionals } from "@/lib/marketplace";

export const Route = createFileRoute("/$lang/professeurs/$ville/$matiere/")({
  loader: async ({ params }) => {
    const city = findCity(params.ville);
    const subject = findSubject(params.matiere);
    if (!city || !subject) throw notFound();
    const pros = await fetchProfessionals().catch(() => []);
    const lang = params.lang as SeoLang;
    return {
      // Ville x matiere : indexable seulement si l'offre existe reellement.
      indexable: isComboIndexable(comboStats(pros, city, subject), { lang, city }),
      // Niveaux reellement enseignes pour cette combinaison.
      levels: SEO_LEVELS.filter((l) => comboStats(pros, city, subject, l).profiles > 0).map((l) => l.slug),
    };
  },
  head: ({ params, loaderData }) =>
    seoRouteHead({
      type: "teachers",
      lang: params.lang as SeoLang,
      city: findCity(params.ville),
      subject: findSubject(params.matiere),
      index: loaderData?.indexable ?? false,
    }),
  component: CitySubject,
});

function CitySubject() {
  const { lang: rawLang, ville, matiere } = Route.useParams();
  const lang = rawLang as SeoLang;
  const city = findCity(ville);
  const subject = findSubject(matiere);
  const { levels } = Route.useLoaderData();
  const c = teachersCopy(lang, city, subject, null);
  const realLevels = SEO_LEVELS.filter((l) => levels.includes(l.slug));

  return (
    <SeoLandingPage
      lang={lang}
      h1={c.h1}
      intro={c.intro}
      filter={{ city, subject }}
      breadcrumbs={[
        homeCrumb(lang),
        { to: "/$lang/professeurs", params: { lang }, label: nav("teachers", lang) },
        {
          to: "/$lang/professeurs/$ville",
          params: { lang, ville },
          label: city ? label.city(city, lang) : ville,
        },
      ]}
      sections={[
        {
          title: nav("levels", lang),
          items: realLevels.map((l) => ({
            to: "/$lang/professeurs/$ville/$matiere/$niveau",
            params: { lang, ville, matiere, niveau: l.slug },
            label: label.level(l, lang),
          })),
        },
      ]}
    />
  );
}
