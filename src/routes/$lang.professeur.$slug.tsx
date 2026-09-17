import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SeoLink, SeoShell } from "@/components/seo-landing";
import { ProCard, modesOf } from "@/components/pro-card";
import { RatingBadge } from "@/components/rating-badge";
import { RequestProButton } from "@/components/request-pro";
import {
  fetchProfessionals, cityName, serviceName, levelName, formatAvailability
} from "@/lib/marketplace";
import { nav } from "@/lib/seo-copy";
import { seoNotFoundHead, seoRouteHead } from "@/lib/seo";
import { homeCrumb } from "@/lib/seo-links";
import {
  seoCities, SEO_SUBJECTS, findProBySlug, isProfileIndexable, serviceMatchesSubject, type SeoLang
} from "@/lib/seo-taxonomy";

export const Route = createFileRoute("/$lang/professeur/$slug")({
  loader: async ({ params }) => {
    const pros = await fetchProfessionals().catch(() => []);
    const pro = findProBySlug(pros, params.slug);
    if (!pro) throw notFound();
    const subjects = Array.from(
      new Set(pro.professional_services.map((s) => serviceName(s.service_id)).filter(Boolean)),
    ) as string[];
    const levels = Array.from(
      new Set(pro.professional_levels.map((l) => levelName(l.level_id)).filter(Boolean)),
    ) as string[];
    const modes = [
      pro.mode_home ? "home" : null,
      pro.mode_studio ? "studio" : null,
      pro.mode_online ? "online" : null,
    ].filter(Boolean) as string[];
    const bio = (pro.bio ?? "").trim();
    // Indexation uniquement si le profil est actif, public et réellement complet.
    const complete = isProfileIndexable(pro);
    return {
      id: pro.id,
      name: pro.display_name,
      headline: pro.headline,
      bio,
      city: cityName(pro.city_id),
      area: pro.area,
      rate: pro.hourly_rate,
      rating: pro.rating_avg,
      ratingCount: pro.rating_count,
      experience: pro.experience_years,
      lessons: pro.lessons_count,
      verified: pro.is_verified,
      languages: pro.languages ?? [],
      diplomas: pro.diplomas,
      availability: formatAvailability(pro.professional_availability),
      modes,
      levels,
      complete,
      subjectSlug:
        SEO_SUBJECTS.find((sub) => pro.professional_services.some((s) => serviceMatchesSubject(s.service_id, sub)))
          ?.slug ?? null,
      citySlug: seoCities().find((c) => c.cityName === cityName(pro.city_id))?.slug ?? null,
      subjects,
      mode_home: pro.mode_home,
      mode_online: pro.mode_online,
      mode_studio: pro.mode_studio,
      // Photo sociale : uniquement si le professeur en a réellement publié une.
      photo: pro.photo_url && /^https?:\/\//.test(pro.photo_url) ? pro.photo_url : null,
    };

  },
  head: ({ params, loaderData }) => {
    const lang = params.lang as SeoLang;
    if (!loaderData) return seoNotFoundHead(lang, `/professeur/${params.slug}`, "professional");
    return seoRouteHead({
      type: "professional",
      lang,
      subject: SEO_SUBJECTS.find((s) => s.slug === loaderData.subjectSlug) ?? null,
      city: seoCities().find((c) => c.slug === loaderData.citySlug) ?? null,
      // Profil incomplet ou non vérifiable → contenu insuffisant, pas d'indexation.
      index: loaderData.complete,
      // Photo réelle du professeur si elle existe, sinon bannière de marque.
      image: loaderData.photo,
      pro: {
        slug: params.slug,
        name: loaderData.name,
        bio: loaderData.bio,
        photo: loaderData.photo,
        city: loaderData.city,
        subjects: loaderData.subjects,
        rate: loaderData.rate,
      },
    });
  },
  component: TeacherProfile,
});

