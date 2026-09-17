/**
 * Système SEO centralisé de ProFinder.
 *
 * Toute la logique de métadonnées est décrite par un seul descripteur de page :
 *
 *   SEO CONFIG → LANGUE → TYPE DE PAGE → VILLE → MATIÈRE → NIVEAU → PROFESSEUR
 *             → METADATA → CANONICAL → HREFLANG → OPEN GRAPH → JSON-LD
 *
 * Les composants et les routes ne construisent plus de balises : ils déclarent
 * `seoRouteHead({ type, lang, city, subject, level, index })` et récupèrent le
 * H1 / l'intro via `seoCopy(...)`. Un seul endroit décide des titres, canonicals,
 * hreflang, Open Graph et données structurées.
 */
import { SITE_URL } from "@/lib/blog";
import {
  DEFAULT_OG_IMAGE,
  breadcrumbLd,
  contentLocale,
  seoHead,
  type SeoCity,
  type SeoLang,
  type SeoLevel,
  type SeoSubject,
} from "@/lib/seo-taxonomy";
import {
  cityCopy,
  cityHubCopy,
  coursesCopy,
  homeCopy,
  label,
  levelCopy,
  levelHubCopy,
  nav,
  subjectCopy,
  subjectHubCopy,
  teachersCopy,
  withBrand,
} from "@/lib/seo-copy";

export const SEO_CONFIG = {
  brand: "Profinder",
  siteUrl: SITE_URL,
  langs: ["fr", "ar"] as const satisfies readonly SeoLang[],
  defaultLang: "fr" as SeoLang,
  defaultImage: DEFAULT_OG_IMAGE,
} as const;

/** Types de pages couverts par le système SEO. */
export type SeoPageType =
  | "home"
  | "teachers" // /professeurs (+ ville, + matière, + niveau)
  | "courses" // /cours-particuliers (+ ville, + matière)
  | "subjects"
  | "subject"
  | "cities"
  | "city"
  | "levels"
  | "level"
  | "professional"
  | "blog"
  | "article";

export type SeoEntities = {
  city?: SeoCity | null;
  subject?: SeoSubject | null;
  level?: SeoLevel | null;
  /** Fiche professeur (page /professeur/[slug]). */
  pro?: { slug: string; name: string; bio?: string | null; photo?: string | null; city?: string | null; subjects?: string[]; rate?: number | null } | null;
  /** Article de blog (page /blog/[slug]). */
  article?: {
    slug: string;
    title: string;
    description: string;
    image?: string | null;
    publishedAt?: string | null;
    /** Slug de la traduction, s'il existe réellement. */
    alternateSlug?: string | null;
  } | null;
};

