import { seoRouteHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { LinkGrid, SeoShell } from "@/components/seo-landing";
import { levelHubCopy, nav } from "@/lib/seo-copy";
import { homeCrumb, levelLinks } from "@/lib/seo-links";
import { type SeoLang } from "@/lib/seo-taxonomy";

export const Route = createFileRoute("/$lang/niveaux/")({
  head: ({ params }) => seoRouteHead({ type: "levels", lang: params.lang as SeoLang }),
  component: LevelsHub,
});

function LevelsHub() {
  const lang = Route.useParams().lang as SeoLang;
  const c = levelHubCopy(lang);
  return (
    <SeoShell lang={lang} breadcrumbs={[homeCrumb(lang)]}>
      <h1 className="text-3xl font-bold tracking-tight">{c.h1}</h1>
      <p className="mt-3 max-w-3xl text-muted-foreground">{c.intro}</p>
      <LinkGrid title={nav("levels", lang)} items={levelLinks(lang)} />
    </SeoShell>
  );
}
