import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { MobileTabBar, SiteFooter, SiteHeader } from "@/components/site";
import { CitySelect } from "@/components/city-select";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AvailabilityPicker } from "@/components/availability-picker";
import {
  MODE_LABELS,
  cyclesOf,
  fetchReferenceData,
  flexibleSlots,
  saveProfessionalAvailability,
  type Slot,
} from "@/lib/marketplace";
import { SUPERIOR_BRANCHES, branchOfSpecialty } from "@/lib/branches";

import {
  ALLOWED_DOC_EXTENSIONS,
  DOCUMENT_KINDS,
  MAX_DOC_SIZE_MB,
  MAX_PHOTO_SIZE_MB,
  ONBOARDING_STEPS,
  completionOf,
} from "@/lib/teacher-onboarding";

export const Route = createFileRoute("/_authenticated/pro/inscription")({
  head: () => ({
    meta: [
      { title: "Inscription professeur en 10 étapes — ProFinder" },
      {
        name: "description",
        content:
          "Complétez votre profil professeur ProFinder : informations, matières, niveaux, tarifs, disponibilités, qualifications et documents de vérification.",
      },
      { property: "og:title", content: "Inscription professeur — ProFinder" },
      {
        property: "og:description",
        content: "Parcours guidé pour devenir professeur vérifié sur ProFinder.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProOnboarding,
});

const input =
  "mt-1 w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";
const label = "text-sm font-medium";
const chip = (active: boolean) =>
  active
    ? "rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"
    : "rounded-full bg-muted px-3 py-1 text-xs";

function ProOnboarding() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const emailVerified = !!user?.email_confirmed_at;

  const ref = useQuery({ queryKey: ["reference"], queryFn: fetchReferenceData });

  const me = useQuery({
    queryKey: ["my-pro", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("*, professional_services(service_id), professional_levels(level_id)")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const pro = me.data;

  const availability = useQuery({
    queryKey: ["my-availability", pro?.id],
    enabled: !!pro?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("professional_availability")
        .select("*")
        .eq("professional_id", pro!.id)
        .order("weekday");
      return data ?? [];
    },
  });

  const documents = useQuery({
    queryKey: ["my-documents", pro?.id],
    enabled: !!pro?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("verification_documents")
        .select("*")
        .eq("professional_id", pro!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    city_id: "",
    area: "",
    bio: "",
    photo_url: "",
    levels: [] as string[],
    services: [] as string[],
    modes: ["home", "online"] as string[],
    radius_km: "10",
    hourly_rate: "150",
    experience_years: "3",
    diplomas: "",
    specialty: "",
  });
  const [docKind, setDocKind] = useState<string>(DOCUMENT_KINDS[0].value);
  const [noDocNotice, setNoDocNotice] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Reprise automatique : on charge les données déjà enregistrées.
  useEffect(() => {
    if (hydrated || !pro) return;
    const meta = user?.user_metadata ?? {};
    setForm((f) => ({
      ...f,
      first_name: pro.first_name ?? (meta['first_name'] as string) ?? "",
      last_name: pro.last_name ?? (meta['last_name'] as string) ?? "",
      phone: pro.phone ?? (meta['phone'] as string) ?? "",
      city_id: pro.city_id ?? "",
      area: pro.area ?? "",
      bio: pro.bio ?? "",
      photo_url: pro.photo_url ?? "",
      levels: (pro.professional_levels as { level_id: string }[]).map((l) => l.level_id),
      services: (pro.professional_services as { service_id: string }[]).map((s) => s.service_id),
      modes: [
        pro.mode_home ? "home" : null,
        pro.mode_studio ? "studio" : null,
        pro.mode_online ? "online" : null,
      ].filter((m): m is string => m !== null),
      radius_km: String(pro.radius_km ?? 10),
      hourly_rate: String(Number(pro.hourly_rate ?? 150)),
      experience_years: String(pro.experience_years ?? 0),
      diplomas: pro.diplomas ?? "",
      specialty: pro.specialty ?? "",
    }));
    setStep(Math.min(Math.max(pro.onboarding_step ?? 1, 1), ONBOARDING_STEPS.length));
    setHydrated(true);
  }, [pro, user, hydrated]);

  useEffect(() => {
    if (!pro && me.isSuccess && !hydrated) {
      const meta = user?.user_metadata ?? {};
      setForm((f) => ({
        ...f,
        first_name: (meta['first_name'] as string) ?? "",
        last_name: (meta['last_name'] as string) ?? "",
        phone: (meta['phone'] as string) ?? "",
      }));
      setStep(emailVerified ? 2 : 1);
      setHydrated(true);
    }
  }, [pro, me.isSuccess, hydrated, user, emailVerified]);

  const done = completionOf({
    emailVerified,
    pro: pro
      ? { ...pro, phone: form.phone || pro.phone }
      : null,
    serviceCount: form.services.length,
    levelCount: form.levels.length,
    slotCount: availability.data?.length ?? 0,
    documentCount: documents.data?.length ?? 0,
  });

  /** Enregistre le profil (création si nécessaire) et renvoie son identifiant. */
  const persist = async (patch: Record<string, unknown>, nextStep?: number) => {
    if (!user) return null;
    const categoryId = pro?.category_id ?? ref.data?.categories[0]?.id;
    if (!categoryId) {
      toast.error("Catalogue indisponible, réessayez.");
      return null;
    }
    const displayName =
      `${form.first_name} ${form.last_name}`.trim() || pro?.display_name || user.email || "Professeur";
    const payload = {
      user_id: user.id,
      category_id: categoryId,
      display_name: displayName,
      ...(nextStep ? { onboarding_step: nextStep } : {}),
      ...patch,
    };
    const { data, error } = pro
      ? await supabase
          .from("professionals")
          .update(payload)
          .eq("id", pro.id)
          .select("id")
          .maybeSingle()
      : await supabase.from("professionals").insert(payload).select("id").maybeSingle();
    if (error || !data) {
      toast.error(error?.message ?? "Enregistrement impossible.");
      return null;
    }
    await qc.invalidateQueries({ queryKey: ["my-pro", user.id] });
    return data.id;
  };

  const saveRelations = async (proId: string) => {
    const validLevelIds = new Set(levels.map((l) => l.id));
    const validServiceIds = new Set(services.map((s) => s.id));
    const levelRows = form.levels
      .filter((level_id) => validLevelIds.has(level_id))
      .map((level_id) => ({ professional_id: proId, level_id }));
    const serviceRows = form.services
      .filter((service_id) => validServiceIds.has(service_id))
      .map((service_id) => ({ professional_id: proId, service_id }));

    await supabase.from("professional_levels").delete().eq("professional_id", proId);
    await supabase.from("professional_services").delete().eq("professional_id", proId);
    if (levelRows.length) {
      const { error } = await supabase.from("professional_levels").insert(levelRows);
      if (error) throw new Error(`Classes non enregistrées : ${error.message}`);
    }
    if (serviceRows.length) {
      const { error } = await supabase.from("professional_services").insert(serviceRows);
      if (error) throw new Error(`Matières non enregistrées : ${error.message}`);
    }
  };

  const toggle = (key: "levels" | "services" | "modes", value: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  const serviceBelongsToLevel = (serviceId: string, levelId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return false;
    return (
      service.level_id === levelId ||
      specialties.some((sp) => sp.id === service.specialty_id && sp.level_id === levelId)
    );
  };

  /**
   * Une matière choisie dans un niveau est automatiquement cochée dans tous les
   * autres niveaux sélectionnés (ex. « Français » en collège ⇒ aussi au lycée).
   */
  const mirrorSubjects = <T extends { levels: string[]; services: string[] }>(f: T): T => {
    const names = new Set(
      services.filter((s) => f.services.includes(s.id)).map((s) => s.name),
    );
    const extra = services
      .filter(
        (s) => names.has(s.name) && f.levels.some((levelId) => serviceBelongsToLevel(s.id, levelId)),
      )
      .map((s) => s.id);
    return { ...f, services: Array.from(new Set([...f.services, ...extra])) };
  };

  const toggleLevel = (levelId: string) =>
    setForm((f) => {
      const active = f.levels.includes(levelId);
      if (active) {
        return {
          ...f,
          levels: f.levels.filter((id) => id !== levelId),
          services: f.services.filter((id) => !serviceBelongsToLevel(id, levelId)),
        };
      }
      return mirrorSubjects({ ...f, levels: [...f.levels, levelId] });
    });

  const servicesForLevel = (levelId: string) =>
    services.filter(
      (s) =>
        s.level_id === levelId ||
        specialties.some((sp) => sp.id === s.specialty_id && sp.level_id === levelId),
    );

  const toggleAllLevelsForCycle = (cycle: string) => {
    const ids = levels.filter((l) => l.cycle === cycle).map((l) => l.id);
    setForm((f) => {
      const allSelected = ids.every((id) => f.levels.includes(id));
      if (allSelected) {
        return {
          ...f,
          levels: f.levels.filter((id) => !ids.includes(id)),
          services: f.services.filter(
            (serviceId) => !ids.some((levelId) => serviceBelongsToLevel(serviceId, levelId)),
          ),
        };
      }
      return mirrorSubjects({ ...f, levels: Array.from(new Set([...f.levels, ...ids])) });
    });
  };

  const toggleAllServicesForLevel = (levelId: string) => {
    const ids = servicesForLevel(levelId).map((s) => s.id);
    setForm((f) => {
      const allSelected = ids.length > 0 && ids.every((id) => f.services.includes(id));
      return {
        ...f,
        services: allSelected
          ? f.services.filter((id) => !ids.includes(id))
          : Array.from(new Set([...f.services, ...ids])),
      };
    });
  };

  const cycleLevelIds = (cycle: string) =>
    levels.filter((l) => l.cycle === cycle).map((l) => l.id);

  const servicesForCycle = (cycle: string) => {
    const levelIds = cycleLevelIds(cycle);
    const ids = new Set<string>();
    for (const levelId of levelIds) for (const s of servicesForLevel(levelId)) ids.add(s.id);
    return [...ids];
  };

  const allServicesSelectedForCycle = (cycle: string) => {
    const ids = servicesForCycle(cycle);
    return ids.length > 0 && ids.every((id) => form.services.includes(id));
  };

  /** Sélectionne (ou retire) tout un cycle : toutes ses classes et toutes leurs matières. */
  const toggleAllServicesForCycle = (cycle: string) => {
    const levelIds = cycleLevelIds(cycle);
    const serviceIds = servicesForCycle(cycle);
    const allSelected = allServicesSelectedForCycle(cycle);
    setForm((f) => ({
      ...f,
      levels: allSelected
        ? f.levels.filter((id) => !levelIds.includes(id))
        : Array.from(new Set([...f.levels, ...levelIds])),
      services: allSelected
        ? f.services.filter((id) => !serviceIds.includes(id))
        : Array.from(new Set([...f.services, ...serviceIds])),
    }));
  };

  const goNext = async () => {
    setBusy(true);
    try {
      const next = Math.min(step + 1, ONBOARDING_STEPS.length);
      if (step === 1) {
        if (!emailVerified) {
          toast.error("Confirmez d'abord votre adresse email.");
          return;
        }
        await persist({}, next);
      } else if (step === 2) {
        if (!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim() || !form.city_id) {
          toast.error("Prénom, nom, téléphone et ville sont obligatoires.");
          return;
        }
        await persist(
          {
            first_name: form.first_name,
            last_name: form.last_name,
            phone: form.phone,
            city_id: form.city_id,
            area: form.area,
            bio: form.bio,
            photo_url: form.photo_url || null,
          },
          next,
        );
      } else if (step === 3) {
        if (form.levels.length === 0) {
          toast.error("Sélectionnez au moins une classe.");
          return;
        }
        if (form.services.length === 0) {
          toast.error("Sélectionnez au moins une matière.");
          return;
        }
        const id = await persist({}, next);
        if (id) await saveRelations(id);
      } else if (step === 4) {
        if (form.modes.length === 0) {
          toast.error("Choisissez au moins un type de cours.");
          return;
        }
        if (Number(form.hourly_rate) < 0 || Number.isNaN(Number(form.hourly_rate))) {
          toast.error("Indiquez un tarif horaire valide ou choisissez « Tarif à discuter ».");
          return;
        }
        // Disponibilité « Flexible » par défaut : si rien n'est enregistré,
        // on enregistre automatiquement des créneaux flexibles.
        if ((availability.data?.length ?? 0) === 0) {
          await saveAvailability(flexibleSlots());
        }
        await persist(
          {
            mode_home: form.modes.includes("home"),
            mode_studio: form.modes.includes("studio"),
            mode_online: form.modes.includes("online"),
            radius_km: 10,
            area: form.area,
            hourly_rate: Number(form.hourly_rate),
          },
          next,
        );
      } else {
        await persist(
          {
            experience_years: Number(form.experience_years) || 0,
            diplomas: form.diplomas,
            specialty: form.specialty,
          },
          next,
        );
      }

      setStep(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  const saveAvailability = async (slots: Slot[]) => {
    const id = pro?.id ?? (await persist({}));
    if (!id) return;
    try {
      await saveProfessionalAvailability(id, slots);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
      return;
    }
    qc.invalidateQueries({ queryKey: ["my-availability", id] });
  };

  const uploadPhoto = async (file: File) => {
    if (!user) return;
    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      toast.error(`Photo trop lourde (max ${MAX_PHOTO_SIZE_MB} Mo).`);
      return;
    }
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
      toast.error("Formats acceptés : JPG, PNG, WEBP.");
      return;
    }
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (up.error) {
      toast.error(up.error.message);
      return;
    }
    const signed = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365);
    const url = signed.data?.signedUrl ?? "";
    setForm((f) => ({ ...f, photo_url: url }));
    toast.success("Photo ajoutée.");
  };

  const uploadDocument = async (file: File) => {
    if (!user) return;
    const id = pro?.id ?? (await persist({}));
    if (!id) return;
    if (file.size > MAX_DOC_SIZE_MB * 1024 * 1024) {
      toast.error(`Document trop lourd (max ${MAX_DOC_SIZE_MB} Mo).`);
      return;
    }
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_DOC_EXTENSIONS.includes(ext)) {
      toast.error(`Formats acceptés : ${ALLOWED_DOC_EXTENSIONS.join(", ").toUpperCase()}.`);
      return;
    }
    const path = `${user.id}/${id}/${docKind}-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("verification-docs").upload(path, file);
    if (up.error) {
      toast.error(up.error.message);
      return;
    }
    const { error } = await supabase.from("verification_documents").insert({
      professional_id: id,
      kind: docKind,
      file_path: path,
      status: "pending",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Document envoyé.");
    qc.invalidateQueries({ queryKey: ["my-documents", id] });
  };

  const removeDocument = async (docId: string, path: string) => {
    await supabase.storage.from("verification-docs").remove([path]);
    await supabase.from("verification_documents").delete().eq("id", docId);
    qc.invalidateQueries({ queryKey: ["my-documents", pro?.id] });
  };

  /** Finalise l'inscription sans vérification : le compte reste actif, sans badge. */
  const skipVerification = async () => {
    setBusy(true);
    try {
      const id = pro?.id ?? (await persist({}));
      if (!id) return;
      const { error } = await supabase
        .from("professionals")
        .update({
          status: "active",
          onboarding_completed: true,
          onboarding_step: ONBOARDING_STEPS.length,
          experience_years: Number(form.experience_years) || 0,
          diplomas: form.diplomas,
          specialty: form.specialty,
        })
        .eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Votre profil est actif. Vous pourrez envoyer vos documents plus tard.");
      await qc.invalidateQueries();
      navigate({ to: "/pro" });
    } finally {
      setBusy(false);
    }
  };

  const submitDossier = async () => {
    if (!pro) return;
    if ((documents.data?.length ?? 0) === 0) {
      setNoDocNotice(true);
      return;
    }
    setNoDocNotice(false);
    setBusy(true);
    try {
      const { error: reqError } = await supabase
        .from("verification_requests")
        .insert({ professional_id: pro.id, status: "pending" });
      if (reqError) {
        toast.error(reqError.message);
        return;
      }
      const { error } = await supabase
        .from("professionals")
        .update({
          verification_status: "pending",
          status: "active",
          onboarding_completed: true,
          onboarding_step: ONBOARDING_STEPS.length,
          experience_years: Number(form.experience_years) || 0,
          diplomas: form.diplomas,
          specialty: form.specialty,
        })
        .eq("id", pro.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("✅ Votre dossier a été envoyé à l'administration pour vérification.");
      await qc.invalidateQueries();
      navigate({ to: "/pro" });
    } finally {
      setBusy(false);
    }
  };

  const cities = ref.data?.cities ?? [];
  const levels = ref.data?.levels ?? [];
  const services = ref.data?.services ?? [];
  const specialties = ref.data?.specialties ?? [];
  const selectedLevels = levels.filter((l) => form.levels.includes(l.id));

  // Matières disponibles pour les niveaux choisis, regroupées par nom (ex. « Mathématiques »).
  const groupByName = (levelList: typeof selectedLevels) => {
    const map = new Map<string, string[]>();
    for (const l of levelList) {
      for (const s of servicesForLevel(l.id)) {
        map.set(s.name, [...(map.get(s.name) ?? []), s.id]);
      }
    }
    return Array.from(map.entries())
      .map(([name, ids]) => ({ name, ids }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  };

  const schoolLevels = selectedLevels.filter((l) => l.cycle !== "Supérieur");
  const superiorLevels = selectedLevels.filter((l) => l.cycle === "Supérieur");
  const subjectGroups = groupByName(schoolLevels);

  // Cycle supérieur : toutes les matières sont classées dans les 9 grandes branches.
  const branchGroups: Array<{ branch: string; subjects: Array<{ name: string; ids: string[] }> }> =
    (() => {
      const map = new Map<string, Map<string, string[]>>();
      for (const branch of SUPERIOR_BRANCHES) map.set(branch.name, new Map());
      for (const l of superiorLevels) {
        for (const s of servicesForLevel(l.id)) {
          const specialty = specialties.find((sp) => sp.id === s.specialty_id);
          const branch = branchOfSpecialty(specialty?.name);
          const subjects = map.get(branch)!;
          subjects.set(s.name, [...(subjects.get(s.name) ?? []), s.id]);
        }
      }
      return SUPERIOR_BRANCHES.map((b) => ({
        branch: b.name,
        subjects: Array.from(map.get(b.name)!.entries())
          .map(([name, ids]) => ({ name, ids }))
          .sort((a, b2) => a.name.localeCompare(b2.name, "fr")),
      })).filter((g) => g.subjects.length > 0);
    })();

  // Récapitulatif « brouillon » des choix de l'étape 3.
  const selectedSubjectNames = Array.from(
    new Set(services.filter((s) => form.services.includes(s.id)).map((s) => s.name)),
  ).sort((a, b) => a.localeCompare(b, "fr"));
  const allSubjectIds = Array.from(
    new Set([
      ...subjectGroups.flatMap((g) => g.ids),
      ...branchGroups.flatMap((b) => b.subjects.flatMap((s) => s.ids)),
    ]),
  );
  const allSubjectsSelected =
    allSubjectIds.length > 0 && allSubjectIds.every((id) => form.services.includes(id));

  // Résumé court : « primaire, toutes les matières » ou « collège et lycée, français ».
  const selectedCycles = cyclesOf(selectedLevels);
  const cyclesLabel = selectedCycles
    .map((c) => c.toLowerCase())
    .reduce(
      (acc, c, i, arr) => (i === 0 ? c : i === arr.length - 1 ? `${acc} et ${c}` : `${acc}, ${c}`),
      "",
    );
  const subjectsLabel = allSubjectsSelected
    ? "toutes les matières"
    : selectedSubjectNames.length > 0
      ? selectedSubjectNames.join(", ")
      : "aucune matière";
  // Le choix « toutes les matières » est réservé au primaire.
  const canSelectAllSubjects =
    selectedCycles.length === 1 && selectedCycles[0]?.toLowerCase() === "primaire";

  const stepTitle = ONBOARDING_STEPS[step - 1]?.label ?? "";

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <SiteHeader variant="pro" />
      <main className="mx-auto max-w-3xl px-4 py-8 pb-28">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Mon profil</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Vos réponses sont enregistrées à chaque étape : vous pouvez quitter et reprendre plus
              tard.
            </p>
          </div>
          {pro?.id && (
            <Link
              to="/professeurs/$id"
              params={{ id: pro.id }}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              Voir mon profil public
            </Link>
          )}
        </div>

        <OnboardingProgress current={step} className="mt-6" />

        <ol className="mt-4 flex flex-wrap gap-2 text-xs">
          {ONBOARDING_STEPS.map((s, i) => (
            <li key={s.key}>
              <button
                onClick={() => setStep(i + 1)}
                className={
                  i + 1 === step
                    ? "rounded-full bg-primary px-3 py-1 font-bold text-primary-foreground"
                    : done[s.key]
                      ? "rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary"
                      : "rounded-full bg-muted px-3 py-1 text-muted-foreground"
                }
              >
                {done[s.key] && <Check className="mr-1 inline h-3 w-3" aria-hidden />}
                {i + 1}. {s.label}
              </button>
            </li>
          ))}
        </ol>

        <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-panel">
          <h2 className="text-xl font-bold">
            Étape {step} — {stepTitle}
          </h2>

          {step === 1 && (
            <div className="mt-4 space-y-3 text-sm">
              <p className="text-muted-foreground">
                Votre compte a bien été créé : {user?.email}
              </p>
              <p className="rounded-xl bg-muted px-4 py-3">
                Prochaine étape : la confirmation de votre adresse email.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="mt-4 space-y-3 text-sm">
              {emailVerified ? (
                <p className="rounded-xl bg-primary/10 px-4 py-3 font-semibold text-primary">
                  ✅ Email vérifié — {user?.email}
                </p>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    Votre adresse <span className="font-semibold">{user?.email}</span> n'est pas
                    encore confirmée.
                  </p>
                  <Link
                    to="/verifier-email"
                    search={{ email: user?.email ?? "" }}
                    className="inline-block rounded-xl border border-border px-4 py-2 font-semibold hover:bg-muted"
                  >
                    Renvoyer l'email de vérification
                  </Link>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className={label}>Photo de profil (facultative, fortement recommandée)</span>
                <div className="mt-2 flex items-center gap-4">
                  {form.photo_url ? (
                    <img
                      src={form.photo_url}
                      alt="Aperçu de votre photo de profil"
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-muted" />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadPhoto(file);
                    }}
                    className="text-sm"
                  />
                </div>
              </div>
              <label className={label}>
                Prénom
                <input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  maxLength={80}
                  className={input}
                />
              </label>
              <label className={label}>
                Nom
                <input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  maxLength={80}
                  className={input}
                />
              </label>
              <label className={label}>
                Téléphone
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  maxLength={30}
                  className={input}
                />
              </label>
              <div className={label}>
                Ville
                <div className="mt-1">
                  <CitySelect
                    cities={cities}
                    value={form.city_id}
                    onChange={(id) => setForm({ ...form, city_id: id })}
                    className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <label className={label}>
                Quartier
                <input
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  maxLength={120}
                  className={input}
                />
              </label>
              <label className={`${label} sm:col-span-2`}>
                Présentation personnelle
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  maxLength={2000}
                  className={`${input} h-28`}
                />
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="mt-4 space-y-5">
              <p className="text-sm text-muted-foreground">
                Choisissez les niveaux que vous enseignez (ex. primaire, collège), puis vos
                matières (ex. mathématiques).
              </p>

              <div>
                <p className="text-sm font-semibold">Niveaux</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {cyclesOf(levels).map((cycle) => {
                    const cycleLevels = levels.filter((l) => l.cycle === cycle);
                    const active = cycleLevels.every((l) => form.levels.includes(l.id));
                    return (
                      <button
                        key={cycle}
                        onClick={() => toggleAllLevelsForCycle(cycle)}
                        className={chip(active)}
                      >
                        {cycle}
                      </button>
                    );
                  })}
                </div>
              </div>

              {(selectedLevels.length > 0 || selectedSubjectNames.length > 0) && (
                <div className="rounded-2xl border border-dashed border-primary/50 bg-muted/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Votre sélection
                  </p>
                  <p className="mt-2 text-xs font-semibold">
                    {selectedCycles.length > 0 ? `${cyclesLabel}, ${subjectsLabel}` : subjectsLabel}
                  </p>
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Matières</p>
                  {allSubjectIds.length > 0 && canSelectAllSubjects && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          services: allSubjectsSelected
                            ? f.services.filter((id) => !allSubjectIds.includes(id))
                            : Array.from(new Set([...f.services, ...allSubjectIds])),
                        }))
                      }
                      className="rounded-xl border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted"
                    >
                      {allSubjectsSelected ? "Tout désélectionner" : "Sélectionner toutes les matières"}
                    </button>
                  )}
                </div>
                {selectedLevels.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Choisissez d'abord un ou plusieurs niveaux.
                  </p>
                ) : (
                  <div className="mt-2 space-y-4">
                    {branchGroups.map((bg) => (
                      <div key={bg.branch}>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {bg.branch}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {bg.subjects.map((group) => {
                            const active = group.ids.every((id) => form.services.includes(id));
                            return (
                              <button
                                key={`${bg.branch}-${group.name}`}
                                onClick={() =>
                                  setForm((f) =>
                                    active
                                      ? {
                                          ...f,
                                          services: f.services.filter(
                                            (id) => !group.ids.includes(id),
                                          ),
                                        }
                                      : mirrorSubjects({
                                          ...f,
                                          services: Array.from(
                                            new Set([...f.services, ...group.ids]),
                                          ),
                                        }),
                                  )
                                }
                                className={chip(active)}
                              >
                                {group.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  <div className="flex flex-wrap gap-2">
                    {subjectGroups.map((group) => {
                      const active = group.ids.every((id) => form.services.includes(id));
                      return (
                        <button
                          key={group.name}
                          onClick={() =>
                            setForm((f) =>
                              active
                                ? {
                                    ...f,
                                    services: f.services.filter((id) => !group.ids.includes(id)),
                                  }
                                : mirrorSubjects({
                                    ...f,
                                    services: Array.from(new Set([...f.services, ...group.ids])),
                                  }),
                            )
                          }
                          className={chip(active)}
                        >
                          {group.name}
                        </button>
                      );
                    })}
                  </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-sm font-semibold">Types de cours</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(MODE_LABELS).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => toggle("modes", mode)}
                      className={chip(form.modes.includes(mode))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold">Tarif</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        hourly_rate: form.hourly_rate === "0" ? "150" : form.hourly_rate,
                      })
                    }
                    className={
                      "relative flex flex-col items-start rounded-2xl border p-4 text-left transition-colors " +
                      (form.hourly_rate !== "0"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:bg-muted/50")
                    }
                  >
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <span
                        className={
                          "flex size-5 items-center justify-center rounded-full border " +
                          (form.hourly_rate !== "0"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted")
                        }
                      >
                        {form.hourly_rate !== "0" && <Check className="size-3" />}
                      </span>
                      Tarif horaire fixe
                    </span>
                    <span className="mt-1 pl-7 text-xs text-muted-foreground">
                      Indiquez un tarif horaire précis.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, hourly_rate: "0" })}
                    className={
                      "relative flex flex-col items-start rounded-2xl border p-4 text-left transition-colors " +
                      (form.hourly_rate === "0"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:bg-muted/50")
                    }
                  >
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <span
                        className={
                          "flex size-5 items-center justify-center rounded-full border " +
                          (form.hourly_rate === "0"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted")
                        }
                      >
                        {form.hourly_rate === "0" && <Check className="size-3" />}
                      </span>
                      Tarif à discuter
                    </span>
                    <span className="mt-1 pl-7 text-xs text-muted-foreground">
                      Vous fixerez le prix avec chaque élève.
                    </span>
                  </button>
                </div>

                {form.hourly_rate !== "0" ? (
                  <label className={`${label} mt-4 block`}>
                    Tarif horaire (DH)
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={form.hourly_rate}
                      onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
                      className={input}
                    />
                  </label>
                ) : (
                  <p className="mt-4 rounded-xl bg-muted px-4 py-3 text-xs text-muted-foreground">
                    Votre profil affichera « Tarif à discuter » : vous fixerez le prix avec chaque
                    élève.
                  </p>
                )}
              </div>

              <AvailabilityPicker
                value={(availability.data?.length ? availability.data : flexibleSlots()).map((s) => ({
                  weekday: s.weekday,
                  start_min: s.start_min,
                  end_min: s.end_min,
                }))}
                onChange={(slots) => void saveAvailability(slots)}
                label="Disponibilité souhaitée"
                hint="Choisissez vos jours et moments disponibles, ou sélectionnez « Flexible »."
              />
              <p className="text-xs text-muted-foreground">
                Ces disponibilités sont récurrentes chaque semaine et servent au matching avec les
                demandes des élèves.
              </p>
            </div>
          )}

          {step === 5 && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className={label}>
                Années d'expérience
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={form.experience_years}
                  onChange={(e) => setForm({ ...form, experience_years: e.target.value })}
                  className={input}
                />
              </label>
              <label className={label}>
                Spécialité
                <input
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  maxLength={160}
                  className={input}
                />
              </label>
              <label className={label}>
                Diplôme(s)
                <input
                  value={form.diplomas}
                  onChange={(e) => setForm({ ...form, diplomas: e.target.value })}
                  maxLength={300}
                  className={input}
                />
              </label>
            </div>
          )}

          {step === 5 && (
            <div className="mt-4 space-y-4">
              <h3 className="text-base font-bold">Vérifiez votre profil professionnel</h3>
              <p className="text-sm text-muted-foreground">
                Envoyez votre pièce d'identité et votre diplôme (PDF ou image, {MAX_DOC_SIZE_MB} Mo
                maximum). Vos documents restent privés : seuls vous et les administrateurs habilités
                y ont accès.
              </p>
              <p className="rounded-xl bg-muted px-4 py-3 text-sm">
                Un seul document suffit : pièce d'identité <strong>ou</strong> diplôme (les deux sont
                également acceptés). La vérification est optionnelle — votre profil reste actif sans
                elle, simplement sans le badge « Professeur vérifié ✓ ».
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={docKind}
                  onChange={(e) => setDocKind(e.target.value)}
                  className="rounded-xl border border-border bg-muted px-3 py-2 text-sm"
                >
                  {DOCUMENT_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadDocument(file);
                    e.target.value = "";
                  }}
                  className="text-sm"
                />
              </div>

              <ul className="space-y-2 text-sm">
                {(documents.data ?? []).map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded-xl bg-muted px-4 py-2"
                  >
                    <span>
                      {DOCUMENT_KINDS.find((k) => k.value === d.kind)?.label ?? d.kind} ·{" "}
                      <span className="text-xs text-muted-foreground">{d.status}</span>
                    </span>
                    <button
                      onClick={() => removeDocument(d.id, d.file_path)}
                      className="text-xs font-semibold text-destructive"
                    >
                      Retirer
                    </button>
                  </li>
                ))}
                {(documents.data ?? []).length === 0 && (
                  <li className="text-muted-foreground">Aucun document envoyé.</li>
                )}
              </ul>

              {pro?.verification_status === "pending" ? (
                <p className="rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground">
                  🕐 Vérification en cours — votre dossier a été envoyé. Notre équipe va vérifier les
                  informations et documents fournis.
                </p>
              ) : (
                <>
                  <button
                    onClick={submitDossier}
                    disabled={busy}
                    className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
                  >
                    Envoyer mon dossier
                  </button>
                  {noDocNotice && (
                    <div className="rounded-xl border border-border bg-muted px-4 py-4 text-sm">
                      <p>
                        Fournissez au moins l'un des deux documents (pièce d'identité ou diplôme)
                        pour faire vérifier votre compte et bénéficier de l'offre.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => docInputRef.current?.click()}
                          className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                        >
                          Fournir un document
                        </button>
                        <button
                          onClick={() => void skipVerification()}
                          disabled={busy}
                          className="rounded-xl border border-border px-4 py-2 text-xs font-bold disabled:opacity-60"
                        >
                          Continuer sans vérification
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Précédent
            </button>
            <div className="flex gap-2">
              <Link
                to="/pro"
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
              >
                Reprendre plus tard
              </Link>
              {step < 5 && (
                <button
                  onClick={goNext}
                  disabled={busy}
                  className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
                >
                  Enregistrer et continuer
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
      <MobileTabBar variant="pro" />
      <SiteFooter variant="pro" />
    </div>
  );
}
