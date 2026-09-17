import { seoRouteHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { LinkGrid, SeoShell } from "@/components/seo-landing";
import { cityHubCopy, nav } from "@/lib/seo-copy";
import { cityLinks, homeCrumb } from "@/lib/seo-links";
import { seoCities, type SeoLang } from "@/lib/seo-taxonomy";
import { citiesWithOffer, isCityIndexable } from "@/lib/seo-eligibility";
import { fetchProfessionals } from "@/lib/marketplace";

export const Route = createFileRoute("/$lang/villes/")({
  loader: async ({ params }) => {
    const pros = await fetchProfessionals().catch(() => []);
    const lang = params.lang as SeoLang;
    const stats = citiesWithOffer(pros);
    return {
      // Le hub ne liste que des villes réellement pourvues, et n'est indexé
      // que si au moins une ville a une vraie valeur SEO.
      cities: stats.map((s) => s.city.slug),
      indexable: stats.some((s) => isCityIndexable(s, lang)),
    };
  },
  head: ({ params, loaderData }) =>
    seoRouteHead({ type: "cities", lang: params.lang as SeoLang, index: loaderData?.indexable ?? false }),
  component: CitiesHub,
});

function CitiesHub() {
  const lang = Route.useParams().lang as SeoLang;
  const { cities } = Route.useLoaderData();
  const c = cityHubCopy(lang);
  const list = seoCities().filter((city) => cities.includes(city.slug));
  return (
    <SeoShell lang={lang} breadcrumbs={[homeCrumb(lang)]}>
      <h1 className="text-3xl font-bold tracking-tight">{c.h1}</h1>
      <p className="mt-3 max-w-3xl text-muted-foreground">{c.intro}</p>
      {list.length ? (
        <LinkGrid title={nav("cities", lang)} items={cityLinks(lang, list)} />
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          {lang === "fr"
            ? "Aucune ville ne dispose encore de professeurs publiés. Les villes apparaîtront ici dès que des professeurs y seront disponibles."
            : "لا توجد بعد مدينة بأساتذة منشورين. ستظهر المدن هنا بمجرد توفر أساتذة فيها."}
        </p>
      )}
    </SeoShell>
  );
}
