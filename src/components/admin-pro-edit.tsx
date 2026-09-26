import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AvailabilityPicker } from "@/components/availability-picker";
import { SERVICES } from "@/lib/catalog";
import type { Slot } from "@/lib/marketplace";

/**
 * Réglages rapides d'une fiche professeur depuis l'administration :
 * photo envoyée depuis l'ordinateur, note affichée et nombre d'avis.
 */
export function AdminProEdit({
  id,
  photoUrl,
  ratingAvg,
  ratingCount,
  serviceIds,
  availability,
  gender,
}: {
  id: string;
  photoUrl: string | null;
  ratingAvg: number | string | null;
  ratingCount: number | null;
  serviceIds: string[];
  availability: Slot[];
  gender: string | null;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [photo, setPhoto] = useState(photoUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [subjects, setSubjects] = useState(serviceIds);
  const [slots, setSlots] = useState(availability);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-pros"] });
    qc.invalidateQueries({ queryKey: ["professionals"] });
  };

  const save = async (patch: {
    photo_url?: string;
    rating_avg?: number;
    rating_count?: number;
    gender?: "female" | "male" | null;
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

  const saveTeachingDetails = async () => {
    if (subjects.length === 0) {
      toast.error("Choisissez au moins une matière.");
      return;
    }
    setBusy(true);
    const deleteServices = await supabase
      .from("professional_services")
      .delete()
      .eq("professional_id", id);
    if (deleteServices.error) {
      setBusy(false);
      toast.error(deleteServices.error.message);
      return;
    }
    const insertServices = await supabase
      .from("professional_services")
      .insert(subjects.map((service_id) => ({ professional_id: id, service_id })));
    if (insertServices.error) {
      setBusy(false);
      toast.error(insertServices.error.message);
      return;
    }
    const deleteAvailability = await supabase
      .from("professional_availability")
      .delete()
      .eq("professional_id", id);
    if (deleteAvailability.error) {
      setBusy(false);
      toast.error(deleteAvailability.error.message);
      return;
    }
    if (slots.length > 0) {
      const insertAvailability = await supabase
        .from("professional_availability")
        .insert(slots.map((slot) => ({ professional_id: id, ...slot })));
      if (insertAvailability.error) {
        setBusy(false);
        toast.error(insertAvailability.error.message);
        return;
      }
    }
    setBusy(false);
    toast.success("Matières et disponibilité enregistrées.");
    refresh();
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
        Portrait sans photo
        <select
          value={gender ?? ""}
          onChange={(e) => void save({ gender: e.target.value === "" ? null : e.target.value as "female" | "male" })}
          className="mt-1 block w-28 rounded-lg border border-border bg-muted px-2 py-1.5 text-sm text-foreground"
        >
          <option value="">Neutre</option>
          <option value="female">Femme</option>
          <option value="male">Homme</option>
        </select>
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
      <div className="w-full border-t border-border pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Matières
        </p>
        <div className="mt-2 flex max-h-36 flex-wrap gap-2 overflow-y-auto">
          {SERVICES.filter((service) => service.is_active).map((service) => {
            const active = subjects.includes(service.id);
            return (
              <button
                key={service.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setSubjects((current) =>
                    active ? current.filter((value) => value !== service.id) : [...current, service.id],
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {service.name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="w-full">
        <AvailabilityPicker
          value={slots}
          onChange={setSlots}
          label="Disponibilité du professeur"
        />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void saveTeachingDetails()}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        Enregistrer matières et disponibilité
      </button>
    </div>
  );
}
