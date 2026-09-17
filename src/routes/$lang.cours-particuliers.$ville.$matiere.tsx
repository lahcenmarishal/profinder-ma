import { seoRouteHead } from "@/lib/seo";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { SeoLandingPage } from "@/components/seo-landing";
import { coursesCopy, label, nav } from "@/lib/seo-copy";
import { homeCrumb } from "@/lib/seo-links";
import {
  findCity, findSubject, type SeoLang
} from "@/lib/seo-taxonomy";
import { comboStats, isComboIndexable } from "@/lib/seo-eligibility";
import { fetchProfessionals } from "@/lib/marketplace";

export const Route = createFileRoute("/$lang/cours-particuliers/$ville/$matiere")({
  loader: async ({ params }) => {
    const city = findCity(params.ville);
    const subject = findSubject(params.matiere);
    if (!city || !subject) throw notFound();
    const pros = await fetchProfessionals().catch(() => []);
    // Indexable seulement si des professeurs réels enseignent cette matière ici.
    return { indexable: isComboIndexable(comboStats(pros, city, subject), { lang: params.lang as SeoLang, city }) };
  },
  head: ({ params, loaderData }) =>
    seoRouteHead({
      type: "courses",
      lang: params.lang as SeoLang,
      city: findCity(params.ville),
      subject: findSubject(params.matiere),
      index: loaderData?.indexable ?? false,
    }),
  component: CoursesCitySubject,
});

function CoursesCitySubject() {
  const { lang: rawLang, ville, matiere } = Route.useParams();
  const lang = rawLang as SeoLang;
  const city = findCity(ville);
  const subject = findSubject(matiere);
  const c = coursesCopy(lang, city, subject);
  return (
    <SeoLandingPage
      lang={lang}
      h1={c.h1}
      intro={c.intro}
      filter={{ city, subject }}
      breadcrumbs={[
        homeCrumb(lang),
        { to: "/$lang/cours-particuliers", params: { lang }, label: nav("courses", lang) },
        {
          to: "/$lang/cours-particuliers/$ville",
          params: { lang, ville },
          label: city ? label.city(city, lang) : ville,
        },
      ]}
      sections={[
        {
          title: nav("teachers", lang),
          items: [
            {
              to: "/$lang/professeurs/$ville/$matiere",
              params: { lang, ville, matiere },
              label:
                city && subject
                  ? lang === "fr"
                    ? `Professeurs de ${subject.fr} à ${city.fr}`
                    : `أساتذة ${subject.ar} في ${city.ar}`
                  : nav("teachers", lang),
            },
          ],
        },
      ]}
    />
  );
}
