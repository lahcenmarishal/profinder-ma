import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Point d'entrée utilisé quand le site est servi par un hébergeur externe
 * (Netlify) qui ne reçoit pas la clé privée du backend. Il exécute les mêmes
 * opérations que les fonctions serveur : création de compte, renvoi du lien de
 * vérification et réinitialisation du mot de passe, avec les emails ProFinder.
 */

const roleSchema = z.enum(["client", "pro"]);
const originSchema = z.string().url().max(200);

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("signup"),
    payload: z.object({
      email: z.string().email().max(200),
      password: z.string().min(8).max(200),
      role: roleSchema,
      firstName: z.string().max(80).default(""),
      lastName: z.string().max(80).default(""),
      phone: z.string().max(40).default(""),
      origin: originSchema,
    }),
  }),
  z.object({
    action: z.literal("resend"),
    payload: z.object({ email: z.string().email().max(200), role: roleSchema, origin: originSchema }),
  }),
  z.object({
    action: z.literal("recovery"),
    payload: z.object({ email: z.string().email().max(200), origin: originSchema }),
  }),
  z.object({
    action: z.literal("welcome"),
    payload: z.object({
      userId: z.string().uuid().optional(),
      accessToken: z.string().min(10).max(4000).optional(),
      role: roleSchema,
    }),
  }),
  z.object({
    action: z.literal("notify_request"),
    payload: z.object({ requestId: z.string().uuid() }),
  }),
  z.object({
    action: z.literal("notify_proposal"),
    payload: z.object({ requestId: z.string().uuid(), professionalId: z.string().uuid() }),
  }),
  z.object({
    action: z.literal("notify_pro_matches"),
    payload: z.object({ professionalId: z.string().uuid() }),
  }),
]);

const ALLOWED_ORIGINS = new Set([
  "https://profinder.ma",
  "https://www.profinder.ma",
  "https://project--f1f80ff5-5ea2-48c9-978f-5007e1f1069c.lovable.app",
  "https://project--f1f80ff5-5ea2-48c9-978f-5007e1f1069c-dev.lovable.app",
  "https://id-preview--f1f80ff5-5ea2-48c9-978f-5007e1f1069c.lovable.app",
]);

function requestOrigin(request: Request): string | null {
  const origin = request.headers.get("Origin");
  return origin && ALLOWED_ORIGINS.has(origin) ? origin : null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

export const Route = createFileRoute("/api/public/auth-email")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const origin = requestOrigin(request);
        if (!origin) return new Response(null, { status: 403, headers: corsHeaders(null) });
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      },
      POST: async ({ request }) => {
        const suppliedOrigin = request.headers.get("Origin");
        const origin = requestOrigin(request);
        if (suppliedOrigin && !origin) return json({ ok: false, reason: "origin_not_allowed" }, 403);

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ ok: false, reason: "invalid_request" }, 400, origin);

        if (!process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
          console.error("[email] clé privée absente sur le déploiement relais");
          return json({ ok: false, reason: "link_failed" }, 500, origin);
        }

        const { performRecovery, performResend, performSignup, performWelcome } = await import(
          "@/lib/email/auth-email.server"
        );
        const { performNotifyNewRequest, performNotifyProMatches, performNotifyProposal } =
          await import("@/lib/notify.server");
        const body = parsed.data;
        if (body.action === "signup") return json(await performSignup(body.payload), 200, origin);
        if (body.action === "resend") return json(await performResend(body.payload), 200, origin);
        if (body.action === "recovery") return json(await performRecovery(body.payload), 200, origin);
        if (body.action === "welcome") return json(await performWelcome(body.payload), 200, origin);
        if (body.action === "notify_request")
          return json(await performNotifyNewRequest(body.payload.requestId), 200, origin);
        if (body.action === "notify_pro_matches")
          return json(await performNotifyProMatches(body.payload.professionalId), 200, origin);
        return json(await performNotifyProposal(body.payload), 200, origin);
      },
    },
  },
});
