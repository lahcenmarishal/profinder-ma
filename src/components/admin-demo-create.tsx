import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { flexibleSlots, type Slot } from "@/lib/marketplace";
import { AvailabilityPicker } from "@/components/availability-picker";

/**
 * Création rapide de données de démonstration depuis la console d'administration :
 * une fiche professeur ou une demande d'élève, marquées « Démo » et supprimables
 * à tout moment depuis les listes ci-dessus.
 */

const inputClass =
  "mt-1 w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

function useReference() {
  return useQuery({
    queryKey: ["admin-demo-reference"],
    queryFn: async () => {
      const [cats, cities, levels, services] = await Promise.all([
        supabase.from("categories").select("id, name").order("sort"),
        supabase
          .from("cities")
          .select("id, name, lat, lng")
          .eq("is_active", true)
          .order("name")
          .limit(500),
        supabase.from("levels").select("id, name, sort").eq("is_active", true).order("sort"),
        supabase
          .from("services")
          .select("id, name, level_id")
          .eq("is_active", true)
          .order("sort")
          .limit(2000),
      ]);
      return {
        categories: cats.data ?? [],
        cities: cities.data ?? [],
        levels: levels.data ?? [],
        services: services.data ?? [],
      };
    },
  });
}

export function AdminDemoCreate() {
  const qc = useQueryClient();
  const reference = useReference();
  const categoryId = reference.data?.categories[0]?.id ?? "";

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold">Créer des données de démonstration</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Les éléments créés ici portent l'étiquette « Démo » et peuvent être supprimés à tout moment.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <DemoProForm categoryId={categoryId} reference={reference.data} qc={qc} />
        <DemoRequestForm categoryId={categoryId} reference={reference.data} qc={qc} />
      </div>
    </section>
  );
}

type Reference = ReturnType<typeof useReference>["data"];
type QC = ReturnType<typeof useQueryClient>;

