import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { MobileTabBar, SiteFooter, SiteHeader } from "@/components/site";
import { ProCard } from "@/components/pro-card";
import { fetchProfessionals } from "@/lib/marketplace";
import { SEO_LEVELS, filterPros, proSlug, type SeoFilter, type SeoLang } from "@/lib/seo-taxonomy";
import { localInfo, seoFaq } from "@/lib/seo-content";

/** Les trois cycles scolaires qui structurent l'offre (H3 de la section niveaux). */
const MAIN_LEVELS = SEO_LEVELS.filter((l) => ["primaire", "college", "lycee"].includes(l.slug));

export type SeoLinkItem = { to: string; params?: Record<string, string>; label: string };

/** Lien interne typé de façon souple (les chemins sont construits dynamiquement). */
export function SeoLink({
  to,
  params,
  className,
  children,
}: {
  to: string;
  params?: Record<string, string> | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <Link to={to as never} params={params as never} className={className}>
      {children}
    </Link>
  );
}

export function SeoShell({
  lang,
  breadcrumbs,
  children,
}: {
  lang: SeoLang;
  breadcrumbs?: SeoLinkItem[] | undefined;
  children: ReactNode;
}) {
  return (
    <div
      className="min-h-screen bg-background font-sans text-foreground"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Fil d'Ariane" className="mb-6 text-xs text-muted-foreground">
            {breadcrumbs.map((b, i) => (
              <span key={b.to + (b.params ? JSON.stringify(b.params) : "")}>
                {i > 0 ? <span className="px-1.5">/</span> : null}
                <SeoLink to={b.to} params={b.params} className="hover:text-primary">
                  {b.label}
                </SeoLink>
              </span>
            ))}
          </nav>
        ) : null}
        {children}
      </main>
      <MobileTabBar />
      <SiteFooter />
    </div>
  );
}

export function LinkGrid({ title, items }: { title: string; items: SeoLinkItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((it) => (
          <SeoLink
            key={it.label + it.to + JSON.stringify(it.params ?? {})}
            to={it.to}
            params={it.params}
            className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition hover:border-primary hover:text-primary"
          >
            {it.label}
          </SeoLink>
        ))}
      </div>
    </section>
  );
}

/** Page de destination : H1, contenu éditorial, professeurs réels, maillage interne. */
export function SeoLandingPage({
  lang,
  h1,
  intro,
  filter,
  breadcrumbs,
  sections,
  faq,
  children,
}: {
  lang: SeoLang;
  h1: string;
  intro: string;
  filter: SeoFilter;
  breadcrumbs?: SeoLinkItem[] | undefined;
  sections?: Array<{ title: string; items: SeoLinkItem[] }> | undefined;
  faq?: Array<{ q: string; a: string }> | undefined;
  children?: ReactNode | undefined;
}) {
  const pros = useQuery({ queryKey: ["professionals"], queryFn: fetchProfessionals });
  const matches = filterPros(pros.data ?? [], filter);
  const infos = localInfo(lang, matches, filter);
  const questions = faq && faq.length > 0 ? faq : seoFaq(lang, filter, matches.length);

  const cta = lang === "fr" ? "Publier ma demande gratuitement" : "انشر طلبك مجاناً";
  const emptyText =
    lang === "fr"
      ? "Aucun professeur n'est encore référencé ici. Publiez votre demande : les professeurs disponibles y répondront sous 24 h."
      : "لا يوجد أستاذ مسجل هنا بعد. انشر طلبك وسيتجاوب معك الأساتذة المتاحون خلال 24 ساعة.";

  const subjectFr = filter.subject ? filter.subject.fr.toLowerCase() : "cours";
  const inCityFr = filter.city ? ` à ${filter.city.fr}` : " au Maroc";
  const inCityAr = filter.city ? ` ${filter.city.arIn}` : " في المغرب";
  const subjectAr = filter.subject ? filter.subject.ar : "المواد الدراسية";

  return (
    <SeoShell lang={lang} breadcrumbs={breadcrumbs}>
      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">{h1}</h1>
      </header>

      <section className="mt-6 max-w-3xl">
        <h2 className="text-lg font-bold">{lang === "fr" ? "Présentation" : "نبذة عن الخدمة"}</h2>
        <p className="mt-3 text-muted-foreground">{intro}</p>
        <SeoLink
          to="/publier"
          className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          {cta}
        </SeoLink>
      </section>

      {children}

      <section className="mt-12">
        <h2 className="mb-1 text-lg font-bold">
          {lang === "fr" ? "Professeurs disponibles" : "الأساتذة المتاحون"}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {lang === "fr"
            ? `${matches.length} professeur${matches.length > 1 ? "s" : ""} référencé${matches.length > 1 ? "s" : ""}${inCityFr}.`
            : `${matches.length} أستاذ مسجل${inCityAr}.`}
        </p>
        {pros.isLoading ? (
          <p className="text-sm text-muted-foreground">…</p>
        ) : matches.length === 0 ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {matches.slice(0, 24).map((p) => (
              <div key={p.id}>
                <ProCard pro={p} />
                <SeoLink
                  to="/$lang/professeur/$slug"
                  params={{ lang, slug: proSlug(p) }}
                  className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
                >
                  {lang === "fr" ? "Voir la fiche complète" : "عرض الملف الكامل"}
                </SeoLink>
              </div>
            ))}
          </div>
        )}
      </section>

      {infos.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-bold">
            {lang === "fr" ? "Informations locales" : "معلومات محلية"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {infos.map((it) => (
              <article key={it.title} className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-bold">{it.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{it.text}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {filter.level ? null : (
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-bold">

            {lang === "fr" ? "Cours selon le niveau" : "الدروس حسب المستوى"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {MAIN_LEVELS.map((l) => (
              <article key={l.slug} className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-bold">{lang === "fr" ? l.fr : l.ar}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lang === "fr"
                    ? `Séances de ${subjectFr} adaptées au programme du ${l.fr.toLowerCase()}${inCityFr}, à domicile ou en ligne.`
                    : `حصص في ${subjectAr} تواكب برنامج ${l.ar}${inCityAr}، في المنزل أو عن بُعد.`}
                </p>
                <SeoLink
                  to="/$lang/niveaux/$niveau"
                  params={{ lang, niveau: l.slug }}
                  className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
                >
                  {lang === "fr" ? `Professeurs ${l.fr.toLowerCase()}` : `أساتذة ${l.ar}`}
                </SeoLink>
              </article>
            ))}
          </div>
        </section>
      )}

      {(sections ?? []).map((s) => (
        <LinkGrid key={s.title} title={s.title} items={s.items} />
      ))}

      {questions.length > 0 ? (
        <section className="mt-12 max-w-3xl">
          <h2 className="mb-4 text-lg font-bold">{lang === "fr" ? "Questions fréquentes" : "أسئلة شائعة"}</h2>
          <div className="space-y-4">
            {questions.map((f) => (
              <div key={f.q} className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-bold">{f.q}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </SeoShell>
  );
}
