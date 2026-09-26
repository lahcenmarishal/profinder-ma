import {
  Atom,
  BookOpen,
  Calculator,
  FlaskConical,
  Languages,
  Music2,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PortraitGender = "female" | "male" | null | undefined;

function firstNameOf(name: string) {
  const cleaned = name.replace(/^prof(?:esseur)?\.?\s+/i, "").trim();
  return cleaned.split(/\s+/)[0] || "Professeur";
}

// Abréviation de la matière (2 lettres) affichée dans le médaillon à la
// place des initiales du nom. "PC" = Physique-Chimie, "FR" = Français, etc.
function subjectCodeOf(subject?: string | null | undefined): string {
  const value = (subject ?? "").toLocaleLowerCase();
  if (!value) return "PF";
  if (/phys|chim/.test(value)) return "PC";
  if (/math|calcul|comptab/.test(value)) return "MA";
  if (/français|francais/.test(value)) return "FR";
  if (/anglais/.test(value)) return "EN";
  if (/arabe/.test(value)) return "AR";
  if (/espagnol/.test(value)) return "ES";
  if (/langue/.test(value)) return "LG";
  if (/informat|programm/.test(value)) return "IF";
  if (/électron/.test(value)) return "EL";
  if (/musique|piano|guitare/.test(value)) return "MU";
  if (/dessin/.test(value)) return "DS";
  if (/art|design/.test(value)) return "AT";
  if (/svt|biolog/.test(value)) return "SV";
  if (/science/.test(value)) return "SC";
  return "PF";
}

function SubjectIcon({ subject }: { subject?: string | null | undefined }) {
  const value = (subject ?? "").toLocaleLowerCase();
  const className = "size-full";
  if (/math|calcul|comptab/.test(value)) return <Calculator className={className} />;
  if (/phys|chim|science|svt|biolog/.test(value)) return <FlaskConical className={className} />;
  if (/français|francais|anglais|arabe|langue|espagnol/.test(value)) return <Languages className={className} />;
  if (/informat|programm|électron/.test(value)) return <Atom className={className} />;
  if (/musique|piano|guitare/.test(value)) return <Music2 className={className} />;
  if (/dessin|art|design/.test(value)) return <Palette className={className} />;
  return <BookOpen className={className} />;
}

// Palettes distinctes selon le genre — pas de silhouette humaine.
type Palette = {
  bg: string; // dégradé de fond
  ring: string; // anneau décoratif
  iconWrap: string; // pastille de l'icône
  monogram: string; // pastille initiales
  icon: string; // couleur icône
  text: string; // texte principal
  sub: string; // texte secondaire
};

const PALETTES: Record<"female" | "male" | "neutral", Palette> = {
  female: {
    bg: "bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-100",
    ring: "border-rose-200/70",
    iconWrap: "bg-rose-500/10",
    monogram: "bg-rose-500 text-white",
    icon: "text-rose-600",
    text: "text-rose-950",
    sub: "text-rose-700/70",
  },
  male: {
    bg: "bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100",
    ring: "border-sky-200/70",
    iconWrap: "bg-sky-500/10",
    monogram: "bg-sky-600 text-white",
    icon: "text-sky-700",
    text: "text-sky-950",
    sub: "text-sky-700/70",
  },
  neutral: {
    bg: "bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100",
    ring: "border-emerald-200/70",
    iconWrap: "bg-emerald-500/10",
    monogram: "bg-emerald-600 text-white",
    icon: "text-emerald-700",
    text: "text-emerald-950",
    sub: "text-emerald-700/70",
  },
};

export function AutomaticProPortrait({
  name,
  subject,
  subjects,
  gender,
  className,
  compact = false,
}: {
  name: string;
  subject?: string | null | undefined;
  subjects?: string[] | null | undefined;
  gender?: PortraitGender;
  className?: string;
  compact?: boolean;
}) {
  const firstName = firstNameOf(name);
  const key = gender === "female" ? "female" : gender === "male" ? "male" : "neutral";
  const p = PALETTES[key];
  // Liste des matières → abréviations uniques (PC, FR, …). Si la matière est
  // inconnue, on la regroupe sous "PF" affiché une seule fois.
  const srcList = subjects && subjects.length > 0 ? subjects : subject ? [subject] : [];
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const s of srcList) {
    const c = subjectCodeOf(s);
    if (!seen.has(c)) {
      seen.add(c);
      codes.push(c);
    }
  }
  if (codes.length === 0) codes.push("PF");
  const displayCodes = codes.slice(0, 4);

  return (
    <div
      role="img"
      aria-label={`Portrait illustré de Prof. ${firstName}${subject ? `, ${subject}` : ""}`}
      className={cn(
        "relative isolate flex aspect-[4/3] w-full flex-col items-center justify-center overflow-hidden",
        p.bg,
        className,
      )}
    >
      {/* Décor géométrique moderne — pas de silhouette humaine */}
      <div className={cn("absolute -right-10 -top-10 size-32 rounded-full border-[14px]", p.ring)} />
      <div className={cn("absolute -left-12 bottom-0 size-24 rounded-full border-[10px]", p.ring)} />
      <div className="absolute right-6 top-6 size-2.5 rounded-full bg-current opacity-30" />
      <div className="absolute bottom-8 left-8 h-10 w-1.5 rotate-12 rounded-full bg-current opacity-20" />

      {/* Icône de matière, grande et centrale */}
      <div className={cn("flex size-16 items-center justify-center rounded-2xl", p.iconWrap, "sm:size-20")}>
        <SubjectIcon subject={subject} />
      </div>

      {/* Médaillon(s) abréviation matière (ex. PC, FR) */}
      <div className={cn("mt-4 flex flex-wrap items-center justify-center gap-1.5", compact && "gap-1")}>
        {displayCodes.map((c) => (
          <span
            key={c}
            className={cn(
              "flex items-center justify-center rounded-full font-black tracking-tight shadow-sm",
              compact
                ? "min-w-[2rem] px-1.5 py-1 text-[11px]"
                : "size-11 text-sm",
              p.monogram,
            )}
          >
            {c}
          </span>
        ))}
        {codes.length > displayCodes.length && (
          <span className={cn("text-[10px] font-bold", p.sub)}>
            +{codes.length - displayCodes.length}
          </span>
        )}
      </div>

      {!compact && (
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-6 text-center">
          <p className={cn("truncate text-base font-extrabold sm:text-lg", p.text)} data-no-translate>
            Prof. {firstName}
          </p>
          <p className={cn("mt-0.5 truncate text-[10px] font-bold uppercase tracking-wide", p.sub)}>
            {subject || "Cours particuliers"}
          </p>
        </div>
      )}
    </div>
  );
}
