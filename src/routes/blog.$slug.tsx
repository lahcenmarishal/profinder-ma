import { createFileRoute, redirect } from "@tanstack/react-router";
import { resolveInitialLang } from "@/lib/i18n";
import { fetchAlternateSlug, fetchPostBySlug } from "@/lib/blog";

export const Route = createFileRoute("/blog/$slug")({
  ssr: false,
  beforeLoad: async ({ params }) => {
    if (resolveInitialLang() !== "ar") {
      throw redirect({ to: "/fr/blog/$slug", params: { slug: params.slug } });
    }
    const frPost = await fetchPostBySlug("fr", params.slug);
    const arSlug = await fetchAlternateSlug(frPost?.translation_key ?? null, "ar");
    if (arSlug) throw redirect({ to: "/ar/blog/$slug", params: { slug: arSlug } });
    throw redirect({ to: "/ar/blog" });
  },
});
