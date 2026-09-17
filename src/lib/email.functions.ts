import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Emails de compte envoyés par ProFinder via Resend :
 * vérification d'adresse, bienvenue et réinitialisation de mot de passe.
 * Les liens sont générés côté serveur par l'API d'administration, ce qui
 * évite tout email envoyé par le service d'authentification par défaut.
 */

const roleSchema = z.enum(["client", "pro"]);
const originSchema = z.string().url().max(200);

/** Crée le compte élève/professeur et envoie l'email de vérification ProFinder. */
export const signUpWithEmail = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().email().max(200),
        password: z.string().min(8).max(200),
        role: roleSchema,
        firstName: z.string().max(80).default(""),
        lastName: z.string().max(80).default(""),
        phone: z.string().max(40).default(""),
        origin: originSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { hasServiceRoleKey, performSignup, relayAuthEmail } = await import(
      "@/lib/email/auth-email.server"
    );
    // Hébergeur sans clé privée (Netlify) : on relaie vers le déploiement Lovable
    // qui détient les clés, pour que l'email ProFinder parte quand même.
    if (!hasServiceRoleKey()) {
      return relayAuthEmail("signup", data, { ok: false as const, reason: "link_failed" as const });
    }
    return performSignup(data);
  });

/** Renvoie un lien de confirmation à une adresse déjà inscrite mais non vérifiée. */
export const resendVerificationEmail = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ email: z.string().email().max(200), role: roleSchema, origin: originSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    const { hasServiceRoleKey, performResend, relayAuthEmail } = await import(
      "@/lib/email/auth-email.server"
    );
    if (!hasServiceRoleKey()) return relayAuthEmail("resend", data, { ok: true as const });
    return performResend(data);
  });

/** Envoie le lien de réinitialisation de mot de passe. */
export const sendPasswordResetEmail = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ email: z.string().email().max(200), origin: originSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    const { hasServiceRoleKey, performRecovery, relayAuthEmail } = await import(
      "@/lib/email/auth-email.server"
    );
    if (!hasServiceRoleKey()) return relayAuthEmail("recovery", data, { ok: true as const });
    return performRecovery(data);
  });

/** Envoie l'email de bienvenue une seule fois, après confirmation du compte. */
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ role: roleSchema }).parse(data))
  .handler(async ({ data, context }) => {
    const { hasServiceRoleKey, performWelcome, relayAuthEmail } = await import(
      "@/lib/email/auth-email.server"
    );
    const payload = { userId: context.userId, role: data.role };
    if (!hasServiceRoleKey()) {
      return relayAuthEmail("welcome", payload, { sent: false });
    }
    return performWelcome(payload);
  });
