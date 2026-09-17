/**
 * Relais des envois d'emails vers le déploiement qui détient la clé privée.
 *
 * Le site peut être servi par un hébergeur externe (Netlify) qui ne reçoit pas
 * la clé privée du backend. Dans ce cas, les opérations d'email sont confiées
 * au déploiement Lovable, qui exécute exactement le même code.
 */

const DEFAULT_RELAY_ORIGIN = "https://remix-of-dreams.lovable.app";

export function hasServiceRoleKey(): boolean {
  return Boolean(process.env["SUPABASE_SERVICE_ROLE_KEY"]);
}

function relayOrigin(): string {
  return (process.env["EMAIL_RELAY_ORIGIN"] ?? DEFAULT_RELAY_ORIGIN).replace(/\/$/, "");
}

/**
 * Renvoie la réponse du déploiement relais, ou `null` si la clé privée est
 * disponible localement (auquel cas l'appelant fait le travail lui-même).
 */
export async function relay<T>(action: string, payload: unknown): Promise<T | null> {
  if (hasServiceRoleKey()) return null;

  try {
    const response = await fetch(`${relayOrigin()}/api/public/auth-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    if (!response.ok) {
      console.error(`[email] relais ${action} en échec:`, response.status);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`[email] relais ${action} injoignable:`, error);
    return null;
  }
}
