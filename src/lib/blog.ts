import { supabase } from "@/integrations/supabase/client";

export const SITE_URL = "https://profinder.ma";

export type BlogLang = "fr" | "ar";

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  meta_description: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  cover_alt: string | null;
  published: boolean;
  published_at: string;
  lang: BlogLang;
  translation_key: string | null;
};

const COLUMNS =
  "id, slug, title, meta_description, excerpt, content, cover_image, cover_alt, published, published_at, lang, translation_key";

export async function fetchPublishedPosts(lang: BlogLang): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(COLUMNS)
    .eq("published", true)
    .eq("lang", lang)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BlogPost[];
}

export async function fetchAllPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(COLUMNS)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BlogPost[];
}

export async function fetchPostBySlug(lang: BlogLang, slug: string): Promise<BlogPost | null> {
  const { data } = await supabase
    .from("blog_posts")
    .select(COLUMNS)
    .eq("slug", slug)
    .eq("lang", lang)
    .eq("published", true)
    .maybeSingle();
  return (data as BlogPost | null) ?? null;
}

/** Slug de l'article équivalent dans l'autre langue (pour hreflang). */
export async function fetchAlternateSlug(
  translationKey: string | null,
  otherLang: BlogLang,
): Promise<string | null> {
  if (!translationKey) return null;
  const { data } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("translation_key", translationKey)
    .eq("lang", otherLang)
    .eq("published", true)
    .maybeSingle();
  return (data as { slug: string } | null)?.slug ?? null;
}

export function formatPostDate(value: string, lang: BlogLang) {
  return new Date(value).toLocaleDateString(lang === "ar" ? "ar-MA" : "fr-MA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function readingMinutes(content: string) {
  return Math.max(1, Math.round(content.split(/\s+/).length / 220));
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Blocs issus du contenu Markdown simplifié (## / ### / listes / paragraphes). */
export type Block =
  | { kind: "h2" | "h3" | "p"; text: string }
  | { kind: "ul" | "ol"; items: string[] };

export function parseContent(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let list: { kind: "ul" | "ol"; items: string[] } | null = null;

  const flush = () => {
    if (list) blocks.push(list);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("### ")) {
      flush();
      blocks.push({ kind: "h3", text: line.slice(4) });
    } else if (line.startsWith("## ")) {
      flush();
      blocks.push({ kind: "h2", text: line.slice(3) });
    } else if (/^[-*]\s+/.test(line)) {
      if (!list || list.kind !== "ul") {
        flush();
        list = { kind: "ul", items: [] };
      }
      list.items.push(line.replace(/^[-*]\s+/, ""));
    } else if (/^\d+[.)]\s+/.test(line)) {
      if (!list || list.kind !== "ol") {
        flush();
        list = { kind: "ol", items: [] };
      }
      list.items.push(line.replace(/^\d+[.)]\s+/, ""));
    } else {
      flush();
      blocks.push({ kind: "p", text: line });
    }
  }
  flush();
  return blocks;
}

/** Libellés localisés (rédigés, pas traduits automatiquement). */
export const BLOG_COPY = {
  fr: {
    kicker: "Blog",
    indexTitle: "Blog ProFinder — Conseils cours particuliers et soutien scolaire au Maroc",
    indexDescription:
      "Guides pratiques pour les parents et les élèves : choisir un professeur particulier, tarifs des cours au Maroc, préparation du Bac et soutien scolaire à Agadir.",
    indexH1: "Conseils pour bien choisir un professeur particulier",
    indexIntro:
      "Guides pratiques pour les parents et les élèves au Maroc : tarifs, méthode, préparation des examens et solutions de soutien scolaire.",
    blogName: "Blog ProFinder",
    read: "Lire l'article →",
    empty: "Aucun article publié pour le moment.",
    minutes: "min de lecture",
    publishedOn: "Publié le",
    home: "Accueil",
    notFound: "Article introuvable",
    backToBlog: "Retour au blog",
    alsoRead: "À lire aussi",
    ctaTitle: "Trouvez votre professeur sur ProFinder",
    ctaText:
      "Publiez votre demande gratuitement : matière, niveau, ville et budget. Les professeurs disponibles vous répondent directement.",
    ctaIndexTitle: "Besoin d'un professeur particulier ?",
    ctaIndexText:
      "Décrivez votre besoin en deux minutes et recevez des propositions de professeurs près de chez vous.",
    ctaRequest: "Déposer une demande",
    ctaBrowse: "Parcourir les professeurs",
    ctaBecome: "Devenir professeur",
    switch: "العربية",
  },
  ar: {
    kicker: "المدونة",
    indexTitle: "مدونة بروفايندر — نصائح حول الدروس الخصوصية والدعم المدرسي بالمغرب",
    indexDescription:
      "أدلة عملية لأولياء الأمور والتلاميذ: اختيار أستاذ خصوصي، أسعار الدروس بالمغرب، الاستعداد للباكالوريا والدعم المدرسي بأكادير.",
    indexH1: "نصائح لاختيار الأستاذ الخصوصي المناسب",
    indexIntro:
      "أدلة عملية لأولياء الأمور والتلاميذ بالمغرب: الأسعار، المنهجية، الاستعداد للامتحانات وحلول الدعم المدرسي.",
    blogName: "مدونة بروفايندر",
    read: "اقرأ المقال ←",
    empty: "لا توجد مقالات منشورة حالياً.",
    minutes: "دقائق قراءة",
    publishedOn: "نُشر في",
    home: "الرئيسية",
    notFound: "المقال غير موجود",
    backToBlog: "العودة إلى المدونة",
    alsoRead: "اقرأ أيضاً",
    ctaTitle: "اعثر على أستاذك عبر بروفايندر",
    ctaText:
      "انشر طلبك مجاناً: المادة، المستوى، المدينة والميزانية. الأساتذة المتوفرون يتواصلون معك مباشرة.",
    ctaIndexTitle: "هل تحتاج إلى أستاذ خصوصي؟",
    ctaIndexText: "صف حاجتك في دقيقتين واستقبل عروضاً من أساتذة قريبين منك.",
    ctaRequest: "نشر طلب",
    ctaBrowse: "تصفح الأساتذة",
    ctaBecome: "كن أستاذاً",
    switch: "Français",
  },
} as const;
