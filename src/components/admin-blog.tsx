import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPosts, formatPostDate, slugify, type BlogPost } from "@/lib/blog";

type Draft = {
  lang: "fr" | "ar";
  translation_key: string;
  slug: string;
  title: string;
  meta_description: string;
  excerpt: string;
  cover_image: string;
  cover_alt: string;
  content: string;
  published: boolean;
};

const EMPTY: Draft = {
  lang: "fr",
  translation_key: "",
  slug: "",
  title: "",
  meta_description: "",
  excerpt: "",
  cover_image: "",
  cover_alt: "",
  content: "",
  published: true,
};

export function AdminBlog() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [open, setOpen] = useState(false);

  const posts = useQuery({ queryKey: ["admin-blog"], queryFn: fetchAllPosts });

  const reset = () => {
    setDraft(EMPTY);
    setEditing(null);
    setOpen(false);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...draft,
        slug: draft.slug ? slugify(draft.slug) : slugify(draft.title),
        cover_image: draft.cover_image || null,
        cover_alt: draft.cover_alt || null,
        translation_key: draft.translation_key || null,
      };
      if (!payload.title || !payload.slug) throw new Error("Titre et slug obligatoires.");
      const { error } = editing
        ? await supabase.from("blog_posts").update(payload).eq("id", editing)
        : await supabase.from("blog_posts").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editing ? "Article mis à jour." : "Article publié.");
      qc.invalidateQueries({ queryKey: ["admin-blog"] });
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = async (post: BlogPost) => {
    const { error } = await supabase.from("blog_posts").delete().eq("id", post.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Article supprimé.");
    qc.invalidateQueries({ queryKey: ["admin-blog"] });
  };

  const edit = (post: BlogPost) => {
    setEditing(post.id);
    setOpen(true);
    setDraft({
      lang: post.lang,
      translation_key: post.translation_key ?? "",
      slug: post.slug,
      title: post.title,
      meta_description: post.meta_description,
      excerpt: post.excerpt,
      cover_image: post.cover_image ?? "",
      cover_alt: post.cover_alt ?? "",
      content: post.content,
      published: post.published,
    });
  };

  const field = "mt-1 w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm";

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Blog</h2>
        <div className="flex gap-2">
          <Link to="/fr/blog" className="rounded-lg border border-border px-3 py-2 text-xs font-bold">
            Voir le blog
          </Link>
          <button
            onClick={() => (open ? reset() : setOpen(true))}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            {open ? "Annuler" : "Nouvel article"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Langue
              <select
                value={draft.lang}
                onChange={(e) => setDraft({ ...draft, lang: e.target.value as "fr" | "ar" })}
                className={field}
              >
                <option value="fr">Français (/fr/blog)</option>
                <option value="ar">العربية (/ar/blog)</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Clé de traduction (même valeur pour FR et AR → hreflang)
              <input
                value={draft.translation_key}
                onChange={(e) => setDraft({ ...draft, translation_key: e.target.value })}
                className={field}
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Titre (H1)
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className={field}
            />
          </label>
          <label className="block text-sm font-medium">
            Slug (URL /blog/…)
            <input
              value={draft.slug}
              placeholder={slugify(draft.title)}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              className={field}
            />
          </label>
          <label className="block text-sm font-medium">
            Meta description (≤ 160 caractères)
            <input
              value={draft.meta_description}
              maxLength={200}
              onChange={(e) => setDraft({ ...draft, meta_description: e.target.value })}
              className={field}
            />
          </label>
          <label className="block text-sm font-medium">
            Chapô (résumé affiché dans la liste)
            <textarea
              value={draft.excerpt}
              rows={2}
              onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
              className={field}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Image de couverture (URL ou /images/blog/…)
              <input
                value={draft.cover_image}
                onChange={(e) => setDraft({ ...draft, cover_image: e.target.value })}
                className={field}
              />
            </label>
            <label className="block text-sm font-medium">
              Texte alternatif de l'image
              <input
                value={draft.cover_alt}
                onChange={(e) => setDraft({ ...draft, cover_alt: e.target.value })}
                className={field}
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Contenu (Markdown simplifié : ## titre, ### sous-titre, - liste, **gras**)
            <textarea
              value={draft.content}
              rows={14}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              className={`${field} font-mono`}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
            />
            Publié
          </label>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {editing ? "Enregistrer" : "Publier l'article"}
          </button>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {(posts.data ?? []).map((post) => (
          <div
            key={post.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div>
              <p className="font-semibold">{post.title}</p>
              <p className="text-xs text-muted-foreground">
                /{post.lang}/blog/{post.slug} · {formatPostDate(post.published_at, post.lang)} ·{" "}
                {post.published ? "publié" : "brouillon"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => edit(post)}
                className="rounded-lg border border-border px-3 py-2 text-xs font-bold"
              >
                Modifier
              </button>
              <button
                onClick={() => remove(post)}
                className="rounded-lg bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
        {(posts.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun article.</p>
        )}
      </div>
    </section>
  );
}
