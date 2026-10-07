import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Flag, ShieldCheck, Users, Menu, X, ChevronRight, SlidersHorizontal, FileText, FlaskConical, CreditCard } from "lucide-react";
import { MobileTabBar, SiteFooter, SiteHeader } from "@/components/site";

import { VerifiedBadge } from "@/components/verified-badge";
import { AdminVerifications } from "@/components/admin-verifications";
import { AdminDemoCreate } from "@/components/admin-demo-create";
import { AdminBlog } from "@/components/admin-blog";
import { LaunchOfferAdminCounter } from "@/components/launch-offer";
import { supabase } from "@/integrations/supabase/client";
import { ensureSession, isAdminUser } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";



export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const session = await ensureSession();
    if (!session?.user || !(await isAdminUser(session.user.id))) throw redirect({ to: "/" });
    return { adminUserId: session.user.id };
  },
  head: () => ({
    meta: [
      { title: "Administration — ProFinder" },
      {
        name: "description",
        content:
          "Modération des profils, suivi des demandes, messages signalés et réglages de la plateforme.",
      },
      { property: "og:title", content: "Administration — ProFinder" },
      {
        property: "og:description",
        content: "Console d'administration ProFinder : modération, statistiques et paramètres.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

type AdminPanel = "overview" | "pros" | "pending" | "requests" | "verifications" | "demo" | "blog" | "pricing" | "alerts" | "settings";

const panels: { id: AdminPanel; label: string; Icon: typeof Users }[] = [
  { id: "overview", label: "Vue d'ensemble", Icon: ClipboardList },
  { id: "pros", label: "Professeurs", Icon: Users },
  { id: "pending", label: "En attente", Icon: ShieldCheck },
  { id: "requests", label: "Demandes", Icon: ClipboardList },
  { id: "verifications", label: "Vérifications", Icon: ShieldCheck },
  { id: "demo", label: "Données démo", Icon: FlaskConical },
  { id: "blog", label: "Blog", Icon: FileText },
  { id: "pricing", label: "Tarifs et offre", Icon: CreditCard },
  { id: "alerts", label: "Signalements", Icon: Flag },
  { id: "settings", label: "Paramètres", Icon: SlidersHorizontal },
];

function Admin() {
  const { adminUserId } = Route.useRouteContext();
  const qc = useQueryClient();
  const [panel, setPanel] = useState<AdminPanel>("overview");
  const [menuOpen, setMenuOpen] = useState(false);


  const pros = useQuery({
    queryKey: ["admin-pros"],
    enabled: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("*, professional_services(service_id), professional_availability(weekday,start_min,end_min)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const requests = useQuery({
    queryKey: ["admin-requests"],
    enabled: true,
    queryFn: async () => {
      const { data } = await supabase
        .from("requests")
        .select(
          "id, status, description, area, budget_min, budget_max, created_at, cities(name), services(name)",
        )
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const flagged = useQuery({
    queryKey: ["admin-flagged"],
    enabled: true,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, body, created_at")
        .eq("flagged", true)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const settings = useQuery({
    queryKey: ["admin-settings"],
    enabled: true,
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*");
      return data ?? [];
    },
  });

  const catalog = useQuery({
    queryKey: ["admin-catalog"],
    enabled: true,
    queryFn: async () => {
      const { data } = await supabase.from("subscription_plans").select("*").order("sort");
      return { plans: data ?? [] };
    },
  });

  const savePlan = async (
    code: string,
    patch: { price_mad?: number; duration_days?: number; trial_days?: number; is_visible?: boolean },
  ) => {
    const { error } = await supabase.from("subscription_plans").update(patch).eq("code", code);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Tarif enregistré.");
    qc.invalidateQueries({ queryKey: ["admin-catalog"] });
  };


  const rateRange =
    ((settings.data ?? []).find((s) => s.key === "rate_range")?.value as
      | { min: number; max: number }
      | undefined) ?? { min: 40, max: 400 };

  const saveRateRange = async (patch: { min?: number; max?: number }) => {
    const next = { ...rateRange, ...patch };
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ key: "rate_range", value: next as never });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Fourchette de tarifs enregistrée.");
    qc.invalidateQueries({ queryKey: ["admin-settings"] });
    qc.invalidateQueries({ queryKey: ["reference"] });
  };

  const setStatus = async (id: string, status: "active" | "draft" | "suspended") => {
    const { error } = await supabase.from("professionals").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Statut mis à jour.");
    qc.invalidateQueries({ queryKey: ["admin-pros"] });
  };

  // « Vérifier » : approuve + vérifie + passe PRO en un seul clic.
  const verifyPro = async (id: string) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("professionals")
      .update({
        status: "active",
        verification_status: "verified",
        is_verified: true,
        verified_at: now,
        verified_by: adminUserId,
        plan_code: "pro",
        onboarding_completed: true,
        admin_message: null,
        rejection_reason: null,
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase
      .from("verification_requests")
      .update({ status: "verified", reviewed_at: now, reviewed_by: adminUserId })
      .eq("professional_id", id)
      .in("status", ["pending", "needs_information"]);
    await supabase.from("verification_logs").insert({
      professional_id: id,
      admin_id: adminUserId,
      action: "approve",
      new_status: "verified",
    });
    toast.success("Professeur vérifié et passé PRO.");
    qc.invalidateQueries({ queryKey: ["admin-pros"] });
  };

  // Suppression définitive : fonctionne pour une fiche de démonstration
  // comme pour un vrai compte, avec toutes ses données liées.
  const deletePro = async (id: string, name: string) => {
    if (!window.confirm(`Supprimer définitivement la fiche de ${name} ?`)) return;
    const { error } = await supabase.from("professionals").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Fiche supprimée.");
    qc.invalidateQueries({ queryKey: ["admin-pros"] });
    qc.invalidateQueries({ queryKey: ["admin-verifications"] });
  };

  const deleteRequest = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cette demande ?")) return;
    const { error } = await supabase.from("requests").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Demande supprimée.");
    qc.invalidateQueries({ queryKey: ["admin-requests"] });
  };

  const saveWeight = async (key: string, raw: string) => {
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      toast.error("Valeur invalide (JSON attendu).");
      return;
    }
    const { error } = await supabase
      .from("platform_settings")
      .update({ value: value as never })
      .eq("key", key);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Paramètre enregistré.");
    qc.invalidateQueries({ queryKey: ["admin-settings"] });
  };


  // La validation admin est la seule source de vérité pour classer un profil.
  // Ainsi, un professeur vérifié quitte immédiatement « En attente », même si
  // son inscription n'était pas terminée au moment de la validation.
  const registered = (pros.data ?? []).filter(
    (p) => p.onboarding_completed || p.verification_status === "verified" || p.is_verified,
  );
  const pending = (pros.data ?? []).filter(
    (p) => !p.onboarding_completed && p.verification_status !== "verified" && !p.is_verified,
  );

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <SiteHeader variant="admin" />
      <main className="mx-auto max-w-5xl px-4 py-8 pb-24">
        <div className="flex items-center gap-4 border-b border-border pb-5">
          <Button variant="outline" size="icon" aria-label="Ouvrir les rubriques de la console" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            <Menu />
          </Button>
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Console d'administration</p>
            <h1 className="text-2xl font-bold">{panels.find((item) => item.id === panel)?.label}</h1>
          </div>
        </div>
        {menuOpen && <div className="fixed inset-0 z-[70] bg-foreground/40" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
        <aside className={`fixed inset-y-0 left-0 z-[80] w-[min(20rem,85vw)] overflow-y-auto border-r border-border bg-background p-5 shadow-xl transition-transform ${menuOpen ? "translate-x-0" : "-translate-x-full"}`} aria-label="Rubriques de la console" aria-hidden={!menuOpen}>
          <div className="mb-7 flex items-center justify-between">
            <strong className="text-lg">Console</strong>
            <Button variant="ghost" size="icon" aria-label="Fermer les rubriques" onClick={() => setMenuOpen(false)}><X /></Button>
          </div>
          <nav className="space-y-1">
            {panels.map(({ id, label, Icon }) => (
              <Button key={id} variant={panel === id ? "secondary" : "ghost"} className="w-full justify-start" tabIndex={menuOpen ? 0 : -1} onClick={() => { setPanel(id); setMenuOpen(false); window.scrollTo(0, 0); }}>
                <Icon />{label}
              </Button>
            ))}
          </nav>
        </aside>

        {panel === "overview" && <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {[
            { id: "pros" as const, label: "Professeurs", value: registered.length, Icon: Users },
            { id: "pending" as const, label: "En attente", value: pending.length, Icon: ShieldCheck },
            { id: "requests" as const, label: "Demandes", value: requests.data?.length ?? 0, Icon: ClipboardList },
            { id: "alerts" as const, label: "Messages signalés", value: flagged.data?.length ?? 0, Icon: Flag },
          ].map(({ id, label, value, Icon }) => (
            <Button key={id} variant="outline" className="h-auto justify-between rounded-md p-5 text-left" onClick={() => setPanel(id)}>
              <span className="flex items-center gap-3"><Icon />{label}</span><span className="flex items-center gap-2 text-xl font-bold tabular-nums">{value}<ChevronRight className="size-4 text-muted-foreground" /></span>
            </Button>
          ))}
        </div>}

        {panel === "demo" && <AdminDemoCreate />}
        {panel === "pros" &&
        <section className="mt-10">
          <h2 className="text-xl font-bold">Professeurs inscrits</h2>
          <div className="mt-4 space-y-3">
            {registered.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-2">
                  <p className="flex items-center gap-2 font-semibold">
                    {p.display_name}
                    <VerifiedBadge verified={p.is_verified} compact />
                    {p.is_demo && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary-foreground">
                        Démo
                      </span>
                    )}
                  </p>
                  <Link
                    to="/professeurs/$id"
                    params={{ id: p.id }}
                    className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Voir le profil
                  </Link>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => verifyPro(p.id)}
                    size="sm"
                  >
                    Vérifier
                  </Button>
                  <Button
                    onClick={() => setStatus(p.id, "suspended")}
                    size="sm" variant="secondary"
                  >
                    Suspendre
                  </Button>
                  <Button
                    onClick={() => deletePro(p.id, p.display_name)}
                    size="sm" variant="destructive"
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
            {registered.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun professeur inscrit pour le moment.</p>
            )}
          </div>
        </section>
        }

        {panel === "pending" &&
        <section className="mt-10">
          <h2 className="text-xl font-bold">Professeurs en attente</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Consultez la fiche, puis cliquez sur « Vérifier » si le profil mérite d'être affiché sur le site, même s'il n'est pas encore complet.
          </p>
          <div className="mt-4 space-y-3">
            {pending.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-2">
                  <p className="flex items-center gap-2 font-semibold">
                    {p.display_name}
                    <VerifiedBadge verified={p.is_verified} compact />
                    {p.is_demo && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary-foreground">
                        Démo
                      </span>
                    )}
                  </p>
                  <Link
                    to="/professeurs/$id"
                    params={{ id: p.id }}
                    className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Voir le profil
                  </Link>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => verifyPro(p.id)} size="sm">
                    Vérifier
                  </Button>
                  <Button
                    onClick={() => deletePro(p.id, p.display_name)}
                    size="sm" variant="destructive"
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
            {pending.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun professeur en attente.</p>
            )}
          </div>
        </section>
        }

        {panel === "requests" &&
        <section className="mt-10">
          <h2 className="text-xl font-bold">Demandes des élèves</h2>
          <div className="mt-4 space-y-3">
            {(requests.data ?? []).map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="max-w-xl">
                  <p className="flex items-center gap-2 font-semibold">
                    {r.services?.name ?? "Matière non précisée"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.cities?.name ?? "Ville non précisée"}
                    {r.area ? ` · ${r.area}` : ""} · statut {r.status}
                    {r.budget_min && r.budget_max
                      ? ` · ${Number(r.budget_min)}–${Number(r.budget_max)} DH/h`
                      : ""}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                </div>
                <Button
                  onClick={() => deleteRequest(r.id)}
                  size="sm" variant="destructive"
                >
                  Supprimer
                </Button>
              </div>
            ))}
            {(requests.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune demande pour le moment.</p>
            )}
          </div>
        </section>
        }

        {panel === "pricing" && <LaunchOfferAdminCounter />}

        {panel === "blog" && <AdminBlog />}

        {panel === "verifications" && <AdminVerifications adminId={adminUserId} />}




        {panel === "pricing" && <section className="mt-10">

          <h2 className="text-xl font-bold">Tarifs</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Tarif horaire minimum (DH)
              <input
                type="number"
                min={0}
                defaultValue={rateRange.min}
                onBlur={(e) => saveRateRange({ min: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-border bg-muted px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Tarif horaire maximum (DH)
              <input
                type="number"
                min={0}
                defaultValue={rateRange.max}
                onBlur={(e) => saveRateRange({ max: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-border bg-muted px-3 py-2"
              />
            </label>
          </div>

          <h3 className="mt-6 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Formules d'abonnement
          </h3>
          <div className="mt-3 space-y-3">
            {(catalog.data?.plans ?? []).map((p) => (
              <div
                key={p.code}
                className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4"
              >
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.code}</p>
                </div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Prix (DH)
                  <input
                    type="number"
                    min={0}
                    defaultValue={Number(p.price_mad)}
                    onBlur={(e) => savePlan(p.code, { price_mad: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-border bg-muted px-3 py-1.5 text-sm text-foreground"
                  />
                </label>
                <label className="text-xs font-semibold text-muted-foreground">
                  Durée (jours)
                  <input
                    type="number"
                    min={1}
                    defaultValue={p.duration_days}
                    onBlur={(e) => savePlan(p.code, { duration_days: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-border bg-muted px-3 py-1.5 text-sm text-foreground"
                  />
                </label>
                <label className="text-xs font-semibold text-muted-foreground">
                  Essai (jours)
                  <input
                    type="number"
                    min={0}
                    defaultValue={p.trial_days}
                    onBlur={(e) => savePlan(p.code, { trial_days: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-border bg-muted px-3 py-1.5 text-sm text-foreground"
                  />
                </label>
              </div>
            ))}
          </div>
        </section>}

        {panel === "alerts" && <section className="mt-10">
          <h2 className="text-xl font-bold">Messages signalés</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {(flagged.data ?? []).map((m) => (
              <li key={m.id} className="rounded-xl border border-border bg-card px-4 py-3">
                {m.body}
                <span className="ml-2 text-xs text-muted-foreground">
                  {new Date(m.created_at).toLocaleString("fr-MA")}
                </span>
              </li>
            ))}
            {(flagged.data ?? []).length === 0 && (
              <li className="text-muted-foreground">Aucun message signalé.</li>
            )}
          </ul>
        </section>}

        {panel === "settings" && <section className="mt-10">
          <h2 className="text-xl font-bold">Pondération du matching</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(settings.data ?? []).filter((s) => s.key !== "rate_range").map((s) => (
              <label key={s.key} className="text-sm font-medium">
                {s.key}
                <input
                  
                  defaultValue={JSON.stringify(s.value)}
                  onBlur={(e) => saveWeight(s.key, e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-muted px-3 py-2"
                />
              </label>
            ))}
          </div>
        </section>}
      </main>
      <MobileTabBar variant="admin" />
      <SiteFooter variant="admin" />
    </div>
  );
}
