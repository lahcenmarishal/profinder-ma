import { sendWelcomeEmail } from "@/lib/email.functions";

/**
 * Demande l'email de bienvenue ProFinder après une connexion Google.
 *
 * L'appel passe par la fonction serveur authentifiée du site courant :
 * l'identité vient du jeton de session, et l'envoi est verrouillé côté
 * serveur pour qu'un seul email parte par compte.
 */
export async function requestWelcomeEmail(role: "client" | "pro"): Promise<void> {
  try {
    await sendWelcomeEmail({ data: { role } });
  } catch {
    /* l'email de bienvenue reste secondaire */
  }
}
