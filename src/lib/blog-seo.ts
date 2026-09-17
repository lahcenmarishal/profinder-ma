/**
 * SEO du blog — simple adaptateur vers le système centralisé (`@/lib/seo`).
 * Aucune balise n'est construite ici : titres, canonical, hreflang, Open Graph
 * et JSON-LD viennent du moteur commun.
 */
import { BLOG_COPY, SITE_URL, type BlogLang, type BlogPost } from "@/lib/blog";
import { seoNotFoundHead, seoRouteHead } from "@/lib/seo";

export const other = (lang: BlogLang): BlogLang => (lang === "fr" ? "ar" : "fr");

export function blogIndexHead(lang: BlogLang) {
  const c = BLOG_COPY[lang];
  return seoRouteHead({
    type: "blog",
    lang,
    title: c.indexTitle,
    description: c.indexDescription,
    h1: c.blogName,
    intro: c.indexDescription,
  });
}

export function blogArticleHead(
  lang: BlogLang,
  slug: string,
  post: BlogPost | null,
  alternateSlug: string | null,
) {
  if (!post) return seoNotFoundHead(lang, `/blog/${slug}`, "article");
  const image = post.cover_image
    ? post.cover_image.startsWith("http")
      ? post.cover_image
      : `${SITE_URL}${post.cover_image}`
    : null;
  return seoRouteHead({
    type: "article",
    lang,
    index: post.published,
    article: {
      slug,
      title: post.title,
      description: post.meta_description,
      image,
      publishedAt: post.published_at,
      alternateSlug,
    },
    ...(post.cover_alt ? { imageAlt: post.cover_alt } : {}),
  });
}
