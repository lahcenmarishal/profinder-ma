import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, IdCard, PartyPopper, Sparkles } from "lucide-react";
import {
  LAUNCH_OFFER_SEATS,
  daysLeft,
  fetchLaunchGrant,
  fetchLaunchSeatsUsed,
  formatOfferDate,
  isGrantActive,
} from "@/lib/launch-offer";
import type { VerificationStatus } from "@/lib/teacher-onboarding";

/**
 * Carte « Offre de lancement » du tableau de bord professeur.
 * Trois états : offre active (compte à rebours), offre terminée (proposition PRO),
 * ou incitation à faire vérifier son profil pour décrocher une des 300 places.
 */
export function LaunchOfferCard({
  professionalId,
  verificationStatus,
}: {
  professionalId: string;
  verificationStatus: VerificationStatus;
}) {
  const grant = useQuery({
    queryKey: ["launch-grant", professionalId],
    queryFn: () => fetchLaunchGrant(professionalId),
  });
  const seats = useQuery({ queryKey: ["launch-seats"], queryFn: fetchLaunchSeatsUsed });

  const used = seats.data ?? 0;
  const remaining = Math.max(0, LAUNCH_OFFER_SEATS - used);
  const active = isGrantActive(grant.data);
  const finished = !!grant.data && !active;

  if (active && grant.data) {
    const left = daysLeft(grant.data.expires_at);
    return (
      <section className="mt-6 rounded-3xl border-2 border-primary bg-card p-6">
        <p className="flex items-center gap-2 text-lg font-extrabold text-primary">
          <Sparkles className="size-5" aria-hidden /> ⭐ PRO — Offre de lancement
        </p>
        <p className="mt-1 text-sm font-semibold">3 mois gratuits</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            <CalendarClock className="size-4" aria-hidden />
            {left} jour{left > 1 ? "s" : ""} restant{left > 1 ? "s" : ""}
          </span>
          <span className="text-sm text-muted-foreground">
            Fin de l'offre le <strong>{formatOfferDate(grant.data.expires_at)}</strong>
          </span>
        </div>
        <ul className="mt-4 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
          <li>✓ Mises en relation illimitées</li>
          <li>✓ Profil mis en avant</li>
          <li>✓ Meilleure visibilité dans les résultats</li>
          <li>✓ Statistiques détaillées</li>
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Aucune carte bancaire, aucun prélèvement. À la fin des 3 mois, votre compte revient
          automatiquement au plan Gratuit — votre profil est conservé.
        </p>
      </section>
    );
  }

  if (finished && grant.data) {
    return (
      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold">Votre offre de lancement est terminée</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Elle s'est achevée le {formatOfferDate(grant.data.expires_at)}. Votre compte est repassé
          au plan Gratuit, sans prélèvement. Votre profil et vos avis sont conservés.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/devenir-professeur"
            className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
          >
            Passer à PRO — 99 DH/mois
          </Link>
          <Link
            to="/devenir-professeur"
            className="rounded-xl border border-border px-5 py-2 text-sm font-bold"
          >
            Voir le PRO annuel
          </Link>
        </div>
      </section>
    );
  }

  if (remaining === 0) return null;

  const pending = verificationStatus === "pending";

  return (
    <section className="mt-6 rounded-3xl border-2 border-dashed border-primary/50 bg-card p-6">
      <p className="flex items-center gap-2 text-lg font-extrabold text-primary">
        <Sparkles className="size-5" aria-hidden /> 🎁 3 mois de ProFinder Pro gratuits
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Les {LAUNCH_OFFER_SEATS} premiers professeurs vérifiés profitent de 3 mois de PRO
        gratuitement.
      </p>
      <p className="mt-3 flex items-start gap-2 rounded-xl bg-muted px-4 py-3 text-sm">
        <IdCard className="mt-0.5 size-4 shrink-0" aria-hidden />
        {pending
          ? "✅ Document reçu. Vous pourrez bénéficier des 3 mois Pro gratuits dès que votre compte sera vérifié par l'administration."
          : "Fournissez un document d'identité pour faire vérifier votre compte et bénéficier de l'offre."}
      </p>
      {!pending && (
        <Link
          to="/pro/inscription"
          className="mt-4 inline-block rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
        >
          Fournir mon document
        </Link>
      )}
    </section>
  );
}

/** Compteur d'utilisation de l'offre pour la console d'administration. */
export function LaunchOfferAdminCounter() {
  const seats = useQuery({ queryKey: ["launch-seats"], queryFn: fetchLaunchSeatsUsed });
  const used = seats.data ?? 0;
  const pct = Math.min(100, Math.round((used / LAUNCH_OFFER_SEATS) * 100));
  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-xl font-bold">
        Offre lancement : {used} / {LAUNCH_OFFER_SEATS} professeurs utilisés
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        3 mois de PRO offerts automatiquement aux {LAUNCH_OFFER_SEATS} premiers professeurs
        vérifiés. Au-delà, plus aucune attribution automatique.
      </p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}

/**
 * Message de bienvenue affiché dès la création du compte professeur :
 * félicitations + rappel de téléverser la pièce d'identité pour bénéficier de l'offre.
 */
export function LaunchWelcomeBanner({
  professionalId,
  verificationStatus,
}: {
  professionalId: string;
  verificationStatus: VerificationStatus;
}) {
  const grant = useQuery({
    queryKey: ["launch-grant", professionalId],
    queryFn: () => fetchLaunchGrant(professionalId),
  });
  const seats = useQuery({ queryKey: ["launch-seats"], queryFn: fetchLaunchSeatsUsed });

  if (grant.data) return null;
  if (LAUNCH_OFFER_SEATS - (seats.data ?? 0) <= 0) return null;

  return (
    <section className="mt-6 rounded-3xl border border-primary/40 bg-primary/5 p-6">
      <p className="flex items-center gap-2 text-lg font-extrabold text-primary">
        <PartyPopper className="size-5" aria-hidden /> Félicitations 🎉
      </p>
      <p className="mt-2 text-sm">
        Vous faites partie des {LAUNCH_OFFER_SEATS} premiers professeurs inscrits sur ProFinder.
        Après la vérification de votre compte, vous bénéficierez de 3 mois de plan PRO offerts.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {verificationStatus === "pending"
          ? "Vos documents sont en cours d'examen par notre équipe. Vous serez informé dès leur validation."
          : "Nous vous invitons à téléverser votre pièce d'identité, si cela n'a pas encore été effectué, afin de finaliser la vérification de votre compte."}
      </p>
      {verificationStatus !== "pending" && verificationStatus !== "verified" && (
        <Link
          to="/pro/inscription"
          className="mt-4 inline-block rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
        >
          Téléverser ma pièce d'identité
        </Link>
      )}
    </section>
  );
}
