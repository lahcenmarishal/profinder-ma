import { seoRouteHead } from "@/lib/seo";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { SeoLandingPage } from "@/components/seo-landing";
import { label, nav, teachersCopy } from "@/lib/seo-copy";
import { homeCrumb } from "@/lib/seo-links";
import {
  findCity, findLevel, findSubject, type SeoLang
} from "@/lib/seo-taxonomy";
import { comboStats, isComboIndexable } from "@/lib/seo-eligibility";
import { fetchProfessionals } from "@/lib/marketplace";

export const Route = createFileRoute("/$lang/professeurs/$ville/$matiere/$niveau")({
  loader: async ({ params }) => {
    const city = findCity(params.ville);
    const subject = findSubject(params.matiere);
    const level = findLevel(params.niveau);
    if (!city || !subject || !level) throw notFound();
    const pros = await fetchProfessionals().catch(() => []);
    // Ville x matiere x niveau : intention tres fine, exige une offre reelle.
    return {
      indexable: isComboIndexable(comboStats(pros, city, subject, level), {
        level: true,
        lang: params.lang as SeoLang,
        city,
      }),
    };
  },
  head: ({ params, loaderData }) =>
    seoRouteHead({
      type: "teachers",
      lang: params.lang as SeoLang,
      city: findCity(params.ville),
      subject: findSubject(params.matiere),
      level: findLevel(params.niveau),
      index: loaderData?.indexable ?? false,
    }),
  component: CitySubjectLevel,
});

function CitySubjectLevel() {
  const { lang: rawLang, ville, matiere, niveau } = Route.useParams();
  const lang = rawLang as SeoLang;
  const city = findCity(ville);
  const subject = findSubject(matiere);
  const level = findLevel(niveau);
  const c = teachersCopy(lang, city, subject, level);

  return (
    <SeoLandingPage
      lang={lang}
      h1={c.h1}
      intro={c.intro}
      filter={{ city, subject, level }}
      breadcrumbs={[
        homeCrumb(lang),
        { to: "/$lang/professeurs", params: { lang }, label: nav("teachers", lang) },
        {
          to: "/$lang/professeurs/$ville",
          params: { lang, ville },
          label: city ? label.city(city, lang) : ville,
        },
        {
          to: "/$lang/professeurs/$ville/$matiere",
          params: { lang, ville, matiere },
          label: subject ? label.subject(subject, lang) : matiere,
        },
      ]}
    />
  );
}
