import { createFileRoute } from "@tanstack/react-router";

/**
 * Tâche planifiée : relance par email les professeurs inscrits depuis
 * plus de 24 h qui n'ont pas finalisé leur profil.
 */
export const Route = createFileRoute("/api/public/cron/onboarding-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = /^Bearer (\S+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
        if (!token) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("cron_tokens" as never)
          .select("token")
          .eq("name", "onboarding_reminders")
          .maybeSingle();
        const expected = (data as { token?: string } | null)?.token;
        if (!expected || expected !== token) return new Response("Unauthorized", { status: 401 });
        const { performOnboardingReminders } = await import("@/lib/email/onboarding-reminder.server");
        return Response.json(await performOnboardingReminders());
      },
    },
  },
});
