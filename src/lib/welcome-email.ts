import { sendWelcomeEmail } from "@/lib/email.functions";

/**
 * Demande l'email de bienvenue ProFinder après une connexion Google.
 *
 * L'appel passe par la fonction serveur authentifiée du site courant :
 * l'identité vient du jeton de session, et l'envoi est verrouillé côté
 * serveur pour qu'un seul email parte par compte.
 */
export async function requestWelcomeEmail(role: "client" | "pro"): Promise<void> {
  // Une seconde tentative couvre le cas où la session vient juste d'être créée
  // et où le jeton n'est pas encore attaché à la première requête.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await sendWelcomeEmail({ data: { role } });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

