import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, X, Copy, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { nextReward, reviewLink, whatsappShareUrl } from "@/lib/reviews";

/**
 * Notification flottante permanente de l'espace professeur : affichée en pastille
 * discrète (icône seule) et dépliable au clic pour copier/partager le lien d'avis.
 */
export function ReviewFloatingNudge({
  professionalId,
  proName,
  token,
  reviewCount,
}: {
  professionalId: string;
  proName: string;
  token: string;
  reviewCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(reviewCount);
  const [link, setLink] = useState("");

  useEffect(() => setCount(reviewCount), [reviewCount]);
  useEffect(() => setLink(reviewLink(token)), [token]);

  useEffect(() => {
    const channel = supabase
      .channel(`reviews-${professionalId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
          filter: `professional_id=eq.${professionalId}`,
        },
        () => {
          setCount((c) => c + 1);
          toast.success("Nouvel avis reçu sur votre profil 🎉");
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [professionalId]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Lien d'avis copié !");
    } catch {
      toast.error("Copie impossible, sélectionnez le lien manuellement.");
    }
  };

  const next = nextReward(count);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Obtenez plus d'avis"
        className="fixed bottom-4 right-4 z-50 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-2xl ring-4 ring-primary/20 transition-transform hover:scale-105 md:size-14"
      >
        <span className="absolute inline-flex size-12 animate-ping rounded-full bg-primary/40 md:size-14" />
        <Star className="relative size-6 fill-current md:size-7" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-card px-1.5 py-0.5 text-[10px] font-bold text-primary shadow">
            {count}
          </span>
        )}
      </button>
    );
  }

  return (
    <aside className="fixed bottom-4 right-4 z-50 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-primary/40 bg-card p-3 shadow-2xl">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-primary">
          <Star className="size-4" aria-hidden /> Obtenez plus d'avis
        </p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Fermer">
          <X className="size-4 text-muted-foreground" />
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Les avis de vos élèves renforcent votre visibilité et vous font gagner des avantages
        ProFinder. Partagez votre lien après chaque cours.
      </p>
      <p className="mt-2 text-xs font-semibold">
        {count} avis obtenu{count > 1 ? "s" : ""}
        {next && ` · ${count}/${next.count} pour « ${next.title} »`}
      </p>
      <input
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-3 w-full rounded-xl border border-border bg-muted px-3 py-2 text-xs"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
        >
          <Copy className="size-3.5" /> Copier
        </button>
        <a
          href={whatsappShareUrl(link, proName)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-bold"
        >
          <Share2 className="size-3.5" /> WhatsApp
        </a>
      </div>
    </aside>
  );
}

/**
 * Enveloppe autonome : récupère le profil professeur connecté et affiche
 * la pastille d'avis sur toutes les pages de l'espace professeur.
 */
export function ProReviewNudge() {
  const { user } = useAuth();
  const pro = useQuery({
    queryKey: ["nudge-pro", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("professionals")
        .select("id, display_name, review_token, rating_count")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  if (!pro.data?.review_token) return null;
  return (
    <ReviewFloatingNudge
      professionalId={pro.data.id}
      proName={pro.data.display_name}
      token={pro.data.review_token}
      reviewCount={pro.data.rating_count ?? 0}
    />
  );
}
