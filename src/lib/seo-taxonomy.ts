/**
 * Taxonomie SEO : matières et niveaux issus du référentiel réel de ProFinder.
 *
 * Les villes ne sont PAS listées ici : elles viennent du registre dynamique
 * (`@/lib/seo-cities`, alimenté par la table `cities`). L'indexation d'une page
 * locale dépend uniquement des données réelles (voir `@/lib/seo-eligibility`).
 */
import { LEVELS, SERVICES } from "@/lib/catalog";
import { SITE_URL } from "@/lib/blog";
import type { ProfessionalRow } from "@/lib/marketplace";
import { cityIdsOf, findCity, seoCities, type SeoCity, type SeoLang } from "@/lib/seo-cities";

export type { SeoCity, SeoLang };
export { cityIdsOf, findCity, seoCities, loadSeoCities, cityBySlugId, slugifyCity } from "@/lib/seo-cities";

export type SeoSubject = {
  slug: string;
  fr: string;
  ar: string;
  /** Formulation naturelle « أستاذ الرياضيات » */
  arTeacher: string;
  match: string[];
};
export type SeoLevel = { slug: string; fr: string; ar: string; matchNames: (name: string, cycle: string) => boolean };

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();


/* ------------------------------------------------------------------ */
/* Matières (taxonomie réelle des services ProFinder)                  */
/* ------------------------------------------------------------------ */

export const SEO_SUBJECTS: SeoSubject[] = [
  { slug: "mathematiques", fr: "Mathématiques", ar: "الرياضيات", arTeacher: "أستاذ الرياضيات", match: ["mathematiques", "algebre", "analyse", "geometrie", "probabilites", "statistiques"] },
  { slug: "physique-chimie", fr: "Physique-Chimie", ar: "الفيزياء والكيمياء", arTeacher: "أستاذ الفيزياء والكيمياء", match: ["physique", "chimie", "thermodynamique", "electricite", "electromagnetisme", "optique", "mecanique"] },
  { slug: "svt", fr: "SVT", ar: "علوم الحياة والأرض", arTeacher: "أستاذ علوم الحياة والأرض", match: ["svt", "sciences de la vie", "biologie", "genetique", "microbiologie", "physiologie", "biochimie"] },
  { slug: "francais", fr: "Français", ar: "الفرنسية", arTeacher: "أستاذ الفرنسية", match: ["francais", "grammaire", "litterature", "linguistique"] },
  { slug: "anglais", fr: "Anglais", ar: "الإنجليزية", arTeacher: "أستاذ الإنجليزية", match: ["anglais", "english", "grammar", "literature", "linguistics"] },
  { slug: "arabe", fr: "Arabe", ar: "اللغة العربية", arTeacher: "أستاذ اللغة العربية", match: ["arabe"] },
  { slug: "philosophie", fr: "Philosophie", ar: "الفلسفة", arTeacher: "أستاذ الفلسفة", match: ["philosophie"] },
  { slug: "histoire-geographie", fr: "Histoire-Géographie", ar: "التاريخ والجغرافيا", arTeacher: "أستاذ التاريخ والجغرافيا", match: ["histoire", "geographie"] },
  { slug: "informatique", fr: "Informatique", ar: "المعلوميات", arTeacher: "أستاذ المعلوميات", match: ["informatique", "programmation", "algorithmique", "python", "reseaux", "systemes", "bases de donnees", "developpement", "genie logiciel", "data", "intelligence artificielle", "securite"] },
  { slug: "economie", fr: "Économie", ar: "الاقتصاد", arTeacher: "أستاذ الاقتصاد", match: ["economie", "economentrie", "econometrie", "macroeconomie", "microeconomie", "marches financiers"] },
  { slug: "comptabilite", fr: "Comptabilité", ar: "المحاسبة", arTeacher: "أستاذ المحاسبة", match: ["comptabilite", "fiscalite", "audit", "controle de gestion", "finance"] },
  { slug: "gestion", fr: "Gestion & Management", ar: "التدبير والتسيير", arTeacher: "أستاذ التدبير", match: ["gestion", "management", "marketing", "ressources humaines", "commerce"] },
  { slug: "droit", fr: "Droit", ar: "القانون", arTeacher: "أستاذ القانون", match: ["droit"] },
];

