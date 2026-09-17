import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  MOMENTS,
  flexibleSlots,
  formatAvailability,
  isFlexible,
  WEEKDAYS,
  choiceFromSlots,
  slotsFromChoice,
  type MomentKey,
  type Slot,
} from "@/lib/marketplace";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * Disponibilité souhaitée : jour(s) + moment (Matin / Après-midi / Soir),
 * ou « Flexible » (aucune contrainte). Bloc repliable : fermé par défaut,
 * l'utilisateur ouvre « Sélectionner ma disponibilité ▾ », choisit, valide,
 * puis le bloc affiche un résumé (« Lundi, Mercredi · Après-midi »).
 */
export function AvailabilityPicker({
  value,
  onChange,
  label = "Disponibilité souhaitée",
  hint,
}: {
  value: Slot[];
  onChange: (slots: Slot[]) => void;
  label?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const { weekdays, moments } = choiceFromSlots(value);
  const flexible = isFlexible(value);
  const hasSelection = value.length > 0;

  const apply = (days: number[], mom: MomentKey[]) => {
    if (days.length === 0 || mom.length === 0) {
      onChange([]);
      return;
    }
    onChange(slotsFromChoice(days, mom));
  };

  const toggleDay = (d: number) => {
    const next = weekdays.includes(d) ? weekdays.filter((x) => x !== d) : [...weekdays, d];
    apply(next, moments.length > 0 ? moments : ["afternoon"]);
  };

  const toggleMoment = (m: MomentKey) => {
    const next = moments.includes(m) ? moments.filter((x) => x !== m) : [...moments, m];
    apply(weekdays.length > 0 ? weekdays : [DAY_ORDER[0]!], next);
  };

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-card text-muted-foreground hover:border-primary/40"
    }`;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>

      {/* Déclencheur : ouvre / rouvre le bloc d'options */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-left text-sm font-medium text-foreground transition hover:border-primary/40"
      >
        {hasSelection ? (
          <span>{formatAvailability(value)}</span>
        ) : (
          <span className="text-muted-foreground">Sélectionner ma disponibilité</span>
        )}
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {hint ??
              "Choisissez vos jours et moments disponibles, ou sélectionnez « Flexible »."}
          </p>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Jour(s)</p>
            <div className="flex flex-wrap gap-2">
              {DAY_ORDER.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={weekdays.includes(d)}
                  onClick={() => toggleDay(d)}
                  className={chip(weekdays.includes(d))}
                >
                  {WEEKDAYS[d]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Moment</p>
            <div className="flex flex-wrap gap-2">
              {MOMENTS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  aria-pressed={moments.includes(m.key)}
                  onClick={() => toggleMoment(m.key)}
                  className={chip(moments.includes(m.key))}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              checked={flexible}
              onChange={(e) => {
                if (e.target.checked) onChange(flexibleSlots());
                else apply([3], ["afternoon"]);
              }}
            />
            Flexible (tous les jours / tous les moments)
          </label>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Check className="size-3.5" />
            Valider
          </button>
        </div>
      )}
    </div>
  );
}
