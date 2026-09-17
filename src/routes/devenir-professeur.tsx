import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, BadgeCheck, Gift, Infinity as InfinityIcon, Sparkles, Star } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site";
import { LAUNCH_OFFER_MONTHS, LAUNCH_OFFER_SEATS } from "@/lib/launch-offer";

export const Route = createFileRoute("/devenir-professeur")({
  head: () => ({
    meta: [
      { title: "Devenir professeur — 3 mois de PRO offerts | ProFinder" },
      {
        name: "description",
        content:
          "Rejoignez ProFinder : les 300 premiers professeurs vérifiés bénéficient de 3 mois de PRO gratuits, sans carte bancaire ni engagement.",
      },
      { property: "og:title", content: "Devenir professeur sur ProFinder" },
      {
        property: "og:description",
        content:
          "3 mois de PRO offerts aux 300 premiers professeurs vérifiés. Créez votre profil gratuitement.",
      },
      { property: "og:image", content: "https://profinder.ma/og-default.jpg" },
      { property: "og:image:alt", content: "ProFinder — cours particuliers au Maroc" },
      { name: "twitter:image", content: "https://profinder.ma/og-default.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:locale", content: "fr_MA" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://profinder.ma/devenir-professeur" },
    ],
    links: [{ rel: "canonical", href: "https://profinder.ma/devenir-professeur" }],
  }),
  component: BecomeTeacherPage,
});

const PRO_BENEFITS = [
  { Icon: InfinityIcon, label: "Mises en relation illimitées" },
  { Icon: Sparkles, label: "Profil mis en avant" },
  { Icon: Star, label: "Meilleure visibilité dans les résultats" },
  { Icon: BarChart3, label: "Statistiques de votre activité" },
  { Icon: BadgeCheck, label: "Badge PRO sur votre profil" },
];

function Cta({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/auth"
      search={{ mode: "signup", role: "pro" }}
      className={`inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90 ${className}`}
    >
      Créer mon profil gratuitement
    </Link>
  );
}

function BecomeTeacherPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <SiteHeader variant="public" />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <section className="rounded-3xl border-2 border-primary/40 bg-card p-8 text-center shadow-panel">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <Gift className="size-4" aria-hidden /> Offre de lancement
          </p>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Les {LAUNCH_OFFER_SEATS} premiers professeurs vérifiés bénéficient de{" "}
            {LAUNCH_OFFER_MONTHS} mois de PRO gratuitement.
          </h1>
          <ul className="mx-auto mt-6 grid max-w-xl gap-2 text-left text-sm text-muted-foreground sm:grid-cols-2">
            <li>✓ {LAUNCH_OFFER_MONTHS} mois de PRO gratuits</li>
            <li>✓ Aucune carte bancaire requise</li>
            <li>✓ Aucune obligation de paiement pendant la période gratuite</li>
            <li>✓ Offre limitée aux {LAUNCH_OFFER_SEATS} premiers professeurs vérifiés</li>
          </ul>
          <Cta className="mt-8" />
          <p className="mt-3 text-xs text-muted-foreground">
            Inscription en quelques minutes, puis vérification de votre pièce d'identité.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight">Ce que vous obtenez avec PRO</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRO_BENEFITS.map(({ Icon, label }) => (
              <div
                key={label}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5"
              >
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <span className="text-sm font-semibold">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight">Et après les 3 mois gratuits ?</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Aucun prélèvement automatique : à la fin de la période offerte, votre compte revient
            simplement au plan Gratuit. Vous conservez votre profil, vos avis et vos échanges, et
            vous choisissez librement de passer à PRO.
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-lg font-bold">🆓 FREE</h3>
              <p className="my-4 text-3xl font-extrabold">
                0 DH<span className="text-sm font-normal text-muted-foreground">/mois</span>
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 5 mises en relation par mois</li>
                <li>• Profil visible dans les résultats</li>
                <li>• Avis élèves</li>
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-primary bg-card p-6">
              <h3 className="text-lg font-bold text-primary">⭐ PRO</h3>
              <p className="my-4 text-3xl font-extrabold">
                99 DH<span className="text-sm font-normal text-muted-foreground">/mois</span>
                <span className="ml-2 text-sm font-semibold text-muted-foreground">
                  ou 990 DH/an
                </span>
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {PRO_BENEFITS.map(({ label }) => (
                  <li key={label}>• {label}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 text-center">
            <Cta />
          </div>
        </section>
      </main>
      <SiteFooter variant="public" />
    </div>
  );
}
