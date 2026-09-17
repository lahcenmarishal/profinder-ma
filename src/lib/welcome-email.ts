import { supabase } from "@/integrations/supabase/client";

/**
 * Demande l'email de bienvenue ProFinder.
 *
 * L'appel passe par la route publique `/api/public/auth-email` avec le jeton
 * de session : l'identité est vérifiée côté serveur. Si l'hébergeur courant
 * (Netlify) ne possède pas les clés privées, on rejoue la demande sur le
 * déploiement Lovable qui les détient.
 */

const RELAY_ORIGIN = "https://infinite-remix-magic.lovable.app";

export async function requestWelcomeEmail(role: "client" | "pro"): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) return;

    const body = JSON.stringify({ action: "welcome", payload: { accessToken, role } });
    const post = (origin: string) =>
      fetch(`${origin}/api/public/auth-email`, {
        method: "POST",
        // text/plain évite le contrôle OPTIONS inter-domaines de l'hébergeur ;
        // le contenu reste du JSON validé strictement par la route destinataire.
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body,
      }).catch(() => null);

    const origin = window.location.origin.replace(/\/$/, "");
    const first = await post(origin);
    if (first?.ok) return;
    if (origin !== RELAY_ORIGIN) await post(RELAY_ORIGIN);
  } catch {
    /* l'email de bienvenue reste secondaire */
  }
}
