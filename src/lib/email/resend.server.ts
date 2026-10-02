/**
 * Envoi d'emails via Resend (domaine profinder.ma).
 * Fichier serveur uniquement : la clé API ne doit jamais atteindre le navigateur.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export const FROM_EMAIL = "ProFinder <noreply@profinder.ma>";
export const REPLY_TO = "contact@profinder.ma";

/** URL publique du site, utilisée dans les liens des emails. */
export function siteUrl(): string {
  // Les emails pointent toujours vers le site public, même si l'envoi
  // est déclenché depuis la version Lovable (preview) du site.
  return "https://profinder.ma";
}

export type SendResult = { sent: boolean; reason?: string };

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Clé d'unicité : évite tout envoi en double du même email. */
  dedupe?: { template: string; ref: string };
};

/**
 * Envoie un email et journalise l'envoi. Si `dedupe` est fourni, un second
 * appel avec la même clé n'envoie rien.
 */
export async function sendEmail({ to, subject, html, text, dedupe }: SendArgs): Promise<SendResult> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY manquante : email non envoyé", { subject });
    return { sent: false, reason: "missing_api_key" };
  }
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return { sent: false, reason: "invalid_recipient" };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Verrou d'unicité : l'insertion échoue si l'email a déjà été envoyé.
  if (dedupe) {
    const { error } = await supabaseAdmin
      .from("email_log")
      .insert({ recipient: to, template: dedupe.template, ref: dedupe.ref });
    if (error) return { sent: false, reason: "already_sent" };
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      reply_to: REPLY_TO,
      subject,
      html,
      ...(text ? { text } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[email] Resend a refusé l'envoi [${response.status}]: ${body}`);
    if (dedupe) {
      await supabaseAdmin
        .from("email_log")
        .delete()
        .eq("template", dedupe.template)
        .eq("ref", dedupe.ref);
    }
    return { sent: false, reason: `resend_error_${response.status}` };
  }

  return { sent: true };
}

/** Récupère l'adresse email d'un utilisateur (côté service). */
export async function userEmail(userId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error) return null;
  return data.user?.email ?? null;
}
