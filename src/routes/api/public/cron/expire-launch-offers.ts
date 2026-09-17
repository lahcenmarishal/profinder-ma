import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * Tâche planifiée : repasse au plan Gratuit les professeurs dont
 * l'offre de lancement (3 mois de PRO) est arrivée à échéance.
 */
export const Route = createFileRoute("/api/public/cron/expire-launch-offers")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("expire_launch_offers");
        if (error) return new Response(error.message, { status: 500 });
        return Response.json({ downgraded: data ?? 0 });
      },
    },
  },
});