export type SeoPage = SeoEntities & {
  type: SeoPageType;
  lang: SeoLang;
  /** false → noindex,follow (page sans valeur réelle suffisante). */
  index?: boolean;
  /** Remplace le titre/description générés (cas particuliers : 404, fiche prof). */
  title?: string;
  description?: string;
  h1?: string;
  intro?: string;
  image?: string | null;
  imageAlt?: string;
  /** Données structurées supplémentaires propres à la page. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

/* ------------------------------------------------------------------ */
/* 1. Chemin canonique (langue exclue : ajoutée au rendu)              */
/* ------------------------------------------------------------------ */

export function seoPath(p: SeoPage): string {
  const { city, subject, level } = p;
  switch (p.type) {
    case "home":
      return "";
    case "teachers": {
      // /professeurs, /professeurs/[ville|matière], /professeurs/[ville]/[matière][/niveau]
      const head = city?.slug ?? subject?.slug ?? null;
      const seg = [head, city && subject ? subject.slug : null, city && subject && level ? level.slug : null]
        .filter(Boolean)
        .join("/");
      return seg ? `/professeurs/${seg}` : "/professeurs";
    }
    case "courses": {
      const seg = [city?.slug ?? null, city && subject ? subject.slug : null].filter(Boolean).join("/");
      return seg ? `/cours-particuliers/${seg}` : "/cours-particuliers";
    }
    case "subjects":
      return "/matieres";
    case "subject":
      return subject ? `/matieres/${subject.slug}` : "/matieres";
    case "cities":
      return "/villes";
    case "city":
      return city ? `/villes/${city.slug}` : "/villes";
    case "levels":
      return "/niveaux";
    case "level":
      return level ? `/niveaux/${level.slug}` : "/niveaux";
    case "professional":
      return p.pro ? `/professeur/${p.pro.slug}` : "/professeurs";
    case "blog":
      return "/blog";
    case "article":
      return p.article ? `/blog/${p.article.slug}` : "/blog";
  }
}

export const seoUrl = (p: SeoPage, lang: SeoLang = p.lang) => `${SITE_URL}/${lang}${seoPath({ ...p, lang })}`;

/* ------------------------------------------------------------------ */
/* 2. Copie éditoriale (H1, intro, title, meta description)            */
/* ------------------------------------------------------------------ */

export type SeoCopy = { h1: string; intro: string; title: string; description: string };

function generatedCopy(p: SeoPage): SeoCopy {
  const { lang, city = null, subject = null, level = null } = p;
  switch (p.type) {
    case "home":
      return homeCopy(lang);
    case "teachers":
      return teachersCopy(lang, city, subject, level);
    case "courses":
      return coursesCopy(lang, city, subject);
    case "subjects":
      return subjectHubCopy(lang);
    case "subject":
      return subject ? subjectCopy(lang, subject) : subjectHubCopy(lang);
    case "cities":
      return cityHubCopy(lang);
    case "city":
      return city ? cityCopy(lang, city) : cityHubCopy(lang);
    case "levels":
      return levelHubCopy(lang);
    case "level":
      return level ? levelCopy(lang, level) : levelHubCopy(lang);
    case "professional": {
      const pro = p.pro;
      if (!pro) return teachersCopy(lang, city, subject, level);
      const lead =
        lang === "fr"
          ? `${subject ? `Professeur de ${subject.fr.toLowerCase()}` : "Professeur particulier"}${pro.city ? ` à ${pro.city}` : ""} — ${pro.name}`
          : `${subject ? subject.arTeacher : "أستاذ خصوصي"}${city ? ` ${city.arIn}` : ""} — ${pro.name}`;
      const subjects = (pro.subjects ?? []).slice(0, 4).join(", ");
      const description =
        lang === "fr"
          ? `${pro.name} enseigne ${subjects || "plusieurs matières"}${pro.city ? ` à ${pro.city}` : ""}. Tarif ${pro.rate ?? "—"} DH/h, profil vérifié, avis d'élèves.`
          : `${pro.name} يدرّس ${subjects || "عدة مواد"}${pro.city ? ` في ${pro.city}` : ""}. السعر ${pro.rate ?? "—"} درهم/ساعة، ملف موثوق وآراء التلاميذ.`;
      return { h1: lead, intro: description, title: withBrand(lead), description };
    }
    case "article": {
      const a = p.article;
      if (!a) return homeCopy(lang);
      return { h1: a.title, intro: a.description, title: withBrand(a.title, "—"), description: a.description };
    }
    case "blog":
      return {
        h1: nav("blog", lang),
        intro: lang === "fr" ? "Conseils et ressources pour réussir." : "نصائح وموارد للنجاح.",
        title: withBrand(lang === "fr" ? "Blog — conseils scolaires au Maroc" : "المدونة — نصائح دراسية في المغرب"),
        description:
          lang === "fr"
            ? "Conseils de révision, orientation et méthodes de travail pour les élèves marocains."
            : "نصائح للمراجعة والتوجيه ومناهج العمل للتلاميذ في المغرب.",
      };
  }
}

/** Copie finale : générée depuis le type de page, surchargeable ponctuellement. */
export function seoCopy(p: SeoPage): SeoCopy {
  const base = generatedCopy(p);
  return {
    h1: p.h1 ?? base.h1,
    intro: p.intro ?? base.intro,
    title: p.title ?? base.title,
    description: p.description ?? base.description,
  };
}

/* ------------------------------------------------------------------ */
/* 3. Fil d'Ariane (JSON-LD BreadcrumbList)                            */
/* ------------------------------------------------------------------ */

export function seoCrumbs(p: SeoPage): Array<{ name: string; path: string }> {
  const { lang, city = null, subject = null, level = null } = p;
  const items: Array<{ name: string; path: string }> = [{ name: nav("home", lang), path: "" }];
  const push = (name: string, path: string) => items.push({ name, path });
  const copy = seoCopy(p);

  switch (p.type) {
    case "home":
      return [{ name: copy.h1, path: "" }];
    case "teachers": {
      push(nav("teachers", lang), "/professeurs");
      const head = city ?? subject;
      if (head) {
        const headName = city ? label.city(city, lang) : label.subject(subject!, lang);
        push(headName, `/professeurs/${city ? city.slug : subject!.slug}`);
      }
      if (city && subject) push(label.subject(subject, lang), `/professeurs/${city.slug}/${subject.slug}`);
      if (city && subject && level)
        push(label.level(level, lang), `/professeurs/${city.slug}/${subject.slug}/${level.slug}`);
      break;
    }
    case "courses": {
      push(nav("courses", lang), "/cours-particuliers");
      if (city) push(label.city(city, lang), `/cours-particuliers/${city.slug}`);
      if (city && subject) push(label.subject(subject, lang), `/cours-particuliers/${city.slug}/${subject.slug}`);
      break;
    }
    case "subjects":
    case "subject":
      push(nav("subjects", lang), "/matieres");
      if (p.type === "subject" && subject) push(label.subject(subject, lang), `/matieres/${subject.slug}`);
      break;
    case "cities":
    case "city":
      push(nav("cities", lang), "/villes");
      if (p.type === "city" && city) push(label.city(city, lang), `/villes/${city.slug}`);
      break;
    case "levels":
    case "level":
      push(nav("levels", lang), "/niveaux");
      if (p.type === "level" && level) push(label.level(level, lang), `/niveaux/${level.slug}`);
      break;
    case "professional":
      push(nav("teachers", lang), "/professeurs");
      if (p.pro) push(p.pro.name, seoPath(p));
      break;
    case "blog":
    case "article":
      push(nav("blog", lang), "/blog");
      if (p.type === "article" && p.article) push(p.article.title, seoPath(p));
      break;
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* 4. Données structurées                                              */
/* ------------------------------------------------------------------ */

const COLLECTION_TYPES: SeoPageType[] = [
  "teachers",
  "courses",
  "subjects",
  "subject",
  "cities",
  "city",
  "levels",
  "level",
];

function pageJsonLd(p: SeoPage): Record<string, unknown>[] {
  const copy = seoCopy(p);
  const url = seoUrl(p);
  const nodes: Record<string, unknown>[] = [];

  if (p.type === "home") {
    nodes.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SEO_CONFIG.brand,
      url: `${SITE_URL}/${p.lang}`,
      description: copy.description,
    });
  } else if (p.type === "professional" && p.pro) {
    nodes.push({
      "@context": "https://schema.org",
      "@type": "Person",
      name: p.pro.name,
      jobTitle: p.lang === "fr" ? "Professeur particulier" : "أستاذ خصوصي",
      url,
      ...(p.pro.photo ? { image: p.pro.photo } : {}),
      ...(p.pro.city ? { address: { "@type": "PostalAddress", addressLocality: p.pro.city } } : {}),
      ...(p.pro.bio ? { description: p.pro.bio.slice(0, 300) } : {}),
      ...(p.pro.subjects?.length ? { knowsAbout: p.pro.subjects } : {}),
    });
  } else if (p.type === "article" && p.article) {
    const image = p.article.image ?? null;
    nodes.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: p.article.title,
      description: p.article.description,
      mainEntityOfPage: url,
      ...(p.article.publishedAt ? { datePublished: p.article.publishedAt } : {}),
      ...(image ? { image: [image] } : {}),
      author: { "@type": "Organization", name: SEO_CONFIG.brand },
      publisher: { "@type": "Organization", name: SEO_CONFIG.brand },
    });
  } else if (p.type === "blog") {
    nodes.push({
      "@context": "https://schema.org",
      "@type": "Blog",
      name: `${SEO_CONFIG.brand} — ${nav("blog", p.lang)}`,
      url,
      description: copy.description,
    });
  } else if (COLLECTION_TYPES.includes(p.type)) {
    nodes.push({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: copy.h1,
      description: copy.description,
      url,
      ...(p.city
        ? {
            about: {
              "@type": "Place",
              name: label.city(p.city, p.lang),
              ...(p.city.lat != null && p.city.lng != null
                ? { geo: { "@type": "GeoCoordinates", latitude: p.city.lat, longitude: p.city.lng } }
                : {}),
              address: { "@type": "PostalAddress", addressLocality: p.city.fr, addressCountry: "MA" },
            },
          }
        : {}),
    });
  }

  nodes.push(breadcrumbLd(p.lang, seoCrumbs(p)));
  if (p.jsonLd) nodes.push(...(Array.isArray(p.jsonLd) ? p.jsonLd : [p.jsonLd]));
  return nodes;
}

