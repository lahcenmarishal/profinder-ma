import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { REVIEW_REWARDS, nextReward, reviewLink, whatsappShareUrl } from "@/lib/reviews";

export function ReviewInvite({
  proName,
  token,
  reviewCount,
}: {
  proName: string;
  token: string;
  reviewCount: number;
}) {
  const [link, setLink] = useState<string | null>(null);
  const next = nextReward(reviewCount);

  const generate = () => setLink(reviewLink(token));

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Lien copié !");
    } catch {
      toast.error("Copie impossible, sélectionnez le lien manuellement.");
    }
  };

  return (
    <section className="mt-8 rounded-3xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <Star className="size-5 text-primary" /> Obtenez plus d'avis
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Invitez vos élèves à laisser un avis et gagnez des avantages ProFinder.
      </p>

      {!link ? (
        <button
          type="button"
          onClick={generate}
          className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
        >
          Inviter un élève à laisser un avis
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copy()}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              Copier le lien
            </button>
            <a
              href={whatsappShareUrl(link, proName)}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-border px-5 py-2 text-sm font-bold hover:bg-muted"
            >
              Partager sur WhatsApp
            </a>
          </div>
        </div>
      )}

      <div className="mt-6">
        <p className="text-sm font-semibold">
          {reviewCount} avis obtenu{reviewCount > 1 ? "s" : ""}
        </p>
        {next && (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              {reviewCount} / {next.count} avis pour obtenir : {next.title}
            </p>
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, (reviewCount / next.count) * 100)}%` }}
              />
            </div>
          </>
        )}
        <ul className="mt-4 space-y-2 text-sm">
          {REVIEW_REWARDS.map((r) => {
            const unlocked = reviewCount >= r.count;
            return (
              <li
                key={r.count}
                className={`rounded-xl px-4 py-3 ${unlocked ? "bg-primary/10 text-foreground" : "bg-muted text-muted-foreground"}`}
              >
                <span className="font-bold">⭐ {r.count} avis obtenus</span> → {r.description}
                {unlocked && <span className="ml-2 font-bold text-primary">Débloqué</span>}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Les récompenses dépendent uniquement du nombre d'avis reçus, jamais de la note. Ne
          demandez jamais à un élève de vous donner 5 étoiles en échange d'un avantage.
        </p>
      </div>
    </section>
  );
}
