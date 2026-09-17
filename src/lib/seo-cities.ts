/**
 * Registre des villes SEO — 100 % dérivé des données réelles de la plateforme.
 *
 * Aucune liste de villes « prioritaires » n'est codée ici : toutes les villes et
 * localités marocaines du référentiel peuvent devenir des pages locales, et c'est
 * l'éligibilité calculée sur les données réelles (voir `seo-eligibility.ts`) qui
 * décide de l'indexation.
 *
 * Source de vérité : la table `cities` (id, name, slug, name_ar). Le référentiel
 * statique `@/lib/cities` sert de repli lorsque la base n'est pas joignable, et
 * `@/lib/cities.ar` complète les noms arabes encore absents en base.
 */
import { supabase } from "@/integrations/supabase/client";
import { CITIES } from "@/lib/cities";
import { CITY_NAME_AR } from "@/lib/cities.ar";

export type SeoLang = "fr" | "ar";

export type SeoCity = {
  /** Segment d'URL, ex. « agadir » — généré à partir du nom réel de la ville. */
  slug: string;
  /** Nom français réel. */
  fr: string;
  /** Nom arabe réel (repli sur le nom français si la donnée n'existe pas). */
  ar: string;
  /** Forme naturelle « في المدينة » (ex. في أكادير). */
  arIn: string;
  /** Variante locale « بالمدينة » (ex. بأكادير). */
  arBi: string;
  /** Nom canonique utilisé côté annuaire. */
  cityName: string;
  /** Identifiants réels de la ville (plusieurs lignes possibles pour un même nom). */
  ids: string[];
  /** Vrai uniquement si un nom arabe réel existe : sinon la page /ar reste noindex. */
  hasArabic: boolean;
  lat: number | null;
  lng: number | null;
};

export function slugifyCity(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** « الدار البيضاء » → « بالدار البيضاء », « أكادير » → « بأكادير ». */
function arabicForms(ar: string) {
  return { arIn: `في ${ar}`, arBi: ar.startsWith("ال") ? `بال${ar.slice(2)}` : `ب${ar}` };
}

type RawCity = {
  id: string;
  name: string;
  slug: string | null;
  name_ar: string | null;
  lat: number | null;
  lng: number | null;
};

function buildRegistry(rows: RawCity[]): SeoCity[] {
  const bySlug = new Map<string, SeoCity>();
  for (const row of rows) {
    const slug = row.slug?.trim() || slugifyCity(row.name);
    if (!slug) continue;
    const existing = bySlug.get(slug);
    if (existing) {
      existing.ids.push(row.id);
      if (!existing.hasArabic && row.name_ar) {
        const ar = row.name_ar;
        Object.assign(existing, { ar, hasArabic: true }, arabicForms(ar));
      }
      continue;
    }
    const realAr = row.name_ar?.trim() || CITY_NAME_AR[slug] || null;
    const ar = realAr ?? row.name;
    bySlug.set(slug, {
      slug,
      fr: row.name,
      ar,
      ...arabicForms(ar),
      cityName: row.name,
      ids: [row.id],
      hasArabic: !!realAr,
      lat: row.lat,
      lng: row.lng,
    });
  }
  return [...bySlug.values()].sort((a, b) => a.fr.localeCompare(b.fr, "fr"));
}

/** Repli synchrone : le référentiel géographique embarqué (toutes les villes du Maroc). */
const FALLBACK_REGISTRY = buildRegistry(
  CITIES.filter((c) => c.is_active).map((c) => ({
    id: c.id,
    name: c.name,
    slug: null,
    name_ar: null,
    lat: c.lat,
    lng: c.lng,
  })),
);

let registry: SeoCity[] = FALLBACK_REGISTRY;
let loadedAt = 0;
let inFlight: Promise<SeoCity[]> | null = null;
const TTL_MS = 5 * 60 * 1000;

/**
 * Charge (et met en cache) les villes réelles. Appelé par le layout `/$lang`
 * afin que les pages disposent des noms FR/AR réels sans requête supplémentaire.
 */
export async function loadSeoCities(force = false): Promise<SeoCity[]> {
  if (!force && Date.now() - loadedAt < TTL_MS) return registry;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const { data, error } = await supabase
        .from("cities")
        .select("id, name, slug, name_ar, lat, lng, is_active")
        .eq("is_active", true);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Array<RawCity & { is_active: boolean }>;
      if (rows.length > 0) registry = buildRegistry(rows);
      loadedAt = Date.now();
    } catch {
      // Base injoignable : on garde le référentiel embarqué.
      loadedAt = Date.now();
    } finally {
      inFlight = null;
    }
    return registry;
  })();
  return inFlight;
}

/** Villes connues (instantané synchrone du registre). */
export const seoCities = (): SeoCity[] => registry;

export const findCity = (slug?: string | null): SeoCity | null =>
  registry.find((c) => c.slug === slug) ?? null;

export const cityIdsOf = (city: SeoCity) => city.ids;

export const cityBySlugId = (id?: string | null): SeoCity | null =>
  id ? (registry.find((c) => c.ids.includes(id)) ?? null) : null;
