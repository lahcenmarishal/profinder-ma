import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { CATEGORIES, LEVELS, SERVICES, SPECIALTIES } from "@/lib/catalog";
import { CITIES } from "@/lib/cities";


export type Slot = { weekday: number; start_min: number; end_min: number };

export const WEEKDAYS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

export const MODE_LABELS: Record<string, string> = {
  home: "À domicile",
  studio: "Chez le professeur",
  online: "En ligne",
};

/** Niveaux scolaires proposés par défaut (ordre pédagogique). */
export const CYCLES = ["Primaire", "Collège", "Lycée", "Supérieur"] as const;

export type CycleAware = { cycle?: string | null };

/** Niveaux réellement présents dans les classes, triés selon l'ordre pédagogique. */
export function cyclesOf(levels: CycleAware[]): string[] {
  const found = new Set<string>();
  for (const l of levels) if (l.cycle) found.add(l.cycle);
  const ordered = (CYCLES as readonly string[]).filter((c) => found.has(c));
  const extras = [...found].filter((c) => !ordered.includes(c)).sort();
  return [...ordered, ...extras];
}


export type MatchWeights = {
  service: number;
  level: number;
  availability: number;
  location: number;
  budget: number;
  reputation: number;
};

export const DEFAULT_WEIGHTS: MatchWeights = {
  service: 30,
  level: 20,
  availability: 20,
  location: 15,
  budget: 10,
  reputation: 5,
};

export type ProfessionalRow = {
  id: string;
  user_id: string | null;
  display_name: string;
  category_id: string;

  headline: string | null;
  bio: string | null;
  photo_url: string | null;
  experience_years: number;
  hourly_rate: number;
  city_id: string | null;
  area: string | null;
  lat: number | null;
  lng: number | null;
  radius_km: number;
  mode_home: boolean;
  mode_studio: boolean;
  mode_online: boolean;
  languages: string[];
  phone?: string | null;
  diplomas: string | null;
  is_verified: boolean;
  verification_status: Database["public"]["Enums"]["verification_status"];
  plan_code: string;
  rating_avg: number;
  rating_count: number;
  lessons_count: number;
  response_rate: number;
  created_at: string;
  professional_services: { service_id: string }[];
  professional_levels: { level_id: string }[];
  professional_availability: Slot[];
};


export type Criteria = {
  service_id?: string | null | undefined;
  /** Plusieurs matières souhaitées : un professeur correspond s'il en couvre au moins une. */
  service_ids?: string[] | undefined;
  level_id?: string | null | undefined;
  city_id?: string | null | undefined;
  mode?: "home" | "studio" | "online" | undefined;
  budget_max?: number | null | undefined;
  slots?: Slot[] | undefined;
  lat?: number | null | undefined;
  lng?: number | null | undefined;
};


export const PRO_SELECT =
  "*, professional_services(service_id), professional_levels(level_id), professional_availability(weekday,start_min,end_min)";

