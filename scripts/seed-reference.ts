/**
 * Réinjection des données de référence ProFinder dans la base.
 *
 * Source de vérité du catalogue : src/lib/catalog.ts et src/lib/cities.ts.
 * Le script est idempotent (upsert) : on peut le relancer sans créer de doublon.
 *
 *   bun run scripts/seed-reference.ts
 */
import { createClient } from "@supabase/supabase-js";
import { CATEGORIES, LEVELS, SPECIALTIES, SERVICES } from "../src/lib/catalog";
import { CITIES } from "../src/lib/cities";
import { CITY_NAME_AR } from "../src/lib/cities.ar";
import { DEFAULT_WEIGHTS } from "../src/lib/marketplace";

const url = process.env["SUPABASE_URL"]!;
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants");

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input as string, { ...init, headers });
    },
  },
});

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function upsert(table: string, rows: unknown[], conflict = "id") {
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await db.from(table).upsert(chunk as never, { onConflict: conflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`${table}: ${rows.length} lignes`);
}

const cities = CITIES.map((c) => {
  const slug = slugify(c.name);
  return { ...c, slug, name_ar: CITY_NAME_AR[slug] ?? null };
});

const plans = [
  {
    code: "gratuit",
    name: "Gratuit",
    price_mad: 0,
    duration_days: 3650,
    trial_days: 0,
    visibility_boost: 0,
    max_requests_per_month: null,
    max_responses_per_month: 5,
    features: ["Fiche professeur publique", "5 mises en relation par mois"],
    badge: null,
    sort: 1,
    is_visible: true,
  },
  {
    code: "pro",
    name: "Pro",
    price_mad: 149,
    duration_days: 30,
    trial_days: 0,
    visibility_boost: 25,
    max_requests_per_month: null,
    max_responses_per_month: null,
    features: [
      "Mises en relation illimitées",
      "Mise en avant dans les résultats",
      "Badge Pro sur la fiche",
    ],
    badge: "Pro",
    sort: 2,
    is_visible: true,
  },
  {
    code: "pro_annuel",
    name: "Pro Annuel",
    price_mad: 1490,
    duration_days: 365,
    trial_days: 0,
    visibility_boost: 25,
    max_requests_per_month: null,
    max_responses_per_month: null,
    features: [
      "Tous les avantages Pro",
      "Deux mois offerts par rapport au mensuel",
      "Badge Pro sur la fiche",
    ],
    badge: "Pro Annuel",
    sort: 3,
    is_visible: true,
  },
];

const settings = [
  { key: "rate_range", value: { min: 40, max: 400 } },
  { key: "matching_weights", value: DEFAULT_WEIGHTS },
];

await upsert("subscription_plans", plans, "code");
await upsert("platform_settings", settings, "key");
await upsert("cities", cities);
await upsert("categories", CATEGORIES);
await upsert("levels", LEVELS);
await upsert("specialties", SPECIALTIES);
await upsert("services", SERVICES);

console.log("Données de référence réinjectées.");
