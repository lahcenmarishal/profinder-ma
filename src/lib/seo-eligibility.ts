/**
 * Éligibilité SEO : décide, à partir des DONNÉES RÉELLES de ProFinder, quelles
 * pages locales méritent d'être indexées.
 *
 * Principes :
 * - aucune ville n'est indexée parce qu'elle figure dans une liste ;
 * - une page existe toujours (l'utilisateur peut y arriver), mais elle passe en
 *   `noindex` tant qu'elle n'apporte pas de vraie valeur ;
 * - les combinaisons ville × matière × niveau ne sont indexées que si l'offre
 *   correspondante existe vraiment.
 */
import type { ProfessionalRow } from "@/lib/marketplace";
import {
  SEO_LEVELS,
  SEO_SUBJECTS,
  filterPros,
  isProfileIndexable,
  levelIdsOf,
  serviceMatchesSubject,
  type SeoLevel,
  type SeoSubject,
} from "@/lib/seo-taxonomy";
import { seoCities, type SeoCity, type SeoLang } from "@/lib/seo-cities";

/**
 * Seuils d'indexation — le seul endroit à ajuster quand la plateforme grandit.
 * Ils s'appliquent à toutes les villes, sans exception ni liste blanche.
 */
export const SEO_THRESHOLDS = {
  /** Page ville : profils publics réellement exploitables. */
  cityMinProfiles: 1,
  /** Page ville : matières réellement enseignées sur place. */
  cityMinSubjects: 1,
  /** Page ville : niveaux réellement couverts. */
  cityMinLevels: 1,
  /** Page ville × matière. */
  subjectMinProfiles: 1,
  /** Page ville × matière × niveau (exigence plus stricte : intention très fine). */
  levelMinProfiles: 1,
} as const;

export type CityStats = {
  city: SeoCity;
  /** Professeurs réellement rattachés à la ville. */
  total: number;
  /** Professeurs dont la fiche est publique et complète. */
  profiles: number;
  /** Matières réellement disponibles sur place. */
  subjects: SeoSubject[];
  /** Niveaux réellement couverts sur place. */
  levels: SeoLevel[];
  /** Modes de cours réellement proposés. */
  modes: { home: boolean; studio: boolean; online: boolean };
  /** Demandes d'élèves réelles rattachées à la ville (intérêt utilisateur). */
  demand: number;
};

/** Mesure la valeur réelle d'une ville à partir des professeurs chargés. */
export function cityStats(
  pros: ProfessionalRow[],
  city: SeoCity,
  demandByCityId?: Map<string, number>,
): CityStats {
  const inCity = filterPros(pros, { city });
  const publishable = inCity.filter(isProfileIndexable);
  const subjects = SEO_SUBJECTS.filter((s) =>
    publishable.some((p) => p.professional_services.some((x) => serviceMatchesSubject(x.service_id, s))),
  );
  const levels = SEO_LEVELS.filter((l) => {
    const ids = levelIdsOf(l);
    return publishable.some((p) => p.professional_levels.some((x) => ids.has(x.level_id)));
  });
  const demand = demandByCityId
    ? city.ids.reduce((sum, id) => sum + (demandByCityId.get(id) ?? 0), 0)
    : 0;
  return {
    city,
    total: inCity.length,
    profiles: publishable.length,
    subjects,
    levels,
    modes: {
      home: publishable.some((p) => p.mode_home),
      studio: publishable.some((p) => p.mode_studio),
      online: publishable.some((p) => p.mode_online),
    },
    demand,
  };
}

/** Une page ville n'est indexable que si l'offre locale est réelle et exploitable. */
export function isCityIndexable(stats: CityStats, lang: SeoLang = "fr"): boolean {
  // Page arabe : uniquement si le nom arabe réel de la ville existe en données.
  if (lang === "ar" && !stats.city.hasArabic) return false;
  return (
    stats.profiles >= SEO_THRESHOLDS.cityMinProfiles &&
    stats.subjects.length >= SEO_THRESHOLDS.cityMinSubjects &&
    stats.levels.length >= SEO_THRESHOLDS.cityMinLevels
  );
}

/** Priorité SEO d'une ville, calculée sur les données réelles (jamais sur une liste). */
export function cityPriority(stats: CityStats): number {
  return (
    stats.profiles * 10 + stats.subjects.length * 3 + stats.levels.length * 2 + stats.demand
  );
}

/** Villes réellement indexables, des plus fortes aux plus faibles. */
export function indexableCities(
  pros: ProfessionalRow[],
  lang: SeoLang = "fr",
  demandByCityId?: Map<string, number>,
): CityStats[] {
  return seoCities()
    .map((c) => cityStats(pros, c, demandByCityId))
    .filter((s) => isCityIndexable(s, lang))
    .sort((a, b) => cityPriority(b) - cityPriority(a));
}

/** Villes ayant au moins un professeur réel (utile au maillage interne). */
export function citiesWithOffer(pros: ProfessionalRow[]): CityStats[] {
  return seoCities()
    .map((c) => cityStats(pros, c))
    .filter((s) => s.profiles > 0)
    .sort((a, b) => cityPriority(b) - cityPriority(a));
}

export type ComboStats = { profiles: number; total: number };

/** Ville × matière (× niveau) : indexable seulement si l'offre existe vraiment. */
export function comboStats(
  pros: ProfessionalRow[],
  city: SeoCity | null,
  subject: SeoSubject | null,
  level: SeoLevel | null = null,
): ComboStats {
  const matches = filterPros(pros, { city, subject, level });
  return { total: matches.length, profiles: matches.filter(isProfileIndexable).length };
}

export function isComboIndexable(
  stats: ComboStats,
  opts: { level?: boolean; lang?: SeoLang; city?: SeoCity | null } = {},
): boolean {
  if (opts.lang === "ar" && opts.city && !opts.city.hasArabic) return false;
  const min = opts.level ? SEO_THRESHOLDS.levelMinProfiles : SEO_THRESHOLDS.subjectMinProfiles;
  return stats.profiles >= min;
}