/* ------------------------------------------------------------------ */
/* 5. Hreflang : uniquement les langues où la page existe réellement   */
/* ------------------------------------------------------------------ */

export function seoAlternates(p: SeoPage): Array<{ lang: SeoLang; path: string }> {
  // Article : la version traduite n'existe que si son slug existe réellement.
  if (p.type === "article" && p.article) {
    const self = { lang: p.lang, path: `/blog/${p.article.slug}` };
    if (!p.article.alternateSlug) return [self];
    const other: SeoLang = p.lang === "fr" ? "ar" : "fr";
    return [self, { lang: other, path: `/blog/${p.article.alternateSlug}` }];
  }
  const path = seoPath(p);
  // Page locale sans nom arabe réel : pas d'alternative /ar annoncée.
  if (p.city && !p.city.hasArabic) return [{ lang: "fr", path }];
  return SEO_CONFIG.langs.map((lang) => ({ lang, path }));
}

/* ------------------------------------------------------------------ */
/* 6. Rendu : metadata + canonical + hreflang + OG + JSON-LD           */
/* ------------------------------------------------------------------ */

/** Objet SEO complet d'une page (utile pour tests, sitemap, débogage). */
export function buildSeo(p: SeoPage) {
  const copy = seoCopy(p);
  const path = seoPath(p);
  const image = p.image === null ? null : (p.image ?? (p.type === "article" ? p.article?.image : null) ?? SEO_CONFIG.defaultImage);
  return {
    lang: p.lang,
    locale: contentLocale(p.lang),
    type: p.type,
    path,
    url: seoUrl(p),
    canonical: seoUrl(p),
    index: p.index ?? true,
    ...copy,
    image,
    imageAlt: p.imageAlt ?? copy.h1,
    alternates: seoAlternates(p),
    jsonLd: pageJsonLd(p),
  };
}

