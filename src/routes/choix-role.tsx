import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GraduationCap, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { applyOAuthRole } from "@/lib/oauth-flow";
import type { AccountRole } from "@/lib/pending-role";
import { SiteHeader } from "@/components/site";

export const Route = createFileRoute("/choix-role")({
  head: () => ({
    meta: [
      { title: "Bienvenue sur ProFinder — choisissez votre parcours" },
      {
        name: "description",
        content:
          "Nouveau sur ProFinder ? Choisissez votre parcours : professeur ou élève/parent à la recherche d'un professeur.",
      },
      { property: "og:title", content: "Bienvenue sur ProFinder" },
      {
        property: "og:description",
        content: "Choisissez votre parcours : professeur ou élève/parent.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoleChoicePage,
});

function RoleChoicePage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<AccountRole | null>(null);
  const [ready, setReady] = useState(false);

  // Page réservée aux visiteurs fraîchement connectés (retour Google).
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        void navigate({ to: "/auth", search: { mode: "signin", role: "client" } });
        return;
      }
      setReady(true);
    });
  }, [navigate]);

  const choose = async (role: AccountRole) => {
    setBusy(role);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        navigate({ to: "/auth", search: { mode: "signin", role: "client" } });
        return;
      }
      await applyOAuthRole(user, role);
      navigate(role === "pro" ? { to: "/pro/inscription" } : { to: "/mon-besoin" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue");
      setBusy(null);
    }
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="mb-3 text-center text-3xl font-extrabold tracking-tight">
          Bienvenue sur ProFinder 👋
        </h1>
        <p className="mb-10 text-center text-sm text-muted-foreground">
          Votre compte est créé. Une dernière étape : dites-nous qui vous êtes
          pour personnaliser votre espace.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void choose("pro")}
            className="group rounded-2xl border border-border bg-card p-6 text-left transition hover:border-primary hover:shadow-md disabled:opacity-60"
          >
            <GraduationCap className="mb-4 h-8 w-8 text-primary" />
            <span className="block text-lg font-bold">Je suis professeur</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Créez votre profil professionnel et recevez des demandes d'élèves.
            </span>
            <span className="mt-4 block text-sm font-semibold text-primary">
              {busy === "pro" ? "Préparation…" : "Continuer →"}
            </span>
          </button>

          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void choose("client")}
            className="group rounded-2xl border border-border bg-card p-6 text-left transition hover:border-primary hover:shadow-md disabled:opacity-60"
          >
            <Search className="mb-4 h-8 w-8 text-primary" />
            <span className="block text-lg font-bold">Je cherche un professeur</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Élève ou parent : décrivez votre besoin et recevez des propositions.
            </span>
            <span className="mt-4 block text-sm font-semibold text-primary">
              {busy === "client" ? "Préparation…" : "Continuer →"}
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}