function DemoProForm({
  categoryId,
  reference,
  qc,
}: {
  categoryId: string;
  reference: Reference;
  qc: QC;
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [levels, setLevels] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Slot[]>(flexibleSlots());
  const [rate, setRate] = useState(150);
  const [years, setYears] = useState(5);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState("");
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  // Photo envoyée depuis l'ordinateur : stockée dans le dossier de l'admin,
  // puis référencée par un lien signé longue durée.
  const uploadPhoto = async (file: File) => {
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
    setUploading(true);
    const path = `${user.id}/demo-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (up.error) {
      setUploading(false);
      toast.error(up.error.message);
      return;
    }
    const signed = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    setUploading(false);
    if (!signed.data?.signedUrl) {
      toast.error("Lien de la photo indisponible.");
      return;
    }
    setPhoto(signed.data.signedUrl);
    toast.success("Photo ajoutée.");
  };

  const services = useMemo(
    () =>
      (reference?.services ?? []).filter(
        (s) => levels.length === 0 || levels.includes(s.level_id ?? ""),
      ),
    [reference, levels],
  );

  const submit = async () => {
    if (!name.trim() || !categoryId) {
      toast.error("Indiquez au moins un nom.");
      return;
    }
    if (picked.length === 0) {
      toast.error("Choisissez au moins une matière.");
      return;
    }
    setSaving(true);
    const chosenCity = (reference?.cities ?? []).find((c) => c.id === city);
    const { data, error } = await supabase
      .from("professionals")
      .insert({
        category_id: categoryId,
        display_name: name.trim(),
        city_id: city || null,
        // Coordonnées de la ville : nécessaires pour la distance et la recherche par carte.
        lat: chosenCity?.lat ?? null,
        lng: chosenCity?.lng ?? null,
        radius_km: 15,
        hourly_rate: rate,
        experience_years: years,
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        photo_url: photo.trim() || null,
        rating_avg: ratingCount > 0 ? ratingAvg : 0,
        rating_count: ratingCount,
        languages: ["fr", "ar"],
        mode_home: true,
        mode_online: true,
        status: "active",
        is_demo: true,
        is_verified: true,
        verification_status: "verified",
        onboarding_completed: true,
        onboarding_step: 5,
      })
      .select("id")
      .single();
    if (error || !data) {
      setSaving(false);
      toast.error(error?.message ?? "Création impossible.");
      return;
    }
    // Niveaux : celui choisi + ceux des matières sélectionnées, pour que la fiche
    // remonte sur les pages niveau / matière comme un professeur ordinaire.
    const levelIds = Array.from(
      new Set(
        [
          ...levels,
          ...(reference?.services ?? [])
            .filter((s) => picked.includes(s.id))
            .map((s) => s.level_id ?? ""),
        ].filter(Boolean),
      ),
    ) as string[];
    const levelResult =
      levelIds.length > 0
        ? await supabase
        .from("professional_levels")
        .insert(levelIds.map((level_id) => ({ professional_id: data.id, level_id })))
        : { error: null };
    const serviceResult = await supabase
        .from("professional_services")
        .insert(picked.map((service_id) => ({ professional_id: data.id, service_id })));
    // Disponibilité choisie (par défaut « Flexible »), sinon la fiche est écartée
    // des filtres horaires du site.
    const slots = availability.length > 0 ? availability : flexibleSlots();
    const availabilityResult = await supabase
      .from("professional_availability")
      .insert(slots.map((s) => ({ professional_id: data.id, ...s })));
    const relationError =
      levelResult.error ?? serviceResult.error ?? availabilityResult.error;
    if (relationError) {
      await supabase.from("professionals").delete().eq("id", data.id);
      setSaving(false);
      toast.error(`Création annulée : ${relationError.message}`);
      return;
    }
    setSaving(false);
    toast.success("Professeur de démonstration créé.");
    setName("");
    setHeadline("");
    setBio("");
    setPhoto("");
    setRatingAvg(0);
    setRatingCount(0);
    setPicked([]);
    setAvailability(flexibleSlots());
    qc.invalidateQueries({ queryKey: ["admin-pros"] });
    qc.invalidateQueries({ queryKey: ["professionals"] });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="font-bold">Professeur démo</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Nom affiché
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </label>
        <label className={labelClass}>
          Ville
          <select value={city} onChange={(e) => setCity(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {(reference?.cities ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className={`${labelClass} sm:col-span-2`}>
          Niveaux (un ou plusieurs)
          <div className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-xl border border-border bg-muted p-2">
            {(reference?.levels ?? []).map((l) => {
              const active = levels.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setLevels((p) =>
                      p.includes(l.id) ? p.filter((x) => x !== l.id) : [...p, l.id],
                    )
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold normal-case transition ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {l.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className={`${labelClass} sm:col-span-2`}>
          Matières (une ou plusieurs)
          <div className="mt-2 flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-xl border border-border bg-muted p-2">
            {services.length === 0 && (
              <span className="text-xs normal-case text-muted-foreground">
                Choisissez d'abord un niveau.
              </span>
            )}
            {services.map((s) => {
              const active = picked.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setPicked((p) =>
                      p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id],
                    )
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold normal-case transition ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="sm:col-span-2">
          <AvailabilityPicker
            value={availability}
            onChange={setAvailability}
            label="Disponibilité du professeur"
          />
        </div>
        <label className={labelClass}>
          Tarif (DH/h)
          <input
            type="number"
            min={0}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Expérience (ans)
          <input
            type="number"
            min={0}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className={inputClass}
          />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Accroche
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Présentation
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Note (0 à 5)
          <input
            type="number"
            min={0}
            max={5}
            step={0.1}
            value={ratingAvg}
            onChange={(e) => setRatingAvg(Math.min(5, Math.max(0, Number(e.target.value))))}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Nombre d'avis
          <input
            type="number"
            min={0}
            value={ratingCount}
            onChange={(e) => setRatingCount(Math.max(0, Number(e.target.value)))}
            className={inputClass}
          />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Photo (depuis votre ordinateur)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadPhoto(file);
            }}
            className={inputClass}
          />
        </label>
        {photo && (
          <div className="flex items-center gap-3 sm:col-span-2">
            <img
              src={photo}
              alt="Aperçu de la photo"
              className="h-16 w-16 rounded-full object-cover"
            />
            <button
              type="button"
              onClick={() => setPhoto("")}
              className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground"
            >
              Retirer la photo
            </button>
          </div>
        )}
        <label className={`${labelClass} sm:col-span-2`}>
          Ou adresse d'une photo en ligne (facultatif)
          <input value={photo} onChange={(e) => setPhoto(e.target.value)} className={inputClass} />
        </label>
      </div>
      <button
        onClick={submit}
        disabled={saving}
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
      >
        {saving ? "Création…" : "Créer le professeur démo"}
      </button>
    </div>
  );
}

function DemoRequestForm({
  categoryId,
  reference,
  qc,
}: {
  categoryId: string;
  reference: Reference;
  qc: QC;
}) {
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [level, setLevel] = useState("");
  const [service, setService] = useState("");
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState(100);
  const [budgetMax, setBudgetMax] = useState(200);
  const [mode, setMode] = useState<"home" | "online" | "studio">("home");
  const [saving, setSaving] = useState(false);

  const services = useMemo(
    () => (reference?.services ?? []).filter((s) => !level || s.level_id === level),
    [reference, level],
  );

  const submit = async () => {
    if (!categoryId) return;
    setSaving(true);
    const chosenCity = (reference?.cities ?? []).find((c) => c.id === city);
    const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    const { error } = await supabase.from("requests").insert({
      category_id: categoryId,
      client_id: null,
      city_id: city || null,
      level_id: level || null,
      service_id: service || null,
      area: area.trim() || null,
      description: description.trim() || null,
      budget_min: budgetMin,
      budget_max: budgetMax,
      lat: chosenCity?.lat ?? null,
      lng: chosenCity?.lng ?? null,
      mode,
      // Disponibilité souple pour que la demande ressorte dans tous les filtres.
      slots: flexibleSlots(),
      status: "active",
      target_professional_id: null,
      expires_at: expires,
      is_demo: true,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Demande de démonstration créée.");
    setArea("");
    setDescription("");
    qc.invalidateQueries({ queryKey: ["admin-requests"] });
    qc.invalidateQueries({ queryKey: ["recent-requests"] });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="font-bold">Demande démo</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Ville
          <select value={city} onChange={(e) => setCity(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {(reference?.cities ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Quartier
          <input value={area} onChange={(e) => setArea(e.target.value)} className={inputClass} />
        </label>
        <label className={labelClass}>
          Niveau
          <select
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setService("");
            }}
            className={inputClass}
          >
            <option value="">—</option>
            {(reference?.levels ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Matière
          <select value={service} onChange={(e) => setService(e.target.value)} className={inputClass}>
            <option value="">—</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Budget min (DH/h)
          <input
            type="number"
            min={0}
            value={budgetMin}
            onChange={(e) => setBudgetMin(Number(e.target.value))}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Budget max (DH/h)
          <input
            type="number"
            min={0}
            value={budgetMax}
            onChange={(e) => setBudgetMax(Number(e.target.value))}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Format
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "home" | "online" | "studio")}
            className={inputClass}
          >
            <option value="home">À domicile</option>
            <option value="online">En ligne</option>
            <option value="studio">Chez le professeur</option>
          </select>
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Description
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <button
        onClick={submit}
        disabled={saving}
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
      >
        {saving ? "Création…" : "Créer la demande démo"}
      </button>
    </div>
  );
}
