/**
 * Récompenses professeur basées UNIQUEMENT sur le nombre d'avis obtenus,
 * jamais sur la note reçue.
 */
export type ReviewReward = {
  count: number;
  title: string;
  description: string;
};

export const REVIEW_REWARDS: ReviewReward[] = [
  {
    count: 5,
    title: "Profil mis en avant",
    description: "Votre profil est mis en avant pendant 7 jours.",
  },
  {
    count: 10,
    title: "Visibilité supplémentaire",
    description: "Visibilité supplémentaire dans les résultats de recherche.",
  },
  {
    count: 20,
    title: "Badge « Très apprécié »",
    description: "Badge « Très apprécié » et visibilité supplémentaire dans les résultats.",
  },
];

export function nextReward(count: number): ReviewReward | null {
  return REVIEW_REWARDS.find((r) => count < r.count) ?? null;
}

/** Lien public d'avis à partager avec les élèves. */
export function reviewLink(token: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/avis/${token}`;
}

export function whatsappShareUrl(link: string, proName: string): string {
  const text = `Bonjour ! Si mes cours vous ont été utiles, vous pouvez laisser un avis sur mon profil ProFinder (${proName}) ici : ${link}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