export function distanceKm(
  a: { lat?: number | null; lng?: number | null },
  b: { lat?: number | null; lng?: number | null },
): number | null {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

function slotsOverlap(a: Slot, b: Slot) {
  return (
    a.weekday === b.weekday &&
    Math.min(a.end_min, b.end_min) - Math.max(a.start_min, b.start_min) >= 30
  );
}

/**
 * Generic matching engine: works for any professional category.
 * Returns a score in 0..100 plus the per-criterion detail, and never returns
 * 100 unless every weighted criterion is fully satisfied.
 */
export function scoreMatch(
  pro: ProfessionalRow,
  criteria: Criteria,
  weights: MatchWeights = DEFAULT_WEIGHTS,
  planBoost = 0,
): { score: number; detail: Record<string, number>; distance: number | null } {
  const detail: Record<string, number> = {};
  let total = 0;
  let earned = 0;

  const add = (key: keyof MatchWeights, ratio: number) => {
    const w = weights[key] ?? 0;
    if (w <= 0) return;
    total += w;
    earned += w * ratio;
    detail[key] = Math.round(ratio * 100);
  };

  const wantedServices =
    criteria.service_ids && criteria.service_ids.length > 0
      ? criteria.service_ids
      : criteria.service_id
        ? [criteria.service_id]
        : [];
  if (wantedServices.length > 0) {
    const covered = wantedServices.filter((id) =>
      pro.professional_services.some((s) => s.service_id === id),
    ).length;
    add("service", covered / wantedServices.length);
  }
  if (criteria.level_id) {
    add("level", pro.professional_levels.some((l) => l.level_id === criteria.level_id) ? 1 : 0);
  }
  if (criteria.slots && criteria.slots.length > 0) {
    const matched = criteria.slots.filter((want) =>
      pro.professional_availability.some((have) => slotsOverlap(want, have)),
    ).length;
    add("availability", matched / criteria.slots.length);
  }

  let distance: number | null = null;
  if (criteria.lat != null && criteria.lng != null) {
    distance = distanceKm({ lat: criteria.lat, lng: criteria.lng }, pro);
  }
  if (criteria.city_id) {
    // Correspondance géographique = même ville (aucun rayon de déplacement).
    let ratio = pro.city_id === criteria.city_id ? 1 : 0;
    if (criteria.mode === "online" && pro.mode_online) ratio = 1;
    add("location", ratio);
  }
  if (criteria.budget_max != null) {
    const rate = Number(pro.hourly_rate);
    const ratio =
      rate <= criteria.budget_max
        ? 1
        : Math.max(0, 1 - (rate - criteria.budget_max) / criteria.budget_max);
    add("budget", ratio);
  }

  const rep =
    (pro.rating_count > 0 ? Number(pro.rating_avg) / 5 : 0.5) * 0.6 +
    Math.min(1, pro.experience_years / 10) * 0.4;
  add("reputation", rep);

  const base = total > 0 ? (earned / total) * 100 : 50;
  const score = Math.max(5, Math.min(99, Math.round(base + planBoost / 10)));
  return { score, detail, distance };
}

/** Profil minimal d'un professeur utilisé par le matching automatique. */
export type MatchProfile = {
  city_id: string | null;
  mode_home: boolean;
  mode_studio: boolean;
  mode_online: boolean;
  services: string[];
  levels: string[];
  slots: Slot[];
};

/** Critères d'une demande client, tels que stockés en base. */
export type MatchRequest = {
  service_id: string | null;
  service_ids?: string[] | null;
  level_id: string | null;
  city_id: string | null;
  mode: "home" | "studio" | "online";
  slots?: Slot[] | null;
};

/**
 * Matching automatique demande ↔ professeur :
 * matière, niveau, localisation (ignorée en ligne), type de cours, disponibilité.
 */
export function requestMatchesPro(req: MatchRequest, pro: MatchProfile): boolean {
  const modeOk =
    req.mode === "online" ? pro.mode_online : req.mode === "home" ? pro.mode_home : pro.mode_studio;
  if (!modeOk) return false;

  // Les cours en ligne ne dépendent pas de la localisation.
  if (req.mode !== "online" && req.city_id && pro.city_id && pro.city_id !== req.city_id)
    return false;

  const wantedServices =
    req.service_ids && req.service_ids.length > 0
      ? req.service_ids
      : req.service_id
        ? [req.service_id]
        : [];
  if (
    wantedServices.length > 0 &&
    pro.services.length > 0 &&
    !wantedServices.some((id) => pro.services.includes(id))
  )
    return false;
  if (req.level_id && pro.levels.length > 0 && !pro.levels.includes(req.level_id)) return false;

  const wanted = req.slots ?? [];
  if (wanted.length > 0 && pro.slots.length > 0) {
    const overlap = wanted.some((w) => pro.slots.some((h) => slotsOverlap(w, h)));
    if (!overlap) return false;
  }
  return true;
}

/** Lien WhatsApp à partir d'un numéro marocain ou international. */
export function whatsappLink(phone?: string | null) {
  if (!phone) return null;
  let digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) digits = `212${digits.slice(1)}`;
  if (digits.length < 9) return null;
  return `https://wa.me/${digits}`;
}

export function modeAllowed(pro: ProfessionalRow, mode?: string) {
  if (mode === "home") return pro.mode_home;
  if (mode === "studio") return pro.mode_studio;
  if (mode === "online") return pro.mode_online;
  return true;
}

export async function fetchReferenceData() {
  // Catalogue (catégories, classes, spécialités, matières) : statique côté frontend.
  const [plans, settings] = await Promise.all([
    supabase.from("subscription_plans").select("*").order("sort"),
    supabase.from("platform_settings").select("*"),
  ]);
  const settingsMap: Record<string, unknown> = {};
  for (const row of settings.data ?? []) settingsMap[row.key] = row.value;
  return {
    categories: CATEGORIES,
    services: SERVICES.filter((s) => s.is_active),
    levels: LEVELS.filter((l) => l.is_active),
    specialties: SPECIALTIES.filter((s) => s.is_active),
    cities: CITIES,
    plans: plans.data ?? [],
    settings: settingsMap,
    weights: (settingsMap["matching_weights"] as MatchWeights) ?? DEFAULT_WEIGHTS,
  };
}


