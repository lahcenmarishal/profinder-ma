import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site";

export const Route = createFileRoute("/conditions")({
  head: () => ({
    meta: [
      { title: "Conditions d'utilisation — ProFinder" },
      {
        name: "description",
        content:
          "Conditions générales d'utilisation de ProFinder : règles d'inscription, mises en relation entre familles et professeurs, abonnements et responsabilités.",
      },
      { property: "og:title", content: "Conditions d'utilisation — ProFinder" },
      {
        property: "og:description",
        content: "Les règles d'utilisation de la marketplace ProFinder.",
      },
      { property: "og:image", content: "https://profinder.ma/og-default.jpg" },
      { property: "og:image:alt", content: "ProFinder — cours particuliers au Maroc" },
      { name: "twitter:image", content: "https://profinder.ma/og-default.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:locale", content: "fr_MA" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://profinder.ma/conditions" },
    ],
    links: [{ rel: "canonical", href: "https://profinder.ma/conditions" }],
  }),
  component: ConditionsPage,
});

function ConditionsPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="text-3xl font-extrabold tracking-tight">Conditions d'utilisation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dernière mise à jour : septembre 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">1. Objet du service</h2>
            <p>
              ProFinder est une plateforme de mise en relation entre des élèves ou parents à la
              recherche de cours particuliers et des professeurs indépendants au Maroc. ProFinder
              n'est ni employeur ni prestataire de cours : les cours sont convenus et dispensés
              directement entre la famille et le professeur.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">2. Compte utilisateur</h2>
            <p>
              La création d'un compte nécessite des informations exactes et à jour. Vous êtes
              responsable de la confidentialité de votre mot de passe et de toute activité réalisée
              depuis votre compte. Un compte peut être suspendu en cas d'informations
              manifestement fausses, de comportement abusif ou de non-respect des présentes
              conditions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">3. Professeurs et vérification</h2>
            <p>
              Les professeurs peuvent utiliser la plateforme sans avoir envoyé de documents. Le
              badge « Professeur vérifié » n'est affiché qu'après validation, par l'administration,
              d'une pièce d'identité et/ou d'un diplôme. La vérification ne constitue pas une
              garantie de résultat pédagogique.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">4. Demandes et mises en relation</h2>
            <p>
              Les élèves et parents publient des demandes de cours ; les professeurs peuvent y
              répondre et obtenir les coordonnées de la famille. Le plan gratuit comprend un nombre
              limité de mises en relation par mois ; les plans Pro offrent des mises en relation
              illimitées.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">5. Abonnements et paiement</h2>
            <p>
              L'abonnement Pro est proposé à 99 DH par mois ou 990 DH par an. Les tarifs des cours
              sont fixés librement par chaque professeur et réglés directement entre la famille et
              le professeur.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">6. Contenus et comportement</h2>
            <p>
              Il est interdit de publier des contenus illégaux, trompeurs, diffamatoires ou
              contraires aux bonnes mœurs, de contourner la plateforme pour collecter des données
              personnelles, ou d'utiliser la messagerie à des fins de démarchage abusif.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">7. Responsabilité</h2>
            <p>
              ProFinder met en œuvre des moyens raisonnables pour assurer la disponibilité du
              service, sans garantie d'absence d'interruption. La responsabilité de la qualité des
              cours, de leur déroulement et de leur paiement incombe aux parties concernées.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">8. Modification des conditions</h2>
            <p>
              Ces conditions peuvent évoluer. La poursuite de l'utilisation du service après mise à
              jour vaut acceptation de la nouvelle version.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
