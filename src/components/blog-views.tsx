import { Link } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site";
import {
  BLOG_COPY,
  formatPostDate,
  parseContent,
  readingMinutes,
  type BlogLang,
  type BlogPost,
} from "@/lib/blog";

function PostLink({
  lang,
  slug,
  className,
  children,
}: {
  lang: BlogLang;
  slug: string;
  className?: string;
  children: React.ReactNode;
}) {
  return lang === "fr" ? (
    <Link to="/fr/blog/$slug" params={{ slug }} className={className}>
      {children}
    </Link>
  ) : (
    <Link to="/ar/blog/$slug" params={{ slug }} className={className}>
      {children}
    </Link>
  );
}

function BlogHomeLink({ lang, className, children }: { lang: BlogLang; className?: string; children: React.ReactNode }) {
  return lang === "fr" ? (
    <Link to="/fr/blog" className={className}>
      {children}
    </Link>
  ) : (
    <Link to="/ar/blog" className={className}>
      {children}
    </Link>
  );
}

function Shell({ lang, children }: { lang: BlogLang; children: React.ReactNode }) {
  return (
    <div
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="min-h-screen bg-background font-sans text-foreground"
    >
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}

export function BlogIndexView({ lang, posts }: { lang: BlogLang; posts: BlogPost[] }) {
  const c = BLOG_COPY[lang];

  return (
    <Shell lang={lang}>
      <main className="mx-auto max-w-5xl px-4 py-14">
        <header className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">{c.kicker}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{c.indexH1}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.indexIntro}</p>
          <p className="mt-4 text-xs font-bold text-primary">
            {lang === "fr" ? (
              <Link to="/ar/blog">{c.switch}</Link>
            ) : (
              <Link to="/fr/blog">{c.switch}</Link>
            )}
          </p>
        </header>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {posts.map((post, index) => (
            <article
              key={post.id}
              className="overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-md"
            >
              <PostLink lang={lang} slug={post.slug} className="block">
                {post.cover_image && (
                  <img
                    src={post.cover_image}
                    alt={post.cover_alt ?? post.title}
                    width={1200}
                    height={630}
                    loading={index === 0 ? "eager" : "lazy"}
                    className="aspect-[1200/630] w-full object-cover"
                  />
                )}
                <div className="p-5">
                  <p className="text-xs text-muted-foreground">
                    {formatPostDate(post.published_at, lang)} · {readingMinutes(post.content)}{" "}
                    {c.minutes}
                  </p>
                  <h2 className="mt-2 text-lg font-bold leading-snug">{post.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
                  <span className="mt-3 inline-block text-sm font-bold text-primary">{c.read}</span>
                </div>
              </PostLink>
            </article>
          ))}
          {posts.length === 0 && <p className="text-sm text-muted-foreground">{c.empty}</p>}
        </div>

        <section className="mt-14 rounded-2xl border border-border bg-primary/5 p-6 text-center">
          <h2 className="text-xl font-bold">{c.ctaIndexTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{c.ctaIndexText}</p>
          <Link
            to="/publier"
            className="mt-4 inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            {c.ctaRequest}
          </Link>
        </section>
      </main>
    </Shell>
  );
}

export function BlogArticleView({
  lang,
  post,
  related,
}: {
  lang: BlogLang;
  post: BlogPost | null;
  related: BlogPost[];
}) {
  const c = BLOG_COPY[lang];

  if (!post)
    return (
      <Shell lang={lang}>
        <main className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">{c.notFound}</h1>
          <BlogHomeLink lang={lang} className="mt-4 inline-block text-sm font-bold text-primary">
            {c.backToBlog}
          </BlogHomeLink>
        </main>
      </Shell>
    );

  const blocks = parseContent(post.content);

  return (
    <Shell lang={lang}>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <nav className="text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            {c.home}
          </Link>
          {" · "}
          <BlogHomeLink lang={lang} className="hover:text-primary">
            {c.kicker}
          </BlogHomeLink>
        </nav>

        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 text-xs text-muted-foreground">
          {c.publishedOn} {formatPostDate(post.published_at, lang)} ·{" "}
          {readingMinutes(post.content)} {c.minutes}
        </p>

        {post.cover_image && (
          <img
            src={post.cover_image}
            alt={post.cover_alt ?? post.title}
            width={1200}
            height={630}
            className="mt-6 aspect-[1200/630] w-full rounded-2xl object-cover"
          />
        )}

        <p className="mt-6 text-base font-medium leading-relaxed text-foreground">{post.excerpt}</p>

        <article className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
          {blocks.map((block, i) => {
            if (block.kind === "h2")
              return (
                <h2 key={i} className="pt-4 text-xl font-bold text-foreground">
                  {block.text}
                </h2>
              );
            if (block.kind === "h3")
              return (
                <h3 key={i} className="pt-2 text-base font-bold text-foreground">
                  {block.text}
                </h3>
              );
            if (block.kind === "ul")
              return (
                <ul key={i} className="list-disc space-y-1 ps-5">
                  {block.items.map((it, j) => (
                    <li key={j}>{renderInline(it)}</li>
                  ))}
                </ul>
              );
            if (block.kind === "ol")
              return (
                <ol key={i} className="list-decimal space-y-1 ps-5">
                  {block.items.map((it, j) => (
                    <li key={j}>{renderInline(it)}</li>
                  ))}
                </ol>
              );
            if (block.kind === "p") return <p key={i}>{renderInline(block.text)}</p>;
            return null;
          })}
        </article>

        <section className="mt-10 rounded-2xl border border-border bg-primary/5 p-6">
          <h2 className="text-lg font-bold text-foreground">{c.ctaTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{c.ctaText}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/publier"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              {c.ctaRequest}
            </Link>
            <Link
              to="/professeurs"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-bold"
            >
              {c.ctaBrowse}
            </Link>
            <Link
              to="/devenir-professeur"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-bold"
            >
              {c.ctaBecome}
            </Link>
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-bold">{c.alsoRead}</h2>
            <ul className="mt-4 space-y-3">
              {related.map((r) => (
                <li key={r.id}>
                  <PostLink
                    lang={lang}
                    slug={r.slug}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {r.title}
                  </PostLink>
                  <p className="text-xs text-muted-foreground">{r.excerpt}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </Shell>
  );
}

/** Gère uniquement le gras **texte**. */
function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