export const findSubject = (slug?: string) => SEO_SUBJECTS.find((s) => s.slug === slug) ?? null;

const SERVICE_NAME_BY_ID = new Map(SERVICES.map((s) => [s.id, norm(s.name)]));

export function serviceMatchesSubject(serviceId: string, subject: SeoSubject) {
  const name = SERVICE_NAME_BY_ID.get(serviceId);
  if (!name) return false;
  return subject.match.some((m) => name.includes(m));
}

/* ------------------------------------------------------------------ */
/* Niveaux (système scolaire réel : cycles + paliers Bac / Supérieur)  */
/* ------------------------------------------------------------------ */

const byCycle = (cycle: string) => (_n: string, c: string) => c === cycle;
const byName = (needle: string) => (n: string) => norm(n).includes(norm(needle));

export const SEO_LEVELS: SeoLevel[] = [
  { slug: "primaire", fr: "Primaire", ar: "الابتدائي", matchNames: byCycle("Primaire") },
  { slug: "college", fr: "Collège", ar: "الإعدادي", matchNames: byCycle("Collège") },
  { slug: "lycee", fr: "Lycée", ar: "الثانوي التأهيلي", matchNames: byCycle("Lycée") },
  { slug: "tronc-commun", fr: "Tronc commun", ar: "الجذع المشترك", matchNames: byName("tronc commun") },
  { slug: "1ere-annee-bac", fr: "1ère année Bac", ar: "الأولى باكالوريا", matchNames: byName("1ère année bac") },
  { slug: "2eme-annee-bac", fr: "2ème année Bac", ar: "الثانية باكالوريا", matchNames: byName("2ème année bac") },
  { slug: "superieur", fr: "Supérieur", ar: "التعليم العالي", matchNames: byCycle("Supérieur") },
  { slug: "licence", fr: "Licence", ar: "الإجازة", matchNames: byName("licence") },
  { slug: "master", fr: "Master", ar: "الماستر", matchNames: byName("master") },
];

export const findLevel = (slug?: string) => SEO_LEVELS.find((l) => l.slug === slug) ?? null;

const LEVEL_IDS_BY_CYCLE = new Map(
  SEO_LEVELS.map((l) => [
    l.slug,
    new Set(LEVELS.filter((x) => x.is_active && l.matchNames(x.name, x.cycle ?? "")).map((x) => x.id)),
  ]),
);

/** Identifiants de classes réels correspondant à un palier SEO. */
export const levelIdsOf = (level: SeoLevel): Set<string> =>
  LEVEL_IDS_BY_CYCLE.get(level.slug) ?? new Set<string>();



/* ------------------------------------------------------------------ */
/* Filtrage des professeurs réels                                      */
/* ------------------------------------------------------------------ */

export type SeoFilter = {
  city?: SeoCity | null;
  subject?: SeoSubject | null;
  level?: SeoLevel | null;
};

