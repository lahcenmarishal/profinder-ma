import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { AR } from "./translations.ar";


export type Lang = "fr" | "ar";

const STORAGE_KEY = "profinder_lang";

/** Langue choisie manuellement (mémorisée), sinon null. */
export function getStoredLang(): Lang | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "ar" || v === "fr" ? v : null;
  } catch {
    return null;
  }
}

/** Détection de la langue du navigateur/appareil : arabe → ar, sinon français. */
export function detectBrowserLang(): Lang {
  if (typeof navigator === "undefined") return "fr";
  const list = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean) as string[];
  for (const raw of list) {
    const code = raw.toLowerCase();
    if (code.startsWith("ar")) return "ar";
    if (code.startsWith("fr")) return "fr";
  }
  return "fr";
}

export function resolveInitialLang(): Lang {
  return getStoredLang() ?? detectBrowserLang();
}

/* ------------------------------------------------------------------ */
/* Traduction du rendu (texte + attributs) quand la langue est l'arabe  */
/* ------------------------------------------------------------------ */

const ATTRS = ["placeholder", "title", "aria-label", "alt"];
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE"]);

const AR_KEYS = Object.keys(AR).sort((a, b) => b.length - a.length);

// Remplace les fragments français connus dans un texte mixte
// (ex. "🎓 Primaire, Collège, Lycée" ou "📍 Casablanca · 3 km").
// Deux garde-fous indispensables :
//  - on ne coupe jamais un mot (frontières de mots obligatoires) ;
//  - on n'applique ce mode qu'aux textes courts (libellés d'interface),
//    jamais aux contenus rédigés (bio, articles) qui deviendraient illisibles.
const WORD_CHAR = /[\p{L}\p{N}]/u;
const MIXED_MAX_LENGTH = 60;

function isBoundary(text: string, index: number): boolean {
  const ch = text[index];
  return ch === undefined || !WORD_CHAR.test(ch);
}

function translateMixed(text: string): string | null {
  if (text.length > MIXED_MAX_LENGTH) return null;
  let out = "";
  let i = 0;
  let changed = false;
  while (i < text.length) {
    let matched = false;
    if (isBoundary(text, i - 1)) {
      for (const key of AR_KEYS) {
        if (!text.startsWith(key, i)) continue;
        if (!isBoundary(text, i + key.length)) continue;
        const hit = AR[key];
        if (hit && hit !== key) changed = true;
        out += hit ?? key;
        i += key.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += text[i];
      i += 1;
    }
  }
  return changed ? out : null;
}

/**
 * Listes du type "Lundi, Mardi · Matin" : on ne traduit que si CHAQUE segment
 * est un libellé connu, afin de ne jamais produire de phrase à moitié traduite.
 */
const LIST_SPLIT = /(\s*[,·|]\s*)/;

function translateList(text: string): string | null {
  const parts = text.split(LIST_SPLIT);
  if (parts.length < 3) return null;
  let changed = false;
  const out = parts.map((part, i) => {
    if (i % 2 === 1) return part; // séparateur
    const term = part.trim();
    if (!term) return part;
    const hit = AR[term];
    if (!hit) return null;
    if (hit !== term) changed = true;
    return part.replace(term, hit);
  });
  if (!changed || out.some((p) => p === null)) return null;
  return out.join("");
}

function lookup(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const key = trimmed.replace(/\s+/g, " ");
  const hit = AR[key];
  if (hit) {
    const before = raw.slice(0, raw.indexOf(trimmed[0]!));
    const after = raw.slice(raw.lastIndexOf(trimmed[trimmed.length - 1]!) + 1);
    return `${before}${hit}${after}`;
  }
  const mixed = translateMixed(key) ?? translateList(key);
  if (!mixed) return null;
  const before = raw.slice(0, raw.indexOf(trimmed[0]!));
  const after = raw.slice(raw.lastIndexOf(trimmed[trimmed.length - 1]!) + 1);
  return `${before}${mixed}${after}`;
}

/** Contenus saisis par les utilisateurs : jamais traduits automatiquement. */
function isProtected(el: Element | null): boolean {
  return !!el?.closest("[data-no-translate]");
}

function translateNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement;
    if (parent && (SKIP_TAGS.has(parent.tagName) || isProtected(parent))) return;
    const next = lookup(node.nodeValue ?? "");
    if (next && next !== node.nodeValue) node.nodeValue = next;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  if (SKIP_TAGS.has(el.tagName) || isProtected(el)) return;



  for (const attr of ATTRS) {
    const value = el.getAttribute(attr);
    if (!value) continue;
    const next = lookup(value);
    if (next && next !== value) el.setAttribute(attr, next);
  }

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);
  for (const t of texts) translateNode(t);

  el.querySelectorAll("[placeholder],[title],[aria-label],[alt]").forEach((child) => {
    for (const attr of ATTRS) {
      const value = child.getAttribute(attr);
      if (!value) continue;
      const next = lookup(value);
      if (next && next !== value) child.setAttribute(attr, next);
    }
  });
}