export async function fetchProfessionals() {
  const query = () =>
    supabase.from("professionals").select(PRO_SELECT).eq("status", "active");

  let { data, error } = await query();

  // Une session conservée par le navigateur après un remix peut contenir un
  // ancien jeton. PostgREST refuse alors même les lignes publiques avec 401.
  // Rafraîchir la session (ou retirer seulement la copie locale invalide), puis
  // rejouer la lecture permet de revenir proprement au rôle public.
  if (error && (error.code === "PGRST301" || /jwt|token|unauthorized/i.test(error.message))) {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) await supabase.auth.signOut({ scope: "local" });
    ({ data, error } = await query());
  }

  if (error) throw error;
  return (data ?? []) as unknown as ProfessionalRow[];
}

export function planBoostFor(planCode: string) {
  if (planCode === "pro" || planCode === "pro_annuel") return 25;
  return 0;
}

/** Moments de la journée — remplace les créneaux horaires exacts. */
export const MOMENTS = [
  { key: "morning", label: "Matin", start_min: 8 * 60, end_min: 12 * 60 },
  { key: "afternoon", label: "Après-midi", start_min: 12 * 60, end_min: 18 * 60 },
  { key: "evening", label: "Soir", start_min: 18 * 60, end_min: 22 * 60 },
] as const;

export type MomentKey = (typeof MOMENTS)[number]["key"];

/** Moment de la journée correspondant à un créneau enregistré. */
export function momentOfSlot(slot: Slot): (typeof MOMENTS)[number] {
  let best: (typeof MOMENTS)[number] = MOMENTS[0];
  let bestOverlap = -1;
  for (const m of MOMENTS) {
    const overlap = Math.min(m.end_min, slot.end_min) - Math.max(m.start_min, slot.start_min);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = m;
    }
  }
  return best;
}

/** Construit les créneaux à partir des jours et moments choisis. */
export function slotsFromChoice(weekdays: number[], moments: MomentKey[]): Slot[] {
  const out: Slot[] = [];
  for (const weekday of weekdays) {
    for (const key of moments) {
      const m = MOMENTS.find((x) => x.key === key);
      if (!m) continue;
      out.push({ weekday, start_min: m.start_min, end_min: m.end_min });
    }
  }
  return out;
}

/** Jours et moments déduits d'une liste de créneaux. */
export function choiceFromSlots(slots: Slot[]): { weekdays: number[]; moments: MomentKey[] } {
  const weekdays = [...new Set(slots.map((s) => s.weekday))].sort((a, b) => a - b);
  const moments = [...new Set(slots.map((s) => momentOfSlot(s).key))] as MomentKey[];
  return { weekdays, moments };
}

/** « Lundi · Matin » */
export function formatSlot(slot: Slot) {
  return `${WEEKDAYS[slot.weekday]} · ${momentOfSlot(slot).label}`;
}

export const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

/** Disponibilité « Flexible » : aucun créneau, ou tous les jours et tous les moments. */
export function isFlexible(slots: Slot[] | null | undefined): boolean {
  if (!slots || slots.length === 0) return true;
  const { weekdays, moments } = choiceFromSlots(slots);
  return weekdays.length === 7 && moments.length === MOMENTS.length;
}

/** Tous les jours × tous les moments. */
export function flexibleSlots(): Slot[] {
  return slotsFromChoice(ALL_WEEKDAYS, MOMENTS.map((m) => m.key));
}

/** Enregistre les disponibilités d'un professeur (remplace les anciennes). */
export async function saveProfessionalAvailability(professionalId: string, slots: Slot[]) {
  await supabase.from("professional_availability").delete().eq("professional_id", professionalId);
  if (slots.length === 0) return;
  const { error } = await supabase
    .from("professional_availability")
    .insert(slots.map((s) => ({ professional_id: professionalId, ...s })));
  if (error) throw error;
}

/** Résumé lisible : « Lundi, Mercredi · Matin, Soir » ou « Flexible ». */
export function formatAvailability(slots: Slot[] | null | undefined): string {
  if (isFlexible(slots)) return "Flexible";
  const { weekdays, moments } = choiceFromSlots(slots!);
  const days = weekdays.map((d) => WEEKDAYS[d]).join(", ");
  const parts = MOMENTS.filter((m) => moments.includes(m.key)).map((m) => m.label);
  return `${days} · ${parts.join(", ")}`;
}


