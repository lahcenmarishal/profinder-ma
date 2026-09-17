/**
 * Logique d'envoi des emails de compte (vérification, renvoi, réinitialisation,
 * bienvenue). Exécutée sur le déploiement courant, qui dispose des clés privées.
 */

export type SignupInput = {
  email: string;
  password: string;
  role: "client" | "pro";
  firstName: string;
  lastName: string;
  phone: string;
  origin: string;
};

export type SignupResult =
  | { ok: true }
  | { ok: false; reason: "already_registered" | "weak_password" | "link_failed" | "send_failed"; message?: string };

function verifyRedirect(origin: string, role: "client" | "pro"): string {
  return `${origin.replace(/\/$/, "")}/verify-email?role=${role}`;
}

export { hasServiceRoleKey } from "@/lib/email/relay.server";

export async function performSignup(data: SignupInput): Promise<SignupResult> {
  const { relay } = await import("@/lib/email/relay.server");
  const relayed = await relay<SignupResult>("signup", data);
  if (relayed) return relayed;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendEmail, siteUrl } = await import("@/lib/email/resend.server");
  const { verificationEmail } = await import("@/lib/email/templates.server");

  const fullName = `${data.firstName} ${data.lastName}`.trim();
  const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "signup",
    email: data.email,
    password: data.password,
    options: {
      redirectTo: verifyRedirect(data.origin, data.role),
      data: {
        full_name: fullName,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        role: data.role,
      },
    },
  });

  if (error || !link?.properties?.action_link) {
    const message = error?.message ?? "Inscription impossible.";
    if (/already|registered|exists/i.test(message)) return { ok: false, reason: "already_registered" };
    if (/password/i.test(message)) return { ok: false, reason: "weak_password", message };
    console.error("[email] génération du lien d'inscription impossible:", message);
    return { ok: false, reason: "link_failed", message };
  }

  const mail = verificationEmail({
    url: link.properties.action_link,
    siteUrl: siteUrl(),
    isPro: data.role === "pro",
  });
  const result = await sendEmail({ to: data.email, subject: mail.subject, html: mail.html });
  if (!result.sent) return { ok: false, reason: "send_failed" };
  return { ok: true };
}

export async function performResend(data: {
  email: string;
  role: "client" | "pro";
  origin: string;
}): Promise<{ ok: true }> {
  const { relay } = await import("@/lib/email/relay.server");
  const relayed = await relay<{ ok: true }>("resend", data);
  if (relayed) return relayed;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendEmail, siteUrl } = await import("@/lib/email/resend.server");
  const { verificationEmail } = await import("@/lib/email/templates.server");

  const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: data.email,
    options: { redirectTo: verifyRedirect(data.origin, data.role) },
  });
  if (error || !link?.properties?.action_link) {
    // On ne révèle pas si l'adresse existe : réponse volontairement neutre.
    console.error("[email] renvoi du lien impossible:", error?.message);
    return { ok: true };
  }
  const mail = verificationEmail({
    url: link.properties.action_link,
    siteUrl: siteUrl(),
    isPro: data.role === "pro",
  });
  await sendEmail({ to: data.email, subject: mail.subject, html: mail.html });
  return { ok: true };
}

export async function performRecovery(data: { email: string; origin: string }): Promise<{ ok: true }> {
  const { relay } = await import("@/lib/email/relay.server");
  const relayed = await relay<{ ok: true }>("recovery", data);
  if (relayed) return relayed;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendEmail, siteUrl } = await import("@/lib/email/resend.server");
  const { recoveryEmail } = await import("@/lib/email/templates.server");

  const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email: data.email,
    options: { redirectTo: `${data.origin.replace(/\/$/, "")}/nouveau-mot-de-passe` },
  });
  // Réponse identique que l'adresse existe ou non (anti-énumération).
  if (error || !link?.properties?.action_link) return { ok: true };

  const mail = recoveryEmail({ url: link.properties.action_link, siteUrl: siteUrl() });
  await sendEmail({ to: data.email, subject: mail.subject, html: mail.html });
  return { ok: true };
}

/** Envoie l'email de bienvenue, une seule fois, après confirmation du compte. */
export async function performWelcome(data: {
  userId?: string | undefined;
  accessToken?: string | undefined;
  role: "client" | "pro";
}): Promise<{ sent: boolean }> {
  const { relay } = await import("@/lib/email/relay.server");
  const relayed = await relay<{ sent: boolean }>("welcome", data);
  if (relayed) return relayed;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendEmail, siteUrl } = await import("@/lib/email/resend.server");
  const { welcomeEmail } = await import("@/lib/email/templates.server");

  // Identité : jeton de session vérifié côté serveur, sinon identifiant fourni
  // par une fonction serveur déjà authentifiée.
  let user = null as Awaited<ReturnType<typeof supabaseAdmin.auth.admin.getUserById>>["data"]["user"];
  if (data.accessToken) {
    const { data: verified } = await supabaseAdmin.auth.getUser(data.accessToken);
    user = verified.user ?? null;
  } else if (data.userId) {
    const { data: account } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    user = account.user ?? null;
  }

  const email = user?.email;
  // L'email de bienvenue n'est envoyé qu'une fois l'adresse réellement confirmée.
  if (!user || !email || !user.email_confirmed_at) return { sent: false };

  const metadata = (user.user_metadata ?? {}) as { full_name?: string; first_name?: string };
  const mail = welcomeEmail({
    siteUrl: siteUrl(),
    isPro: data.role === "pro",
    name: metadata.first_name ?? metadata.full_name ?? null,
  });
  const result = await sendEmail({
    to: email,
    subject: mail.subject,
    html: mail.html,
    dedupe: { template: "welcome", ref: user.id },
  });
  return { sent: result.sent };
}

