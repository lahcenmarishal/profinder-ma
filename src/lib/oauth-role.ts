import type { AccountRole } from "@/lib/pending-role";

export function resolveOAuthRole({
  requestedRole,
  knownRole,
  roleWasChosen,
  hasProfessionalProfile,
  isFreshAccount = false,
}: {
  requestedRole: AccountRole;
  knownRole: AccountRole | null;
  roleWasChosen: boolean;
  hasProfessionalProfile: boolean;
  /** Compte d'authentification créé à l'instant (première connexion Google). */
  isFreshAccount?: boolean;
}) {
  // Une fiche professeur existante est toujours la source de vérité : un compte
  // professeur ne doit jamais être renvoyé vers le parcours élève, même si un
  // rôle « élève » traîne dans le stockage local ou dans les métadonnées.
  const role: AccountRole = hasProfessionalProfile
    ? "pro"
    : roleWasChosen
      ? requestedRole
      : (knownRole ?? requestedRole);


  return {
    role,
    // Un compte tout juste créé reste un nouveau compte même si le parcours
    // (élève / professeur) avait été choisi avant la redirection Google.
    isNewAccount: !hasProfessionalProfile && (isFreshAccount || (!roleWasChosen && !knownRole)),
  };
}