export function filterPros(pros: ProfessionalRow[], f: SeoFilter): ProfessionalRow[] {
  const cityIds = f.city ? new Set(cityIdsOf(f.city)) : null;
  const levelIds = f.level ? LEVEL_IDS_BY_CYCLE.get(f.level.slug) : null;
  return pros.filter((p) => {
    if (cityIds && !(p.city_id && cityIds.has(p.city_id))) return false;
    if (f.subject && !p.professional_services.some((s) => serviceMatchesSubject(s.service_id, f.subject!)))
      return false;
    if (levelIds && !p.professional_levels.some((l) => levelIds.has(l.level_id))) return false;
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Slugs professeurs                                                    */
/* ------------------------------------------------------------------ */

export const slugify = (s: string) =>
  norm(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const proSlug = (pro: { id: string; display_name: string }) =>
  `${slugify(pro.display_name) || "professeur"}-${pro.id.slice(0, 8)}`;

export function findProBySlug(pros: ProfessionalRow[], slug: string) {
  const suffix = slug.slice(slug.lastIndexOf("-") + 1);
  return pros.find((p) => p.id.startsWith(suffix)) ?? pros.find((p) => proSlug(p) === slug) ?? null;
}

/* ------------------------------------------------------------------ */
/* Métadonnées SEO                                                      */
/* ------------------------------------------------------------------ */

export const otherLang = (lang: SeoLang): SeoLang => (lang === "fr" ? "ar" : "fr");

export type HeadInput = {
  lang: SeoLang;
  path: string; // sans le préfixe de langue, ex. "/professeurs/casablanca"
  title: string;
  description: string;
  /** false → noindex,follow (page sans données réelles suffisantes) */
  index?: boolean;
  /** Image sociale absolue. Par défaut : bannière de marque 1200×630. */
  image?: string | null | undefined;
  /** Texte alternatif de l'image sociale (décrit réellement l'image). */
  imageAlt?: string | undefined;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

/** Bannière sociale par défaut (1200×630, cohérente avec la marque). */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;

/** Langue de contenu au format BCP 47 attendu par Schema.org (fr-MA / ar-MA). */
export const contentLocale = (lang: SeoLang) => (lang === "fr" ? "fr-MA" : "ar-MA");

export function seoHead({
  lang,
  path,
  title,
  description,
  index = true,
  image,
  imageAlt,
  jsonLd,
}: HeadInput) {
  const url = `${SITE_URL}/${lang}${path}`;
  const ogImage = image === null ? null : (image ?? DEFAULT_OG_IMAGE);
  const meta: Array<Record<string, string>> = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:site_name", content: "Profinder" },
    { property: "og:locale", content: lang === "fr" ? "fr_MA" : "ar_MA" },
    { property: "og:locale:alternate", content: lang === "fr" ? "ar_MA" : "fr_MA" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
  if (ogImage) {
    meta.push(
      { property: "og:image", content: ogImage },
      { property: "og:image:alt", content: imageAlt ?? title },
      { name: "twitter:image", content: ogImage },
      { name: "twitter:image:alt", content: imageAlt ?? title },
    );
  }
  if (!index) meta.push({ name: "robots", content: "noindex,follow" });
  const head: Record<string, unknown> = {
    meta,
    links: [
      // Canonical auto-référent : chaque langue pointe vers sa propre URL.
      { rel: "canonical", href: url },
      { rel: "alternate", hrefLang: "fr-MA", href: `${SITE_URL}/fr${path}` },
      { rel: "alternate", hrefLang: "ar-MA", href: `${SITE_URL}/ar${path}` },
      { rel: "alternate", hrefLang: "x-default", href: `${SITE_URL}/fr${path}` },
    ],
  };
  if (jsonLd) {
    const list = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
    head["scripts"] = list.map((node) => ({
      type: "application/ld+json",
      children: JSON.stringify({ inLanguage: contentLocale(lang), ...node }),
    }));
  }
  return head;
}



export function breadcrumbLd(lang: SeoLang, items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}/${lang}${it.path}`,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Indexation des fiches professeurs                                    */
/* ------------------------------------------------------------------ */

/** Une fiche n'est indexable que si elle est active, publique et réellement complète. */
export function isProfileIndexable(pro: ProfessionalRow): boolean {
  const bio = (pro.bio ?? "").trim();
  return (
    pro.professional_services.length > 0 &&
    pro.professional_levels.length > 0 &&
    (pro.mode_home || pro.mode_studio || pro.mode_online) &&
    pro.hourly_rate > 0 &&
    !!pro.city_id &&
    (bio.length >= 80 || (bio.length >= 40 && !!pro.headline)) &&
    pro.verification_status !== "rejected"
  );
}
