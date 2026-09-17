import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ensureSession, knownSession } from "@/lib/auth-store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () => ({ meta: [{ name: "robots", content: "noindex,nofollow" }] }),
  beforeLoad: async () => {
    // Session partagée en cache : navigation instantanée entre les espaces,
    // sans appel réseau ni écran de chargement à chaque changement de page.
    const session = knownSession() ?? (await ensureSession());
    if (!session?.user)
      throw redirect({ to: "/auth", search: { mode: "signin", role: "client" } });
    return { user: session.user };
  },
  component: () => <Outlet />,
});
