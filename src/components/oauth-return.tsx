import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  chosenOAuthRole,
  consumeOAuthPending,
  ensureOAuthAccount,
  expectedOAuthRole,
  resolvePostAuthTarget,
} from "@/lib/oauth-flow";

import { clearPendingRole } from "@/lib/pending-role";
import { clearClientFlowData } from "@/lib/student-need";
import { requestWelcomeEmail } from "@/lib/welcome-email";
import { isAdminUser } from "@/lib/auth-store";

/**
 * Redirige l'utilisateur vers le bon espace après un retour de connexion Google
 * (le fournisseur renvoie toujours sur une page publique du site).
 */
export function OAuthReturnHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Ne s'active qu'au retour du fournisseur : marqueur de connexion en cours,
    // ou jetons/code renvoyés dans l'URL (cas d'un retour sur un autre domaine).
    const url = window.location.search + window.location.hash;
    const path = window.location.pathname.replace(/\/+$/, "");
    // Réinitialisation du mot de passe : le lien reçu par email ouvre une
    // session, mais l'utilisateur doit rester sur la page pour choisir son
    // nouveau mot de passe — aucune redirection automatique ici.
    if (path === "/nouveau-mot-de-passe" || /(?:[?&#])type=recovery/.test(url)) return;
    const hasProviderResponse = /(?:[?&#])(code|access_token|error)=/.test(url);
    // Page de connexion : si une session existe déjà (retour Google déjà traité
    // par la librairie d'authentification), on route quand même l'utilisateur.
    const onAuthPage = path === "/auth";
    if (!hasProviderResponse && !onAuthPage && !expectedOAuthRole()) return;
    // Le rôle peut avoir été perdu (retour sur un autre domaine ou onglet) :
    // on continue quand même, l'écran de choix du parcours servira de garde-fou.
    const chosen = chosenOAuthRole();
    const expected = chosen ?? expectedOAuthRole() ?? "client";

    let cancelled = false;
    let done = false;

    const finish = async () => {
      if (done) return;
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user || cancelled) return;
        done = true;
        consumeOAuthPending();
        clearPendingRole();
        if (await isAdminUser(user.id)) {
          if (!cancelled) navigate({ to: "/admin" });
          return;
        }

        const { role, isNewAccount, roleWasChosen } = await ensureOAuthAccount(
          user,
          expected,
          chosen !== null,
        );
        // Email de bienvenue ProFinder (une seule fois, l'adresse Google est déjà confirmée).
        void requestWelcomeEmail(role === "pro" ? "pro" : "client");
        // Nouveau compte : on repart d'une page blanche pour ne jamais réutiliser
        // le besoin ou le professeur ciblé par un compte précédent sur cet appareil.
        if (isNewAccount) {
          clearClientFlowData();
          if (cancelled) return;
          if (!roleWasChosen) navigate({ to: "/choix-role" });
          else if (role === "pro") navigate({ to: "/pro/inscription" });
          else navigate({ to: "/mon-besoin" });
          return;
        }
        const target = await resolvePostAuthTarget(user.id, role);
        if (cancelled) return;
        switch (target.kind) {
          case "admin":
            navigate({ to: "/admin" });
            break;
          case "pro":
            navigate({ to: "/pro" });
            break;
          case "pro-onboarding":
            navigate({ to: "/pro/inscription" });
            break;
          case "request":
            if (target.published) toast.success("🎉 Votre demande a été publiée !");
            navigate({ to: "/demandes/$id", params: { id: target.id } });
            break;
          case "need":
            navigate({ to: "/mon-besoin" });
            break;
          default:
            navigate({ to: "/demandes" });
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Création du compte impossible");
        // On n'abandonne pas l'utilisateur sur la page de connexion : il continue
        // son parcours, la fiche manquante sera complétée à l'étape suivante.
        if (cancelled) return;
        if (expected === "pro") navigate({ to: "/pro/inscription" });
        else navigate({ to: "/demandes" });
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) void finish();
    });
    void finish();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return null;
}
