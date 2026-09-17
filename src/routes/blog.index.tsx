import { createFileRoute, redirect } from "@tanstack/react-router";
import { resolveInitialLang } from "@/lib/i18n";

export const Route = createFileRoute("/blog/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: resolveInitialLang() === "ar" ? "/ar/blog" : "/fr/blog" });
  },
});