export type RateRange = { min: number; max: number };
export const DEFAULT_RATE_RANGE: RateRange = { min: 40, max: 400 };

/** Basic anti-circumvention: flag phone numbers and external links in messages. */
export function detectContactLeak(body: string) {
  const phone = /(\+?\d[\d\s.-]{7,}\d)/.test(body);
  const link = /(https?:\/\/|www\.|wa\.me|t\.me)/i.test(body);
  return phone || link;
}

export type RecentRequestRow = {
  id: string;
  category_id: string;
  level_id: string | null;
  service_id: string | null;
  service_ids: string[] | null;
  city_id: string | null;
  area: string | null;
  description: string | null;
  budget_min: number | null;
  budget_max: number | null;
  mode: Database["public"]["Enums"]["lesson_mode"];
  slots: Slot[];
  status: Database["public"]["Enums"]["request_status"];
  created_at: string;
};

/** Demandes publiques récentes (lecture anonyme autorisée par la politique RLS). */
export async function fetchRecentRequests(limit = 6) {
  const { data, error } = await supabase
    .from("requests")
    .select(
      "id,category_id,level_id,service_id,service_ids,city_id,area,description,budget_min,budget_max,mode,slots,status,created_at",
    )
    .in("status", ["active", "proposals_received"])
    .is("target_professional_id", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as RecentRequestRow[];
}

export type DirectRequestInput = {
  professionalId: string;
  categoryId: string;
  clientId?: string | null;
  service_id: string | null;
  service_ids?: string[];
  level_id: string | null;
  city_id: string | null;
  mode: "home" | "studio" | "online";
  budget_min: number | null;
  budget_max: number | null;
  slots: Slot[];
  description: string | null;
  area: string | null;
  lat: number | null;
  lng: number | null;
  contact: { full_name: string; email: string; phone: string | null };
};

/**
 * Envoie une demande directement à un professeur.
 * Fonctionne sans compte : la demande est créée sans client_id et les coordonnées
 * du visiteur sont stockées séparément (lisibles seulement par le professeur ciblé).
 */
export async function submitDirectRequest(input: DirectRequestInput) {
  const { data, error } = await supabase
    .from("requests")
    .insert({
      client_id: input.clientId ?? null,
      category_id: input.categoryId,
      target_professional_id: input.professionalId,
      service_id: input.service_id ?? input.service_ids?.[0] ?? null,
      service_ids: input.service_ids ?? (input.service_id ? [input.service_id] : []),
      level_id: input.level_id,
      city_id: input.city_id,
      mode: input.mode,
      budget_min: input.budget_min,
      budget_max: input.budget_max,
      slots: input.slots,
      description: input.description,
      area: input.area,
      lat: input.lat,
      lng: input.lng,
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw error;

  const { error: contactError } = await supabase.from("request_contacts").insert({
    request_id: data.id,
    full_name: input.contact.full_name,
    email: input.contact.email,
    phone: input.contact.phone,
  });
  if (contactError) throw contactError;

  try {
    const { notifyNewRequest } = await import("@/lib/notify.functions");
    await notifyNewRequest({ data: { requestId: data.id } });
  } catch {
    /* la notification est best-effort */
  }

  return data.id;

}


/** Liste de matières séparée par des virgules (paramètre d'URL) → identifiants. */
export function parseServiceIds(value?: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

/** « Maths, Physique » à partir d'une liste d'identifiants de matières. */
export function serviceNames(ids?: string[] | null): string | null {
  const names = (ids ?? []).map((id) => serviceName(id)).filter(Boolean);
  return names.length > 0 ? names.join(", ") : null;
}

export function serviceName(id?: string | null) {
  return SERVICES.find((s) => s.id === id)?.name ?? null;
}

export function levelName(id?: string | null) {
  return LEVELS.find((l) => l.id === id)?.name ?? null;
}

export function cityName(id?: string | null) {
  return CITIES.find((c) => c.id === id)?.name ?? null;
}

export function formatBudget(min?: number | null, max?: number | null) {
  if (min == null && max == null) return "Budget ouvert";
  if (min != null && max != null) return `${Number(min)}–${Number(max)} DH/h`;
  return `${Number(min ?? max)} DH/h`;
}

/** "il y a 3 h" — libellé court et relatif pour les listes de demandes. */
export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 60) return `il y a ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d <= 1 ? "hier" : `il y a ${d} jours`;
}
