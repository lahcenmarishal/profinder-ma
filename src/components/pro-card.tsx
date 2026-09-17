import { Link } from "@tanstack/react-router";
import type { ProfessionalRow, Slot } from "@/lib/marketplace";
import { serviceName, cityName, isFlexible } from "@/lib/marketplace";
import { useLanguage } from "@/lib/i18n";
import { VerifiedBadge } from "@/components/verified-badge";
import { RatingBadge } from "@/components/rating-badge";
import { RequestProButton } from "@/components/request-pro";

export function subjectsOf(pro: ProfessionalRow) {
  const names = pro.professional_services
    .map((s) => serviceName(s.service_id))
    .filter((n): n is string => Boolean(n))
    // éviter les répétitions d'une même matière présente dans plusieurs niveaux
    .map((n) => n.replace(/\s*\([^)]*\)\s*$/, "").trim());
  return Array.from(new Set(names));
}

/**
 * Modes de cours sans répéter « cours » : le premier libellé le porte,
 * les suivants sont raccourcis (« cours à domicile 🏠, en ligne 💻 »).
 * En arabe : « الدرس في المنزل 🏠، عن بُعد 💻، عند الأستاذ 👨‍🏫 ».
 */
export function modesOf(
  pro: { mode_home?: boolean | null; mode_online?: boolean | null; mode_studio?: boolean | null },
  ar: boolean,
) {
  const fr = { home: "cours à domicile 🏠", online: "en ligne 💻", studio: "chez le professeur 👨‍🏫" };
  const arL = { home: "الدرس في المنزل 🏠", online: "عن بُعد 💻", studio: "عند الأستاذ 👨‍🏫" };
  const l = ar ? arL : fr;
  const modes: string[] = [];
  if (pro.mode_home) modes.push(l.home);
  if (pro.mode_online) modes.push(l.online);
  if (pro.mode_studio) modes.push(l.studio);
  return modes;
}

const DAY_SHORT_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DAY_SHORT_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/** « Flexible » si le professeur est disponible tous les jours / tous les moments. */
export function availabilityLabel(pro: { professional_availability?: Slot[] }, ar: boolean) {
  const slots = pro.professional_availability ?? [];
  if (isFlexible(slots as Slot[])) return "Flexible";
  const names = ar ? DAY_SHORT_AR : DAY_SHORT_FR;
  const set = new Set(slots.map((s) => s.weekday));
  const days = [1, 2, 3, 4, 5, 6, 0].filter((d) => set.has(d)).map((d) => names[d]);
  return days.length > 0 ? days.join(ar ? "، " : " · ") : null;
}


export function ProCard({
  pro,
  distance,
  highlight = false,
  action,
}: {
  pro: ProfessionalRow;
  distance?: number | null;
  highlight?: boolean;
  action?: React.ReactNode;
}) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const subjects = subjectsOf(pro);
  const modes = modesOf(pro, ar);
  const city = cityName(pro.city_id);
  const availability = availabilityLabel(pro, ar);

  // La ville n'apparaît que si un cours en présentiel est possible
  // (à domicile ou chez le professeur) ; cours 100 % en ligne → pas de ville.
  const cityPart =
    (pro.mode_home || pro.mode_studio) && city
      ? `📍 ${[city, distance != null ? `${distance} km` : null].filter(Boolean).join(" · ")}`
      : null;
  const meta = [cityPart, modes.length > 0 ? modes.join(", ") : null].filter(Boolean) as string[];

  return (
    <div
      className={
        "relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md " +
        (highlight ? "border-primary/30" : "border-border")
      }
    >
      <div className="relative">
        {pro.photo_url ? (
          <img
            src={pro.photo_url}
            alt={
              subjects.length > 0
                ? `${pro.display_name}, professeur de ${subjects[0]?.toLowerCase()}${city ? ` à ${city}` : ""}`
                : `${pro.display_name}, professeur particulier${city ? ` à ${city}` : ""}`
            }
            loading="lazy"
            decoding="async"
            width={640}
            height={480}
            className="aspect-[4/3] w-full bg-muted object-cover"
          />
        ) : (
          /* Aucune photo publiée : espace réservé (même ratio) plutôt qu'une image factice. */
          <div
            aria-hidden="true"
            className="flex aspect-[4/3] w-full items-center justify-center bg-muted text-5xl font-extrabold text-muted-foreground/50"
          >
            {pro.display_name.trim().charAt(0).toUpperCase()}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/85 to-transparent p-4 pt-12">
          <h3 className="flex items-center gap-2 text-xl font-extrabold leading-tight text-background">
            <span className="truncate" data-no-translate>
              {pro.display_name}
            </span>
            <VerifiedBadge verified={pro.verification_status === "verified"} compact />
          </h3>
          {meta.length > 0 && (
            /* Français : libellé plus compact pour tenir dans la carte. */
            <p
              className={
                "truncate font-medium text-background/85 " +
                (ar ? "text-sm" : "text-[12.5px] leading-snug tracking-tight")
              }
            >
              {meta.join(" · ")}
            </p>
          )}
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-card/95 px-3 py-1 text-sm font-extrabold shadow-sm">
          {Number(pro.hourly_rate) > 0 ? (
            <>
              {Number(pro.hourly_rate)} DH<span className="text-xs font-medium">/h</span>
            </>
          ) : (
            <span className="text-sm font-semibold">Tarif à discuter</span>
          )}
        </div>
        {pro.plan_code !== "gratuit" && (
          <div className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
            Pro
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {Number(pro.rating_count ?? 0) > 0 && (
          <RatingBadge
            average={pro.rating_avg}
            count={pro.rating_count}
            className="mb-2 text-sm text-foreground"
          />
        )}

        <div className="text-sm">
          <span className="font-semibold text-foreground">Disponibilité : </span>
          <span className="text-muted-foreground">{availability ?? "à convenir"}</span>
        </div>

        {subjects.length > 0 && (
          <p className="mt-1 line-clamp-2 text-sm font-bold text-primary">
            {subjects.slice(0, 4).join(" · ")}
            {subjects.length > 4 ? ` +${subjects.length - 4}` : ""}
          </p>
        )}



        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          {action ?? (
            <>
              <Link
                to="/professeurs/$id"
                params={{ id: pro.id }}
                className="rounded-lg border border-border px-4 py-2.5 text-center text-sm font-semibold hover:bg-muted"
              >
                Voir le profil
              </Link>
              <RequestProButton
                pro={{
                  id: pro.id,
                  category_id: pro.category_id,
                  city_id: pro.city_id,
                  user_id: pro.user_id,
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
