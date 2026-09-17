import { seoRouteHead } from "@/lib/seo";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { SeoLandingPage } from "@/components/seo-landing";
import { label, nav, subjectCopy } from "@/lib/seo-copy";
import { citiesForSubject, homeCrumb } from "@/lib/seo-links";
import {
  SEO_LEVELS, findSubject, seoCities, type SeoLang
} from "@/lib/seo-taxonomy";
import { citiesWithOffer, comboStats } from "@/lib/seo-eligibility";
import { fetchProfessionals } from "@/lib/marketplace";

export const Route = createFileRoute("/$lang/matieres/$matiere")({
  loader: async ({ params }) => {
    const subject = findSubject(params.matiere);
    if (!subject) throw notFound();
    const pros = await fetchProfessionals().catch(() => []);
    // Villes où cette matière est réellement enseignée.
    return {
      cities: citiesWithOffer(pros)
        .filter((s) => comboStats(pros, s.city, subject).profiles > 0)
        .map((s) => s.city.slug),
    };
  },
  head: ({ params, loaderData }) =>
    seoRouteHead({
      type: "subject",
      lang: params.lang as SeoLang,
      subject: findSubject(params.matiere),
      index: (loaderData?.cities.length ?? 0) > 0,
    }),
  component: SubjectPage,
});

function SubjectPage() {
  const { lang: rawLang, matiere } = Route.useParams();
  const lang = rawLang as SeoLang;
  const subject = findSubject(matiere)!;
  const { cities } = Route.useLoaderData();
  const c = subjectCopy(lang, subject);
  const list = seoCities().filter((city) => cities.includes(city.slug));
  return (
    <SeoLandingPage
      lang={lang}
      h1={c.h1}
      intro={c.intro}
      filter={{ subject }}
      breadcrumbs={[
        homeCrumb(lang),
        { to: "/$lang/matieres", params: { lang }, label: nav("subjects", lang) },
      ]}
      sections={[
        ...(list.length
          ? [
              {
                title: nav("cities", lang),
                items: citiesForSubject(lang, list, subject.slug, subject.fr, subject.ar),
              },
            ]
          : []),
        {
          title: nav("levels", lang),
          items: SEO_LEVELS.map((l) => ({
            to: "/$lang/niveaux/$niveau",
            params: { lang, niveau: l.slug },
            label: label.level(l, lang),
          })),
        },
      ]}
    />
  );
}