function startArabicTranslation(): () => void {
  translateNode(document.body);
  const observer = new MutationObserver((records) => {
    observer.disconnect();
    for (const record of records) {
      if (record.type === "characterData") translateNode(record.target);
      else if (record.type === "attributes" && record.target.nodeType === Node.ELEMENT_NODE) {
        const el = record.target as Element;
        const attr = record.attributeName!;
        const value = el.getAttribute(attr);
        if (value) {
          const next = lookup(value);
          if (next && next !== value) el.setAttribute(attr, next);
        }
      } else record.addedNodes.forEach(translateNode);
    }
    observe();
  });
  const observe = () =>
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });
  observe();
  return () => observer.disconnect();
}

/* ------------------------------------------------------------------ */

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (fr: string) => string };

const LanguageContext = createContext<Ctx>({ lang: "fr", setLang: () => {}, t: (fr) => fr });

export function useLanguage() {
  return useContext(LanguageContext);
}

/** Langue portée par l'URL (/fr/... ou /ar/...) : source de vérité quand elle existe. */
export function langFromPath(pathname: string): Lang | null {
  const m = /^\/(fr|ar)(\/|$)/.exec(pathname);
  return m ? (m[1] as Lang) : null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const urlLang = langFromPath(pathname);
  const [detected, setDetected] = useState<Lang>("fr");

  // Premier accès : détection automatique. Choix mémorisé : on le respecte.
  useEffect(() => {
    setDetected(resolveInitialLang());
  }, []);

  // Une URL localisée impose sa langue : jamais de redirection, jamais d'écrasement
  // par le navigateur ou par un choix mémorisé (exigence SEO multilingue).
  const lang = urlLang ?? detected;

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang === "ar" ? "ar-MA" : "fr-MA";
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    if (lang !== "ar") return;
    return startArabicTranslation();
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* stockage indisponible */
    }
    // Rechargement : garantit un rendu propre dans la nouvelle langue.
    window.location.reload();
  }, []);

  const t = useCallback((fr: string) => (lang === "ar" ? (AR[fr] ?? fr) : fr), [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  /** Sur une URL localisée (/fr/... ou /ar/...), on propose un vrai lien vers la page équivalente. */
  const hrefFor = (code: Lang) => {
    const m = /^\/(fr|ar)(\/.*)?$/.exec(pathname);
    if (!m) return null;
    return `/${code}${m[2] ?? ""}`;
  };

  return (
    <div
      className={`inline-flex items-center rounded-full border border-border p-0.5 text-xs font-bold ${className}`}
      role="group"
      aria-label="Langue"
    >
      {(["fr", "ar"] as Lang[]).map((code) => {
        const cls = `rounded-full px-2.5 py-1 transition ${
          lang === code
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-primary"
        }`;
        const href = hrefFor(code);
        if (href) {
          return (
            <a
              key={code}
              href={href}
              hrefLang={code === "fr" ? "fr-MA" : "ar-MA"}
              aria-current={lang === code ? "true" : undefined}
              onClick={() => {
                try {
                  window.localStorage.setItem(STORAGE_KEY, code);
                } catch {
                  /* stockage indisponible */
                }
              }}
              className={cls}
            >
              {code === "fr" ? "FR" : "ع"}
            </a>
          );
        }
        return (
          <button
            key={code}
            type="button"
            onClick={() => code !== lang && setLang(code)}
            aria-pressed={lang === code}
            className={cls}
          >
            {code === "fr" ? "FR" : "ع"}
          </button>
        );
      })}
    </div>
  );
}