/** Point d'entrée unique des routes : `head: () => seoRouteHead({...})`. */
export function seoRouteHead(p: SeoPage) {
  const seo = buildSeo(p);
  const base = seoHead({
    lang: seo.lang,
    path: seo.path,
    title: seo.title,
    description: seo.description,
    index: seo.index,
    image: seo.image,
    imageAlt: seo.imageAlt,
    jsonLd: seo.jsonLd,
  }) as Record<string, unknown>;
  const ogType = p.type === "article" ? "article" : p.type === "professional" ? "profile" : "website";
  const meta = (base["meta"] as Array<Record<string, string>>).map((m) =>
    m["property"] === "og:type" ? { property: "og:type", content: ogType } : m,
  );
  // Hreflang réels : une alternative n'est annoncée que si la page existe.
  const frPath = (seo.alternates.find((a) => a.lang === "fr") ?? seo.alternates[0]!).path;
  const links = [
    { rel: "canonical", href: seo.canonical },
    ...seo.alternates.map((a) => ({
      rel: "alternate",
      hrefLang: `${a.lang}-MA`,
      href: `${SITE_URL}/${a.lang}${a.path}`,
    })),
    { rel: "alternate", hrefLang: "x-default", href: `${SITE_URL}/fr${frPath}` },
  ];
  const scripts = base["scripts"] as Array<{ type: string; children: string }> | undefined;
  return { meta, links, ...(scripts ? { scripts } : {}) };
}


/** Page introuvable / contenu retiré : jamais indexée. */
export function seoNotFoundHead(lang: SeoLang, path: string, kind: "professional" | "article" | "page" = "page") {
  const titles = {
    professional: { fr: "Professeur introuvable", ar: "الأستاذ غير موجود" },
    article: { fr: "Article introuvable", ar: "المقال غير موجود" },
    page: { fr: "Page introuvable", ar: "الصفحة غير موجودة" },
  } as const;
  const title = withBrand(titles[kind][lang]);
  return seoHead({
    lang,
    path,
    title,
    description: lang === "fr" ? "Ce contenu n'est plus disponible." : "هذا المحتوى لم يعد متاحاً.",
    index: false,
  });
}
