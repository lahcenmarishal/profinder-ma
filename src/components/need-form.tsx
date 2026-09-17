import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { AddressPicker, type AddressValue } from "@/components/address-picker";
import { CitySelect } from "@/components/city-select";
import { AvailabilityPicker } from "@/components/availability-picker";
import { cyclesOf, flexibleSlots, type Slot } from "@/lib/marketplace";

type Option = {
  id: string;
  name: string;
  level_id?: string | null;
  specialty_id?: string | null;
  cycle?: string | null;
};


export type NeedValues = {
  service: string;
  level: string;
  city: string;
  mode: "home" | "studio" | "online";
  budget: string;
  budgetMax: string;
  budgetOpen: boolean;
  description: string;
  slots: Slot[];
  address: string;
  lat: string;
  lng: string;
  fullName: string;
  email: string;
  phone: string;
};

export function NeedForm({
  services = [],
  levels = [],
  specialties = [],
  cities,
  initial,
  rateRange,
  extended = false,
  contact = false,
  minimal = false,
  withSlots = false,
  withDescription = false,
  withBudget = false,
  hidePrefilled = false,

  title = "De quoi avez-vous besoin ?",
  submitLabel = "Trouver un professeur",
  onSubmit,
}: {
  services?: Option[];
  levels?: Option[];
  specialties?: Option[];
  cities: Option[];
  initial?: Partial<NeedValues>;
  rateRange?: { min: number; max: number } | undefined;
  /** Formulaire complet de publication : créneaux, budget min/max, description. */
  extended?: boolean;
  /** Ajoute les coordonnées du visiteur (nom, email, téléphone). */
  contact?: boolean;
  /** Formulaire allégé : contact en haut, pas de niveau/classe/matière/budget/créneaux. */
  minimal?: boolean;
  /** Affiche la section disponibilités (créneaux) sans le budget. */
  withSlots?: boolean;
  /** Affiche la zone de description du besoin. */
  withDescription?: boolean;
  /** Affiche le budget maximum souhaité (hors formulaire complet). */
  withBudget?: boolean;
  /** Masque les champs déjà résumés (niveau, matière, type de cours, lieu). */
  hidePrefilled?: boolean;
  title?: string;
  submitLabel?: string;
  onSubmit?: (values: NeedValues) => void;
}) {
  const navigate = useNavigate();
  const min = rateRange?.min ?? 40;
  const max = rateRange?.max ?? 400;
  const [values, setValues] = useState<NeedValues>(() => ({
    service: initial?.service ?? "",
    level: initial?.level ?? "",
    city: initial?.city ?? "",
    mode: initial?.mode ?? "home",
    budget: initial?.budget ?? String(Math.round((min + max) / 4)),
    budgetMax: initial?.budgetMax ?? initial?.budget ?? String(Math.round((min + max) / 4)),
    budgetOpen: initial?.budgetOpen ?? false,
    description: initial?.description ?? "",
    slots: initial?.slots?.length ? initial.slots : flexibleSlots(),
    address: initial?.address ?? "",
    lat: initial?.lat ?? "",
    lng: initial?.lng ?? "",
    fullName: initial?.fullName ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
  }));




  const [cycle, setCycle] = useState<string>(
    () => levels.find((l) => l.id === initial?.level)?.cycle ?? "",
  );
  const [specialty, setSpecialty] = useState<string>(
    () => services.find((s) => s.id === initial?.service)?.specialty_id ?? "",
  );

  const set = (key: keyof NeedValues, value: string | boolean) =>
    setValues((v) => ({ ...v, [key]: value }));

  const cycles = cyclesOf(levels);
  const levelsForCycle = cycle ? levels.filter((l) => l.cycle === cycle) : [];
  const specialtiesForLevel = values.level
    ? specialties.filter((s) => s.level_id === values.level)
    : [];
  const subjects = values.level
    ? services.filter((s) =>
        specialtiesForLevel.length > 0
          ? s.specialty_id === specialty
          : s.level_id === values.level,
      )
    : [];



  const setAddress = (next: AddressValue) =>
    setValues((v) => ({
      ...v,
      address: next.address,
      lat: next.lat == null ? "" : String(next.lat),
      lng: next.lng == null ? "" : String(next.lng),
    }));

  const field =
    "w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20";
  const label = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

  const contactBlock = (
    <div className="grid gap-4 rounded-2xl border border-border bg-muted/40 p-4 sm:grid-cols-3">
      <div className="space-y-1 sm:col-span-3">
        <label className={label} htmlFor="need-fullname">
          Nom complet
        </label>
        <input
          id="need-fullname"
          required
          className={field}
          value={values.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          placeholder="Votre nom et prénom"
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <label className={label} htmlFor="need-email">
          Email
        </label>
        <input
          id="need-email"
          type="email"
          required
          className={field}
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="vous@exemple.com"
        />
      </div>
      <div className="space-y-1">
        <label className={label} htmlFor="need-phone">
          Téléphone
        </label>
        <input
          id="need-phone"
          type="tel"
          className={field}
          value={values.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="06 12 34 56 78"
        />
      </div>
    </div>
  );

  const catalogBlock = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1">
        <label className={label} htmlFor="need-cycle">
          Niveau
        </label>
        <select
          id="need-cycle"
          className={field}
          value={cycle}
          onChange={(e) => {
            setCycle(e.target.value);
            setSpecialty("");
            setValues((v) => ({ ...v, level: "", service: "" }));
          }}
        >
          <option value="">Choisir un niveau…</option>
          {cycles.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      {cycle && (
        <div className="space-y-1">
          <label className={label} htmlFor="need-level">
            {cycle === "Supérieur" ? "Année d'études" : "Classe"}
          </label>
          <select
            id="need-level"
            className={field}
            value={values.level}
            onChange={(e) => {
              setSpecialty("");
              setValues((v) => ({ ...v, level: e.target.value, service: "" }));
            }}
          >
            <option value="">
              {cycle === "Supérieur" ? "Choisir une année…" : "Choisir une classe…"}
            </option>
            {levelsForCycle.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {specialtiesForLevel.length > 0 && (
        <div className="space-y-1">
          <label className={label} htmlFor="need-specialty">
            Spécialité
          </label>
          <select
            id="need-specialty"
            className={field}
            value={specialty}
            onChange={(e) => {
              setSpecialty(e.target.value);
              setValues((v) => ({ ...v, service: "" }));
            }}
          >
            <option value="">Choisir une spécialité…</option>
            {specialtiesForLevel.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {values.level && (specialtiesForLevel.length === 0 || specialty) && (
        <div className="space-y-1">
          <label className={label} htmlFor="need-service">
            Matière
          </label>
          <select
            id="need-service"
            className={field}
            value={values.service}
            onChange={(e) => set("service", e.target.value)}
          >
            <option value="">Toutes les matières</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  return (
    <section className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-panel">
      <h2 className="mb-6 text-xl font-bold">{title}</h2>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (onSubmit) onSubmit(values);
          else
            navigate({
              to: "/professeurs",
              search: {
                service: values.service || undefined,
                level: values.level || undefined,
                city: values.city || undefined,
                mode: values.mode,
                budget: values.budget,
                address: values.address || undefined,
                lat: values.lat || undefined,
                lng: values.lng || undefined,
              },
            });
        }}
      >
        {minimal && contact && contactBlock}

        {!hidePrefilled && (
          <>
            {!minimal && catalogBlock}

            <div className="space-y-1">
              <label className={label} htmlFor="need-mode">
                Type de cours
              </label>
              <select
                id="need-mode"
                className={field}
                value={values.mode}
                onChange={(e) => {
                  const next = e.target.value;
                  setValues((v) => ({
                    ...v,
                    mode: next as NeedValues["mode"],
                    ...(next === "online" ? { city: "", address: "", lat: "", lng: "" } : {}),
                  }));
                }}
              >
                <option value="home">À domicile</option>
                <option value="studio">Chez le professeur</option>
                <option value="online">En ligne</option>
              </select>
            </div>

            {values.mode !== "online" && (
              <div className="space-y-1">
                <label className={label} htmlFor="need-city">
                  Ville
                </label>
                <CitySelect
                  id="need-city"
                  className={field}
                  cities={cities}
                  value={values.city}
                  onChange={(id) => set("city", id)}
                  placeholder="Toutes les villes — saisir 2 lettres"
                />
              </div>
            )}

            {values.mode === "home" && (
              <div className="space-y-2">
                <span className={label}>Votre adresse exacte</span>
                <ClientOnly
                  fallback={
                    <div className="h-32 w-full animate-pulse rounded-2xl border border-border bg-muted" />
                  }
                >
                  <AddressPicker
                    value={{
                      address: values.address,
                      lat: values.lat ? Number(values.lat) : null,
                      lng: values.lng ? Number(values.lng) : null,
                    }}
                    onChange={setAddress}
                  />
                </ClientOnly>
              </div>
            )}
          </>
        )}


        {(extended || withSlots) && !minimal && (
          <AvailabilityPicker
            value={values.slots}
            onChange={(slots) => setValues((v) => ({ ...v, slots }))}
          />
        )}

        {(extended || withBudget) && !minimal && (
          <div className="space-y-2">
            <label className={label} htmlFor="need-budget-max">
              Budget maximum souhaité (DH/h)
            </label>
            <input
              id="need-budget-max"
              type="number"
              min={0}
              max={5000}
              disabled={values.budgetOpen}
              className={`${field} disabled:opacity-50`}
              value={values.budgetOpen ? "" : values.budgetMax}
              placeholder={values.budgetOpen ? "À discuter" : undefined}
              onChange={(e) => {
                set("budgetMax", e.target.value);
                set("budget", e.target.value);
              }}
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border-border"
                checked={values.budgetOpen}
                onChange={(e) => set("budgetOpen", e.target.checked)}
              />
              Budget à discuter
            </label>
          </div>
        )}

        {(extended || withDescription || minimal) && (
          <div className="space-y-1">
            <label className={label} htmlFor="need-description">
              Description
            </label>
            <textarea
              id="need-description"
              rows={4}
              maxLength={1000}
              className={field}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={
                extended
                  ? "Décrivez votre besoin…\nExemple : Je cherche un professeur de maths pour ma fille en 3e, à Agadir, deux fois par semaine."
                  : "Décrivez votre besoin…\nExemple : Je cherche un soutien scolaire régulier pour ma fille."
              }
            />
          </div>
        )}

        {!minimal && contact && contactBlock}

        <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="submit"
            className="rounded-xl bg-primary px-8 py-3 font-bold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
