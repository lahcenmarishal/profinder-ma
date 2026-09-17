import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Notifie les professeurs concernés qu'une nouvelle demande est disponible.
 * Volontairement accessible sans session : une demande peut être créée par un
 * visiteur non connecté (demande directe à un professeur). Une garde anti-doublon
 * évite toute création répétée pour la même demande.
 */
export const notifyNewRequest = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ requestId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { performNotifyNewRequest } = await import("@/lib/notify.server");
    return performNotifyNewRequest(data.requestId);
  });

/** Notifie l'élève qu'un professeur est intéressé par sa demande. */
export const notifyProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ requestId: z.string().uuid(), professionalId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { performNotifyProposal } = await import("@/lib/notify.server");
    return performNotifyProposal(data);
  });
