import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — ProFinder" },
      {
        name: "description",
        content:
          "Comment ProFinder collecte, utilise et protège vos données personnelles : finalités, durées de conservation, partage et vos droits (loi 09-08).",
      },
      { property: "og:title", content: "Politique de confidentialité — ProFinder" },
      {
        property: "og:description",
        content: "Traitement et protection de vos données personnelles sur ProFinder.",
      },
      { property: "og:image", content: "https://profinder.ma/og-default.jpg" },
      { property: "og:image:alt", content: "ProFinder — cours particuliers au Maroc" },
      { name: "twitter:image", content: "https://profinder.ma/og-default.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:locale", content: "fr_MA" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://profinder.ma/confidentialite" },
    ],
    links: [{ rel: "canonical", href: "https://profinder.ma/confidentialite" }],
  }),
  component: ConfidentialitePage,
});

function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="text-3xl font-extrabold tracking-tight">Politique de confidentialité</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dernière mise à jour : septembre 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">1. Qui traite vos données</h2>
            <p>
              ProFinder est une plateforme de mise en relation entre élèves ou parents et
              professeurs indépendants au Maroc. Nous sommes responsables du traitement des données
              personnelles collectées via le site et l'application.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">2. Données collectées</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Données de compte : nom, adresse e-mail, mot de passe (chiffré), numéro de
                téléphone, rôle (élève/parent ou professeur).
              </li>
              <li>
                Données de profil professeur : photo, description, matières, niveaux, tarifs,
                disponibilités, ville et zone d'intervention, pièces de vérification.
              </li>
              <li>
                Données d'usage du service : demandes de cours publiées, propositions, messages
                échangés, avis déposés.
              </li>
              <li>
                Données techniques : adresse IP, type d'appareil et de navigateur, journaux de
                connexion, cookies nécessaires au fonctionnement et à la sécurité.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">3. Finalités et bases légales</h2>
            <p>Nous utilisons vos données pour :</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>créer et gérer votre compte et votre profil (exécution du service) ;</li>
              <li>
                mettre en relation les familles et les professeurs, afficher les profils publics et
                acheminer les demandes pertinentes ;
              </li>
              <li>permettre la messagerie, les propositions et les avis ;</li>
              <li>gérer les abonnements, la facturation et le support ;</li>
              <li>
                prévenir la fraude, les abus et sécuriser la plateforme (intérêt légitime) ;
              </li>
              <li>
                vous envoyer des notifications de service et, avec votre accord, des informations
                commerciales.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">4. Informations publiques</h2>
            <p>
              Le profil d'un professeur (nom affiché, photo, matières, niveaux, tarifs, ville, note
              et avis) est visible publiquement. Les coordonnées directes ne sont partagées qu'après
              une mise en relation. Les demandes des élèves ne sont visibles que des professeurs
              concernés.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">5. Partage des données</h2>
            <p>
              Nous ne vendons pas vos données. Elles peuvent être communiquées à nos prestataires
              techniques (hébergement, envoi d'e-mails, paiement) qui agissent selon nos
              instructions, ainsi qu'aux autorités compétentes lorsque la loi l'exige.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">6. Durée de conservation</h2>
            <p>
              Les données de compte sont conservées tant que le compte est actif, puis supprimées ou
              anonymisées dans un délai raisonnable après sa fermeture, sauf obligation légale
              (comptabilité, litiges) imposant une conservation plus longue.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">7. Sécurité</h2>
            <p>
              Les accès aux données sont restreints, les mots de passe sont stockés chiffrés et les
              échanges sont protégés par HTTPS. Aucun système n'étant infaillible, nous vous
              invitons à utiliser un mot de passe fort et unique.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">8. Vos droits</h2>
            <p>
              Conformément à la loi marocaine 09-08 relative à la protection des personnes physiques
              à l'égard du traitement des données à caractère personnel, vous disposez d'un droit
              d'accès, de rectification, d'opposition et de suppression de vos données. Vous pouvez
              exercer ces droits depuis votre compte ou en nous contactant.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">9. Cookies</h2>
            <p>
              Nous utilisons des cookies strictement nécessaires (session, sécurité, préférences de
              langue) et, le cas échéant, des cookies de mesure d'audience. Vous pouvez les
              paramétrer depuis votre navigateur.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">10. Modifications</h2>
            <p>
              Cette politique peut évoluer. En cas de changement important, nous vous en informerons
              via le site ou par e-mail.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
