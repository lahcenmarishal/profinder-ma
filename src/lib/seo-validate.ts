/**
 * Validation interne des annotations multilingues (FR ⇄ AR).
 *
 * Pour chaque page déclarée au moteur SEO (`@/lib/seo`), on vérifie :
 *  - canonical auto-référent (jamais FR → AR ni AR → FR) ;
 *  - hreflang présents, avec des codes de langue valides (fr-MA / ar-MA) ;
 *  - réciprocité : la page annoncée annonce bien la page de départ ;
 *  - x-default pointant vers la version française ;
 *  - existence réelle de l'URL annoncée (statut HTTP 200, contrôle optionnel).
 */
import { SEO_CONFIG, buildSeo, seoUrl, type SeoPage } from "@/lib/seo";
import type { SeoLang } from "@/lib/seo-taxonomy";

export type HreflangIssue = {
  url: string;
  code:
    | "canonical_mismatch"
    | "missing_alternate"
    | "invalid_hreflang"
    | "not_reciprocal"
    | "missing_x_default"
    | "url_not_200";
  detail: string;
};

const VALID = new Set(["fr-MA", "ar-MA"]);

/** Contrôle structurel d'un couple de pages équivalentes (aucun réseau requis). */
export function validatePair(page: SeoPage, alternate: SeoPage | null): HreflangIssue[] {
  const issues: HreflangIssue[] = [];
  const seo = buildSeo(page);
  const url = seo.url;
  const push = (code: HreflangIssue["code"], detail: string) => issues.push({ url, code, detail });

  if (seo.canonical !== url) push("canonical_mismatch", `canonical ${seo.canonical} ≠ ${url}`);

  for (const a of seo.alternates) {
    const code = `${a.lang}-MA`;
    if (!VALID.has(code)) push("invalid_hreflang", `code de langue inattendu : ${code}`);
  }

  const selfDeclared = seo.alternates.some((a) => a.lang === page.lang);
  if (!selfDeclared) push("missing_alternate", "la page ne s'annonce pas elle-même");

  const frAlt = seo.alternates.find((a) => a.lang === "fr");
  if (!frAlt) push("missing_x_default", "aucune version française pour x-default");

  if (alternate) {
    const otherLang: SeoLang = page.lang === "fr" ? "ar" : "fr";
    const declared = seo.alternates.find((a) => a.lang === otherLang);
    const expected = seoUrl(alternate);
    if (!declared) {
      push("missing_alternate", `version ${otherLang} attendue : ${expected}`);
    } else if (`${SEO_CONFIG.siteUrl}/${otherLang}${declared.path}` !== expected) {
      push("missing_alternate", `hreflang ${otherLang} pointe ailleurs que ${expected}`);
    } else {
      // Réciprocité : la page annoncée doit renvoyer vers celle-ci.
      const back = buildSeo(alternate).alternates.find((a) => a.lang === page.lang);
      const backUrl = back ? `${SEO_CONFIG.siteUrl}/${page.lang}${back.path}` : null;
      if (backUrl !== url) push("not_reciprocal", `${expected} ne renvoie pas vers ${url}`);
    }
  } else if (seo.alternates.some((a) => a.lang !== page.lang)) {
    push("missing_alternate", "une alternative est annoncée alors que la page n'existe pas");
  }

  return issues;
}

/** Contrôle HTTP : l'URL annoncée répond-elle réellement 200 ? */
export async function checkUrlsReachable(urls: string[], origin: string): Promise<HreflangIssue[]> {
  const issues: HreflangIssue[] = [];
  await Promise.all(
    urls.map(async (url) => {
      const target = url.replace(SEO_CONFIG.siteUrl, origin);
      try {
        const res = await fetch(target, { method: "GET", redirect: "manual" });
        if (res.status !== 200) issues.push({ url, code: "url_not_200", detail: `statut ${res.status}` });
      } catch (e) {
        issues.push({ url, code: "url_not_200", detail: `injoignable (${String(e)})` });
      }
    }),
  );
  return issues;
}

/** Rapport complet sur une liste de couples FR/AR. */
export function validatePairs(pairs: Array<{ fr: SeoPage; ar: SeoPage | null }>) {
  const issues: HreflangIssue[] = [];
  for (const { fr, ar } of pairs) {
    issues.push(...validatePair(fr, ar));
    if (ar) issues.push(...validatePair(ar, fr));
  }
  return { checked: pairs.length, ok: issues.length === 0, issues };
}
