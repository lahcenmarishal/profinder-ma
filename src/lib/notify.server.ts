/**
 * Logique des notifications (in-app + email ProFinder).
 *
 * Comme pour les emails de compte, ce module s'exécute là où la clé privée du
 * backend est disponible : soit directement, soit via la route publique
 * `/api/public/auth-email` lorsque le site est servi par un autre hébergeur.
 */

export async function performNotifyNewRequest(requestId: string): Promise<{ notified: number }> {
  const { relay } = await import("@/lib/email/relay.server");
  const relayed = await relay<{ notified: number }>("notify_request", { requestId });
  if (relayed) return relayed;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const link = `/pro/demandes?r=${requestId}`;
  // Les professeurs déjà prévenus pour cette demande sont ignorés : un nouveau
  // professeur correspondant peut ainsi être notifié plus tard sans doublon.
  const { data: existing } = await supabaseAdmin
    .from("notifications")
    .select("user_id")
    .eq("link", link);
  const alreadyNotified = new Set((existing ?? []).map((n) => n.user_id));

  const { data: request } = await supabaseAdmin
    .from("requests")
    .select("id, service_id, service_ids, city_id, mode, target_professional_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!request) return { notified: 0 };

  let proIds: string[] = [];
  if (request.target_professional_id) {
    proIds = [request.target_professional_id];
  } else {
    const { data: pros } = await supabaseAdmin
      .from("professionals")
      .select("id, user_id, city_id, professional_services(service_id)")
      .eq("status", "active");
    proIds = (pros ?? [])
      .filter((p) => {
        if (!p.user_id) return false;
        const services = (p.professional_services ?? []).map((s) => s.service_id);
        const wanted =
          request.service_ids && request.service_ids.length > 0
            ? request.service_ids
            : request.service_id
              ? [request.service_id]
              : [];
        if (wanted.length > 0 && services.length > 0 && !wanted.some((id) => services.includes(id)))
          return false;
        if (request.mode !== "online" && request.city_id && p.city_id !== request.city_id)
          return false;
        return true;
      })
      .map((p) => p.id);
  }
  if (proIds.length === 0) return { notified: 0 };

  const { data: targets } = await supabaseAdmin
    .from("professionals")
    .select("id, user_id")
    .in("id", proIds);

  const rows = (targets ?? [])
    .filter((t) => Boolean(t.user_id) && !alreadyNotified.has(t.user_id as string))
    .map((t) => ({
      user_id: t.user_id as string,
      type: request.target_professional_id ? "request_targeted" : "request_match",
      title: request.target_professional_id
        ? "Nouvelle demande directe"
        : "Nouvelle demande pour vous",
      body: request.target_professional_id
        ? "Un élève vous a envoyé une demande directe."
        : "Un élève recherche un professeur correspondant à votre profil.",
      link,
    }));
  if (rows.length === 0) return { notified: 0 };

  await supabaseAdmin.from("notifications").insert(rows);

  const { sendEmail, siteUrl, userEmail } = await import("@/lib/email/resend.server");
  const { newRequestEmail } = await import("@/lib/email/templates.server");
  const mail = newRequestEmail({
    siteUrl: siteUrl(),
    link,
    targeted: Boolean(request.target_professional_id),
  });
  await Promise.all(
    rows.map(async (row) => {
      const to = await userEmail(row.user_id);
      if (!to) return;
      await sendEmail({
        to,
        subject: mail.subject,
        html: mail.html,
        dedupe: { template: "new_request", ref: `${requestId}:${row.user_id}` },
      });
    }),
  );

  return { notified: rows.length };
}

export async function performNotifyProposal(data: {
  requestId: string;
  professionalId: string;
}): Promise<{ notified: number }> {
  const { relay } = await import("@/lib/email/relay.server");
  const relayed = await relay<{ notified: number }>("notify_proposal", data);
  if (relayed) return relayed;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: request }, { data: pro }] = await Promise.all([
    supabaseAdmin.from("requests").select("id, client_id").eq("id", data.requestId).maybeSingle(),
    supabaseAdmin
      .from("professionals")
      .select("display_name")
      .eq("id", data.professionalId)
      .maybeSingle(),
  ]);
  if (!request?.client_id) return { notified: 0 };

  const link = `/demandes/${request.id}`;
  await supabaseAdmin.from("notifications").insert({
    user_id: request.client_id,
    type: "proposal_received",
    title: "Proposition reçue",
    body: `${pro?.display_name ?? "Un professeur"} est intéressé par votre demande.`,
    link,
  });

  const { sendEmail, siteUrl, userEmail } = await import("@/lib/email/resend.server");
  const { proposalEmail } = await import("@/lib/email/templates.server");
  const to = await userEmail(request.client_id);
  if (to) {
    const mail = proposalEmail({
      siteUrl: siteUrl(),
      link,
      proName: pro?.display_name ?? "Un professeur",
    });
    await sendEmail({
      to,
      subject: mail.subject,
      html: mail.html,
      dedupe: { template: "proposal", ref: `${data.requestId}:${data.professionalId}` },
    });
  }

  return { notified: 1 };
}
