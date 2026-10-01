/**
 * Relance des professeurs inscrits depuis plus de 24 h dont le profil
 * n'est pas finalisé. Un seul email par professeur (verrou email_log).
 */
export async function performOnboardingReminders(): Promise<{ checked: number; sent: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendEmail, siteUrl, userEmail } = await import("@/lib/email/resend.server");
  const { onboardingReminderEmail } = await import("@/lib/email/templates.server");

  const cutoff = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: pros, error } = await supabaseAdmin
    .from("professionals")
    .select("id, user_id, email, first_name, display_name")
    .eq("is_demo", false)
    .eq("onboarding_completed", false)
    .not("user_id", "is", null)
    .lte("created_at", cutoff)
    .limit(200);
  if (error) throw new Error(error.message);

  let sent = 0;
  for (const p of pros ?? []) {
    const to = p.email || (p.user_id ? await userEmail(p.user_id) : null);
    if (!to) continue;
    const mail = onboardingReminderEmail({
      siteUrl: siteUrl(),
      name: p.first_name || p.display_name || null,
    });
    const r = await sendEmail({
      to,
      subject: mail.subject,
      html: mail.html,
      dedupe: { template: "onboarding_reminder", ref: p.id },
    });
    if (r.sent) sent++;
  }
  return { checked: pros?.length ?? 0, sent };
}
