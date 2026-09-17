import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import type { AccountRole } from "@/lib/pending-role";

const PUBLIC_SITE_URL = "https://profinder.ma";

type GoogleOAuthResult =
  | { error: null; redirected: true }
  | { error: null; redirected?: false }
  | { error: Error; redirected?: false };

function usesLovableOAuthBroker(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".lovable.app") ||
    hostname.endsWith(".lovableproject.com")
  );
}

/**
 * Lovable-hosted previews provide /~oauth/initiate. External hosts such as
 * Netlify do not, so they must start Google OAuth directly through auth.
 */
export async function signInWithGoogle(
  role?: AccountRole,
): Promise<GoogleOAuthResult> {
  const origin = window.location.origin;
  // Le retour se fait toujours sur l'origine réellement utilisée : le domaine
  // public profinder.ma en production (plus d'ancienne adresse publiée en relais),
  // ou l'origine locale/preview quand on passe par le broker Lovable.
  const returnOrigin = usesLovableOAuthBroker(window.location.hostname) ? origin : PUBLIC_SITE_URL;
  // Le rôle choisi est conservé en stockage local (voir rememberPendingRole).
  // L'URI de redirection Google doit être exacte et sans paramètres.
  // Le rôle voyage dans l'URL de retour (paramètre côté application, invisible
  // pour Google : l'URI enregistrée chez Google reste le callback du backend).
  const returnUrl = role
    ? `${returnOrigin}/auth?mode=signup&role=${role}`
    : `${returnOrigin}/auth`;

  if (usesLovableOAuthBroker(window.location.hostname)) {
    return lovable.auth.signInWithOAuth("google", { redirect_uri: returnUrl });
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: returnUrl,
      queryParams: { prompt: "select_account" },
    },
  });

  return error ? { error } : { error: null, redirected: true };
}