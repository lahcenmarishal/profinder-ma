import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Réglages rapides d'une fiche professeur depuis l'administration :
 * photo envoyée depuis l'ordinateur, note affichée et nombre d'avis.
 */
export function AdminProEdit({
  id,
  photoUrl,
  ratingAvg,
  ratingCount,
}: {
  id: string;
  photoUrl: string | null;
  ratingAvg: number | string | null;
  ratingCount: number | null;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [photo, setPhoto] = useState(photoUrl ?? "");
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-pros"] });
    qc.invalidateQueries({ queryKey: ["professionals"] });
  };

  const save = async (patch: {
    photo_url?: string;
    rating_avg?: number;
    rating_count?: number;
  }) => {
    const { error } = await supabase.from("professionals").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Fiche mise à jour.");
    refresh();
    return true;
  };

  const upload = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo trop lourde (max 5 Mo).");
      return;
    }
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
      toast.error("Formats acceptés : JPG, PNG, WEBP.");
      return;
    }
    setBusy(true);
    const path = `${user.id}/pro-${id}-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (up.error) {
      setBusy(false);
      toast.error(up.error.message);
      return;
    }
    const signed = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    const url = signed.data?.signedUrl ?? "";
    setBusy(false);
    if (!url) {
      toast.error("Lien de la photo indisponible.");
      return;
    }
    setPhoto(url);
    await save({ photo_url: url });
  };

  return (
    <div className="mt-3 flex w-full flex-wrap items-end gap-3 border-t border-border pt-3">
      {photo && (
        <img src={photo} alt="" className="h-12 w-12 rounded-full object-cover" />
      )}
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Photo
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
          className="mt-1 block w-56 rounded-lg border border-border bg-muted px-2 py-1 text-xs text-foreground"
        />
      </label>
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Note (0–5)
        <input
          type="number"
          min={0}
          max={5}
          step={0.1}
          defaultValue={Number(ratingAvg ?? 0)}
          onBlur={(e) =>
            save({ rating_avg: Math.min(5, Math.max(0, Number(e.target.value))) })
          }
          className="mt-1 block w-24 rounded-lg border border-border bg-muted px-2 py-1 text-sm text-foreground"
        />
      </label>
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Nombre d'avis
        <input
          type="number"
          min={0}
          defaultValue={Number(ratingCount ?? 0)}
          onBlur={(e) => save({ rating_count: Math.max(0, Number(e.target.value)) })}
          className="mt-1 block w-28 rounded-lg border border-border bg-muted px-2 py-1 text-sm text-foreground"
        />
      </label>
    </div>
  );
}
