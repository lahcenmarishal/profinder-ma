import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { SiteFooter, SiteHeader } from "@/components/site";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/avis/$token")({
  head: () => ({
    meta: [
      { title: "Laisser un avis à votre professeur — ProFinder" },
      {
        name: "description",
        content:
          "Partagez votre expérience de cours en quelques secondes : note, commentaire, sans création de compte.",
      },
      { property: "og:title", content: "Laisser un avis à votre professeur — ProFinder" },
      {
        property: "og:description",
        content: "Votre avis aide les familles à choisir le bon professeur sur ProFinder.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicReview,
  errorComponent: () => (
    <div className="p-10 text-center text-muted-foreground">Lien d'avis indisponible.</div>
  ),
});

const schema = z.object({
  author_name: z
    .string()
    .trim()
    .min(2, "Indiquez votre nom et prénom")
    .max(80, "Nom trop long"),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000, "Commentaire trop long").optional(),
});

function PublicReview() {
  const { token } = Route.useParams();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pro = useQuery({
    queryKey: ["review-target", token],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("professionals")
        .select("id, display_name, photo_url")
        .eq("review_token", token)
        .maybeSingle();
      if (err) throw err;
      return data;
    },
  });

  const submit = async () => {
    setError(null);
    const parsed = schema.safeParse({
      author_name: name,
      rating,
      comment: comment.trim() || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Vérifiez le formulaire");
      return;
    }
    if (!pro.data) return;
    setSaving(true);
    const { error: err } = await supabase.from("reviews").insert({
      professional_id: pro.data.id,
      author_name: parsed.data.author_name,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
      source: "public",
    });
    setSaving(false);
    if (err) {
      setError(
        err.code === "23505"
          ? "Vous avez déjà laissé un avis à ce professeur."
          : "Publication impossible pour le moment.",
      );
      return;
    }
    setDone(true);
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-10">
        {pro.isLoading ? (
          <p className="text-muted-foreground">Chargement…</p>
        ) : !pro.data ? (
          <p className="text-muted-foreground">Ce lien d'avis n'est plus valide.</p>
        ) : done ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <p className="text-4xl">🎉</p>
            <h1 className="mt-3 text-2xl font-extrabold">Merci !</h1>
            <p className="mt-2 text-muted-foreground">
              Votre avis a été publié sur le profil du professeur.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h1 className="text-2xl font-extrabold tracking-tight">
              Votre avis sur {pro.data.display_name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Aucun compte nécessaire. Soyez sincère : votre note libre aide les autres familles.
            </p>

            <label className="mt-6 block text-sm font-semibold" htmlFor="author_name">
              Nom / prénom
            </label>
            <input
              id="author_name"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
              placeholder="Ex. Salma B."
            />

            <p className="mt-5 text-sm font-semibold">Note</p>
            <div className="mt-1 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                  onClick={() => setRating(n)}
                  className={`text-3xl transition-opacity ${n <= rating ? "opacity-100" : "opacity-30"}`}
                >
                  ⭐
                </button>
              ))}
            </div>

            <label className="mt-5 block text-sm font-semibold" htmlFor="comment">
              Commentaire
            </label>
            <textarea
              id="comment"
              value={comment}
              maxLength={1000}
              rows={4}
              onChange={(e) => setComment(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
              placeholder="Comment se sont passés les cours ?"
            />

            {error && <p className="mt-3 text-sm font-semibold text-destructive">{error}</p>}

            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="mt-5 w-full rounded-xl bg-primary px-6 py-3 text-base font-extrabold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Publication…" : "Publier mon avis"}
            </button>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
