import { seoRouteHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { LinkGrid, SeoLink, SeoShell } from "@/components/seo-landing";
import { homeCopy, nav } from "@/lib/seo-copy";
import { cityLinks, levelLinks, subjectLinks } from "@/lib/seo-links";
import { seoCities, type SeoLang } from "@/lib/seo-taxonomy";
import { citiesWithOffer } from "@/lib/seo-eligibility";
import { fetchProfessionals } from "@/lib/marketplace";

export const Route = createFileRoute("/$lang/")({
  loader: async () => {
    const pros = await fetchProfessionals().catch(() => []);
    // Maillage vers les villes réellement pourvues (top 12 par valeur réelle).
    return { cities: citiesWithOffer(pros).slice(0, 12).map((s) => s.city.slug) };
  },
  head: ({ params }) => seoRouteHead({ type: "home", lang: params.lang as SeoLang }),
  component: LangHome,
});

function LangHome() {
  const lang = Route.useParams().lang as SeoLang;
  const { cities } = Route.useLoaderData();
  const c = homeCopy(lang);
  const list = seoCities().filter((city) => cities.includes(city.slug));
  return (
    <SeoShell lang={lang}>
      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">{c.h1}</h1>
        <p className="mt-3 text-muted-foreground">{c.intro}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <SeoLink
            to="/publier"
            className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            {lang === "fr" ? "Publier ma demande" : "انشر طلبك"}
          </SeoLink>
          <SeoLink
            to="/$lang/professeurs"
            params={{ lang }}
            className="rounded-xl border border-border px-6 py-3 text-sm font-bold"
          >
            {nav("teachers", lang)}
          </SeoLink>
        </div>
      </header>

      <LinkGrid title={nav("subjects", lang)} items={subjectLinks(lang)} />
      {list.length ? <LinkGrid title={nav("cities", lang)} items={cityLinks(lang, list)} /> : null}
      <LinkGrid title={nav("levels", lang)} items={levelLinks(lang)} />
      <LinkGrid
        title={nav("blog", lang)}
        items={[{ to: lang === "fr" ? "/fr/blog" : "/ar/blog", label: nav("blog", lang) }]}
      />
    </SeoShell>
  );
}