const MODE_TEXT: Record<string, { fr: string; ar: string }> = {
  home: { fr: "À domicile", ar: "في منزل التلميذ" },
  studio: { fr: "Chez le professeur", ar: "عند الأستاذ" },
  online: { fr: "En ligne", ar: "عن بُعد" },
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

function TeacherProfile() {
  const { lang: rawLang } = Route.useParams();
  const lang = rawLang as SeoLang;
  const fr = lang === "fr";
  const data = Route.useLoaderData();
  const pros = useQuery({ queryKey: ["professionals"], queryFn: fetchProfessionals });
  const pro = (pros.data ?? []).find((p) => p.id === data.id) ?? null;

  const seoSubject = SEO_SUBJECTS.find((s) => s.slug === data.subjectSlug) ?? null;
  const seoCity = seoCities().find((c) => c.slug === data.citySlug) ?? null;
  const h1 = fr
    ? `${data.name} — ${seoSubject ? `professeur de ${seoSubject.fr.toLowerCase()}` : "professeur particulier"}${data.city ? ` à ${data.city}` : ""}`
    : `${data.name} — ${seoSubject ? seoSubject.arTeacher : "أستاذ خصوصي"}${seoCity ? ` ${seoCity.arIn}` : ""}`;

  const cityPart =
    (data.mode_home || data.mode_studio) && data.city ? `📍 ${data.city}` : null;
  const modes = modesOf(
    { mode_home: data.mode_home, mode_online: data.mode_online, mode_studio: data.mode_studio },
    !fr,
  );
  const recapMeta = [cityPart, modes.length > 0 ? modes.join(", ") : null].filter(
    Boolean,
  ) as string[];

  const facts: Array<{ label: string; value: string }> = [];
  if (data.city)
    facts.push({ label: fr ? "Ville" : "المدينة", value: [data.city, data.area].filter(Boolean).join(" · ") });
  if (data.subjects.length)
    facts.push({ label: fr ? "Matières" : "المواد", value: data.subjects.join(", ") });
  if (data.levels.length) facts.push({ label: fr ? "Niveaux" : "المستويات", value: data.levels.join(", ") });
  if (data.modes.length)
    facts.push({
      label: fr ? "Mode de cours" : "طريقة التدريس",
      value: data.modes.map((m) => (fr ? MODE_TEXT[m]!.fr : MODE_TEXT[m]!.ar)).join(" · "),
    });
  if (data.experience > 0)
    facts.push({
      label: fr ? "Expérience" : "الخبرة",
      value: fr ? `${data.experience} ans d'enseignement` : `${data.experience} سنوات من التدريس`,
    });
  if (data.rate > 0)
    facts.push({
      label: fr ? "Tarif" : "السعر",
      value: fr ? `${data.rate} DH / heure` : `${data.rate} درهم للساعة`,
    });
  if (data.availability)
    facts.push({ label: fr ? "Disponibilité" : "التوفر", value: data.availability });
  if (data.languages.length)
    facts.push({ label: fr ? "Langues" : "اللغات", value: data.languages.join(", ") });
  if (data.ratingCount > 0)
    facts.push({
      label: fr ? "Avis" : "الآراء",
      value: fr
        ? `${data.rating.toFixed(1)}/5 sur ${data.ratingCount} avis`
        : `${data.rating.toFixed(1)}/5 من ${data.ratingCount} رأي`,
    });

  return (
    <SeoShell
      lang={lang}
      breadcrumbs={[
        homeCrumb(lang),
        { to: "/$lang/professeurs", params: { lang }, label: nav("teachers", lang) },
        ...(seoCity
          ? [
              {
                to: "/$lang/professeurs/$ville",
                params: { lang, ville: seoCity.slug },
                label: fr ? seoCity.fr : seoCity.ar,
              },
            ]
          : []),
      ]}
    >
      <h1 className="text-3xl font-bold tracking-tight" data-no-translate>{h1}</h1>
      {data.headline ? (
        <p className="mt-2 text-muted-foreground" data-no-translate>
          {data.headline}
        </p>
      ) : null}
      {data.verified ? (
        <p className="mt-2 text-xs font-semibold text-primary">
          {fr ? "Profil vérifié par Profinder" : "ملف موثوق من طرف Profinder"}
        </p>
      ) : null}

      {/* Récapitulatif compact : ville + modes + avis */}
      <div className="mt-4 flex flex-wrap items-center gap-3" data-no-translate>
        {recapMeta.length > 0 && (
          <p
            className={
              "font-medium text-muted-foreground " +
              (fr ? "text-[13px] leading-snug tracking-tight" : "text-sm")
            }
          >
            {recapMeta.join(" · ")}
          </p>
        )}
        {data.ratingCount > 0 && (
          <RatingBadge average={data.rating} count={data.ratingCount} className="text-sm" />
        )}
      </div>

      {/* Matières et niveaux en évidence */}
      {data.subjects.length > 0 && (
        <section className="mt-6" data-no-translate>
          <div className="flex flex-wrap gap-2">
            {data.subjects.map((subject) => (
              <span
                key={subject}
                className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm"
              >
                {subject}
              </span>
            ))}
          </div>
          {data.levels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {data.levels.map((level) => (
                <span
                  key={level}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground"
                >
                  {level}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          {data.bio ? (
            <section>
              <h2 className="text-lg font-bold">{fr ? "Présentation" : "نبذة عن الأستاذ"}</h2>
              <p
                className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground"
                data-no-translate
              >
                {data.bio}
              </p>
            </section>
          ) : null}

          {facts.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-lg font-bold">{fr ? "Informations du profil" : "معلومات الملف"}</h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {facts.map((f) => (
                  <Fact key={f.label} label={f.label} value={f.value} />
                ))}
              </dl>
            </section>
          ) : null}

          {data.diplomas ? (
            <section className="mt-10">
              <h2 className="text-lg font-bold">{fr ? "Diplômes" : "الشهادات"}</h2>
              <p className="mt-3 text-sm text-muted-foreground" data-no-translate>
                {data.diplomas}
              </p>
            </section>
          ) : null}

          {seoSubject && seoCity ? (
            <section className="mt-10">
              <h2 className="text-lg font-bold">{fr ? "Voir aussi" : "انظر أيضاً"}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <SeoLink
                  to="/$lang/professeurs/$ville/$matiere"
                  params={{ lang, ville: seoCity.slug, matiere: seoSubject.slug }}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-sm hover:border-primary hover:text-primary"
                >
                  {fr
                    ? `Professeurs de ${seoSubject.fr.toLowerCase()} à ${seoCity.fr}`
                    : `${seoSubject.arTeacher} ${seoCity.arIn}`}
                </SeoLink>
                <SeoLink
                  to="/$lang/villes/$ville"
                  params={{ lang, ville: seoCity.slug }}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-sm hover:border-primary hover:text-primary"
                >
                  {fr ? `Soutien scolaire à ${seoCity.fr}` : `الدعم المدرسي ${seoCity.arBi}`}
                </SeoLink>
              </div>
            </section>
          ) : null}
        </div>

        <aside>
          {pro ? <ProCard pro={pro} action={<RequestProButton pro={pro} />} /> : null}
          <div className="mt-4">
            <SeoLink
              to="/professeurs/$id"
              params={{ id: data.id }}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {fr ? "Voir le profil détaillé et les avis" : "عرض الملف التفصيلي والآراء"}
            </SeoLink>
          </div>
        </aside>
      </div>
    </SeoShell>
  );
}
