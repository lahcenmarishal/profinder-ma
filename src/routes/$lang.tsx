import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";
import { loadSeoCities } from "@/lib/seo-cities";
import { NotFoundPage } from "@/components/not-found";

/** Segment de langue : uniquement /fr et /ar. */
export const Route = createFileRoute("/$lang")({
  beforeLoad: async ({ params }) => {
    if (params.lang !== "fr" && params.lang !== "ar") throw notFound();
    // Registre de villes issu des données réelles, disponible pour toutes les
    // routes SEO enfants (loaders, head, composants) — y compris en SSR.
    await loadSeoCities();
  },
  notFoundComponent: NotFoundPage,
  component: () => <Outlet />,
});
