import { seoRouteHead } from "@/lib/seo";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { SeoLandingPage, SeoLink } from "@/components/seo-landing";
import { label, nav, teachersCopy } from "@/lib/seo-copy";
import {
  citiesForSubject, crumb, homeCrumb, localIntentLinks, subjectsInCity
} from "@/lib/seo-links";
import {
  SEO_LEVELS, SEO_SUBJECTS, findCity, findSubject, seoCities, type SeoLang
} from "@/lib/seo-taxonomy";
import { cityStats, citiesWithOffer, comboStats, isCityIndexable } from "@/lib/seo-eligibility";
import { fetchProfessionals } from "@/lib/marketplace";

/** /[lang]/professeurs/[ville] ou /[lang]/professeurs/[matiere]. */
export function resolve(segment: string) {
  const city = findCity(segment);
  const subject = city ? null : findSubject(segment);
  return { city, subject };
}

export const Route = createFileRoute("/$lang/professeurs/$ville/")({
  loader: async ({ params }) => {
    const { city, subject } = resolve(params.ville);
    if (!city && !subject) throw notFound();
    const lang = params.lang as SeoLang;
    const pros = await fetchProfessionals().catch(() => []);

    if (city) {
      const stats = cityStats(pros, city);
      return {
        indexable: isCityIndexable(stats, lang),
        subjects: stats.subjects.map((s) => s.slug),
        levels: stats.levels.map((l) => l.slug),
        cities: [] as string[],
      };
    }
    // Page matière : uniquement les villes où cette matière existe réellement.
    const cities = citiesWithOffer(pros)
      .filter((s) => comboStats(pros, s.city, subject).profiles > 0)
      .map((s) => s.city.slug);
    return { indexable: cities.length > 0, subjects: [], levels: [], cities };
  },
  head: ({ params, loaderData }) => {
    const { city, subject } = resolve(params.ville);
    return seoRouteHead({
      type: "teachers",
      lang: params.lang as SeoLang,
      city,
      subject,
      index: loaderData?.indexable ?? false,
    });
  },
  component: TeachersSegment,
});

function TeachersSegment() {
  const { lang: rawLang, ville } = Route.useParams();
  const lang = rawLang as SeoLang;
  const data = Route.useLoaderData();
  const { city, subject } = resolve(ville);
  const c = teachersCopy(lang, city, subject, null);

  const realSubjects = SEO_SUBJECTS.filter((s) => data.subjects.includes(s.slug));
  const realLevels = SEO_LEVELS.filter((l) => data.levels.includes(l.slug));

  const sections = city
    ? [
        {
          title: lang === "fr" ? `Recherches fréquentes à ${city.fr}` : `أكثر الطلبات ${city.arBi}`,
          items: localIntentLinks(lang, city, realSubjects),
        },
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
      ]
    : subject
      ? [
          {
            title: nav("cities", lang),
            items: citiesForSubject(
              lang,
              seoCities().filter((x) => data.cities.includes(x.slug)),
              subject.slug,
              subject.fr,
              subject.ar,
            ),
          },
        ]
      : [];

  return (
    <SeoLandingPage
      lang={lang}
      h1={c.h1}
      intro={c.intro}
      filter={{ city, subject }}
      breadcrumbs={[
        homeCrumb(lang),
        { to: "/$lang/professeurs", params: { lang }, label: nav("teachers", lang) },
        ...(city ? [crumb(lang, "/$lang/villes/$ville", { ville: city.slug }, label.city(city, lang))] : []),
      ]}
      sections={sections}
    >
      {city ? (
        <section className="mt-8 max-w-3xl rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-bold">
            {lang === "fr"
              ? `Cours particuliers à ${city.fr} : comment ça marche`
              : `دروس خصوصية ${city.arIn}: كيف تسير الأمور`}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {lang === "fr"
              ? `Que vous cherchiez un professeur de maths à ${city.fr}, un cours de français à domicile ou du soutien scolaire en ligne, chaque profil affiche le tarif horaire, les niveaux enseignés et les quartiers desservis à ${city.fr}.`
              : `سواء كنت تبحث عن ${SEO_SUBJECTS[0]?.arTeacher ?? "أستاذ خصوصي"} ${city.arIn}، أو عن دروس الدعم في المنزل أو عن بُعد، يعرض كل ملف السعر بالساعة والمستويات المدرَّسة والأحياء المغطاة ${city.arBi}.`}
          </p>
          <SeoLink
            to="/$lang/villes/$ville"
            params={{ lang, ville: city.slug }}
            className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
          >
            {lang === "fr"
              ? `Voir la page complète de ${city.fr} →`
              : `عرض الصفحة الكاملة ${city.arBi} ←`}
          </SeoLink>
        </section>
      ) : null}
    </SeoLandingPage>
  );
}
