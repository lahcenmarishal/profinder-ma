/** Textes éditoriaux FR/AR des pages de destination SEO. */
import type { SeoCity, SeoLang, SeoLevel, SeoSubject } from "@/lib/seo-taxonomy";

const BRAND = "Profinder";

/** Forme courte naturelle des matières dans un <title> ville+matière. */
const SUBJECT_SHORT_FR: Record<string, string> = {
  mathematiques: "maths",
  "physique-chimie": "physique-chimie",
  "histoire-geographie": "histoire-géo",
  gestion: "gestion",
};
/** Forme courte des niveaux (titres arabes et français). */
const LEVEL_SHORT: Record<string, { fr: string; ar: string }> = {
  lycee: { fr: "lycée", ar: "الثانوي" },
  college: { fr: "collège", ar: "الإعدادي" },
  primaire: { fr: "primaire", ar: "الابتدائي" },
  superieur: { fr: "supérieur", ar: "التعليم العالي" },
};

export const shortSubjectFr = (s: SeoSubject) => SUBJECT_SHORT_FR[s.slug] ?? s.fr.toLowerCase();
const shortLevel = (l: SeoLevel, lang: SeoLang) =>
  LEVEL_SHORT[l.slug]?.[lang] ?? (lang === "fr" ? l.fr.toLowerCase() : l.ar);
/** « أستاذ الرياضيات » → « أساتذة الرياضيات » */
const arTeachersPlural = (s: SeoSubject) => s.arTeacher.replace(/^أستاذ/, "أساتذة");

/** Titre unique : partie descriptive + marque, sans jamais tronquer la marque. */
export const withBrand = (lead: string, sep: "|" | "—" = "|") => {
  const max = 60 - BRAND.length - 3;
  // Coupe uniquement à une frontière de mot : jamais « Yous… » au milieu d'un nom.
  const cut = () => {
    const raw = lead.slice(0, max - 1);
    const space = raw.lastIndexOf(" ");
    return `${(space > max * 0.5 ? raw.slice(0, space) : raw).replace(/[\s,:—-]+$/, "")}…`;
  };
  const head = lead.length > max ? cut() : lead;
  return `${head} ${sep} ${BRAND}`;
};

export const label = {
  city: (c: SeoCity, lang: SeoLang) => (lang === "fr" ? c.fr : c.ar),
  subject: (s: SeoSubject, lang: SeoLang) => (lang === "fr" ? s.fr : s.ar),
  level: (l: SeoLevel, lang: SeoLang) => (lang === "fr" ? l.fr : l.ar),
};

export const NAV = {
  home: { fr: "Accueil", ar: "الرئيسية" },
  teachers: { fr: "Professeurs", ar: "الأساتذة" },
  courses: { fr: "Cours particuliers", ar: "دروس الدعم" },
  subjects: { fr: "Matières", ar: "المواد" },
  cities: { fr: "Villes", ar: "المدن" },
  levels: { fr: "Niveaux", ar: "المستويات" },
  blog: { fr: "Blog", ar: "المدونة" },
} as const;

export const nav = (key: keyof typeof NAV, lang: SeoLang) => NAV[key][lang];

type Copy = { h1: string; intro: string; title: string; description: string };

const trim160 = (s: string) => (s.length > 158 ? `${s.slice(0, 155)}…` : s);
/** `titleLead` = partie descriptive du <title>, la marque est ajoutée ici.
 *  `desc` = meta description propre à la page (sinon repli sur l'intro). */
const pack = (h1: string, intro: string, titleLead: string, desc?: string): Copy => ({
  h1,
  intro,
  title: withBrand(titleLead),
  description: trim160(desc ?? intro),
});

export function teachersCopy(
  lang: SeoLang,
  city: SeoCity | null,
  subject: SeoSubject | null,
  level: SeoLevel | null,
): Copy {
  const c = city ? label.city(city, lang) : null;
  const s = subject ? label.subject(subject, lang) : null;
  const l = level ? label.level(level, lang) : null;
  if (lang === "fr") {
    const parts = [s ? `de ${s}` : null, l ? `niveau ${l}` : null, c ? `à ${c}` : null].filter(Boolean);
    const suffix = parts.length ? ` ${parts.join(" ")}` : "";
    // Titres FR selon l'intention : générique, ville, matière, ville+matière(+niveau).
    let lead: string;
    if (subject && city) {
      lead = `Professeur de ${shortSubjectFr(subject)}${level ? ` ${shortLevel(level, "fr")}` : ""} à ${c}`;
    } else if (subject) {
      lead = `Professeurs de ${subject.fr.toLowerCase()} au Maroc`;
    } else if (city) {
      lead = `Professeurs particuliers${level ? ` ${shortLevel(level, "fr")}` : ""} à ${c}`;
    } else {
      lead = `Professeurs particuliers${level ? ` ${shortLevel(level, "fr")}` : ""} au Maroc`;
    }
    // Meta description propre à l'intention (ville / matière / niveau).
    let descFr: string;
    if (subject && city) {
      descFr = `Trouvez un professeur de ${subject.fr.toLowerCase()}${l ? ` niveau ${l}` : ""} à ${c} sur Profinder. Consultez les profils, niveaux enseignés, disponibilités et tarifs horaires.`;
    } else if (subject) {
      descFr = `Professeurs de ${subject.fr.toLowerCase()}${l ? ` pour le niveau ${l}` : ""} partout au Maroc : profils vérifiés, ville d'intervention, tarif horaire et avis d'élèves.`;
    } else if (city) {
      descFr = `Professeurs particuliers à ${c}${l ? ` pour le niveau ${l}` : ""} : comparez les matières enseignées, les tarifs et les disponibilités, puis contactez le professeur qui vous convient.`;
    } else {
      descFr = `Comparez les professeurs particuliers au Maroc${l ? ` pour le niveau ${l}` : ""} : matière, ville, tarif horaire et avis. Publiez votre demande et recevez des propositions en 24 h.`;
    }
    return pack(
      `Professeurs particuliers${suffix}`,
      `Trouvez un professeur particulier${suffix} : profils vérifiés, tarif horaire, avis d'élèves et disponibilités. Publiez votre demande et recevez des propositions en moins de 24 h.`,
      lead,
      descFr,
    );
  }
  // Arabe : formulations naturelles marocaines (أستاذ خصوصي / أستاذ الرياضيات / في المدينة)
  const teacher = subject ? subject.arTeacher : "أستاذ خصوصي";
  const h1 = [`${teacher}`, l ? `لمستوى ${l}` : null, city ? city.arIn : null].filter(Boolean).join(" ");
  const intro = [
    `اعثر على ${teacher}${city ? ` ${city.arBi}` : " في المغرب"}`,
    l ? `لمستوى ${l}` : null,
    ": ملفات موثوقة، السعر بالساعة، آراء التلاميذ والتوفر. انشر طلبك واستقبل عروض الأساتذة في أقل من 24 ساعة.",
  ]
    .filter(Boolean)
    .join(" ")
    .replace(" :", ":");
  const lvlAr = level ? shortLevel(level, "ar") : "";
  const levelAr = lvlAr ? (lvlAr.startsWith("ال") ? `لل${lvlAr.slice(2)}` : `لـ${lvlAr}`) : "";
  let leadAr: string;
  if (subject && city) {
    leadAr = [subject.arTeacher, levelAr, city.arIn].filter(Boolean).join(" ");
  } else if (subject) {
    leadAr = [arTeachersPlural(subject), levelAr, "في المغرب"].filter(Boolean).join(" ");
  } else if (city) {
    leadAr = ["أساتذة خصوصيون", levelAr, city.arIn].filter(Boolean).join(" ");
  } else {
    leadAr = ["أساتذة خصوصيون", levelAr, "في المغرب"].filter(Boolean).join(" ");
  }
  // Meta description arabe propre à l'intention (مدينة / مادة / مستوى).
  let descAr: string;
  if (subject && city) {
    descAr = `ابحث عن ${subject.arTeacher}${lvlAr ? ` لمستوى ${lvlAr}` : ""} ${city.arIn} عبر Profinder. اكتشف الأساتذة المتاحين حسب المستوى والمادة وطريقة التدريس والسعر.`;
  } else if (subject) {
    descAr = `${arTeachersPlural(subject)} في المغرب${lvlAr ? ` لمستوى ${lvlAr}` : ""}: ملفات موثوقة، المدينة، السعر بالساعة وآراء التلاميذ على Profinder.`;
  } else if (city) {
    descAr = `أساتذة خصوصيون ${city.arIn}${lvlAr ? ` لمستوى ${lvlAr}` : ""}: قارن المواد المدرّسة والأسعار والتوفر، واختر الأستاذ المناسب لك عبر Profinder.`;
  } else {
    descAr = `قارن الأساتذة الخصوصيين في المغرب${lvlAr ? ` لمستوى ${lvlAr}` : ""}: المادة، المدينة، السعر بالساعة والآراء. انشر طلبك واستقبل العروض في 24 ساعة.`;
  }
  return pack(h1, intro, leadAr, descAr);
}

export function coursesCopy(lang: SeoLang, city: SeoCity | null, subject: SeoSubject | null): Copy {
  const c = city ? label.city(city, lang) : null;
  const s = subject ? label.subject(subject, lang) : null;
  if (lang === "fr") {
    const suffix = [s ? `de ${s}` : null, c ? `à ${c}` : null].filter(Boolean).join(" ");
    const t = suffix ? ` ${suffix}` : "";
    const descFr = city
      ? `Réservez des cours particuliers${s ? ` de ${s}` : ""} à ${c} : à domicile, chez le professeur ou en ligne. Tarifs, niveaux enseignés et disponibilités sur Profinder.`
      : s
        ? `Cours particuliers de ${s} au Maroc : trouvez un professeur par ville et par niveau, comparez les tarifs horaires et réservez votre premier cours.`
        : `Cours particuliers et soutien scolaire au Maroc : choisissez une ville et une matière, comparez les professeurs vérifiés et réservez à domicile ou en ligne.`;
    return pack(`Cours particuliers${t}`, `Cours particuliers${t} à domicile, chez le professeur ou en ligne. Comparez les tarifs, les niveaux enseignés et réservez avec un professeur vérifié.`, `Cours particuliers${t}`, descFr);
  }
  const t = [s ? `في ${s}` : null, city ? city.arIn : null].filter(Boolean).join(" ");
  const h1 = `دروس خصوصية${t ? ` ${t}` : " في المغرب"}`;
  const descAr = city
    ? `احجز دروسا خصوصية${s ? ` في ${s}` : ""} ${city.arIn}: في المنزل أو عند الأستاذ أو عن بُعد. الأسعار والمستويات والتوفر عبر Profinder.`
    : s
      ? `دروس الدعم في ${s} بالمغرب: اختر الأستاذ حسب المدينة والمستوى، قارن الأسعار بالساعة واحجز درسك الأول.`
      : `دروس خصوصية ودعم مدرسي في المغرب: اختر المدينة والمادة، قارن الأساتذة الموثوقين واحجز في المنزل أو عن بُعد.`;
  return pack(
    h1,
    `${s ? `دروس الدعم في ${s}` : "دروس الدعم المدرسي"}${city ? ` ${city.arBi}` : ""}: في المنزل أو عند الأستاذ أو عن بُعد. قارن الأسعار والمستويات واحجز مع أستاذ موثوق.`,
    `${h1}`,
    descAr,
  );
}

export function subjectHubCopy(lang: SeoLang): Copy {
  return lang === "fr"
    ? pack(
        "Matières enseignées",
        "Toutes les matières couvertes par les professeurs particuliers au Maroc : mathématiques, physique-chimie, SVT, langues, philosophie, informatique et économie.",
        `Matières — cours particuliers au Maroc`,
      )
    : pack(
        "المواد الدراسية",
        "جميع المواد التي يدرّسها الأساتذة الخصوصيون في المغرب: الرياضيات، الفيزياء والكيمياء، علوم الحياة والأرض، اللغات، الفلسفة، المعلوميات، الاقتصاد والمحاسبة.",
        `المواد — دروس خصوصية بالمغرب`,
      );
}

export function cityHubCopy(lang: SeoLang): Copy {
  return lang === "fr"
    ? pack(
        "Villes couvertes",
        "Professeurs particuliers disponibles dans les principales villes du Maroc : Casablanca, Rabat, Marrakech, Fès, Tanger, Agadir et plus encore.",
        `Villes — professeurs particuliers`,
      )
    : pack(
        "المدن المغطاة",
        "أساتذة خصوصيون متاحون في أهم المدن المغربية: بالدار البيضاء، بالرباط، بمراكش، بفاس، بطنجة وبأكادير وغيرها.",
        `المدن — أساتذة خصوصيون`,
      );
}

export function levelHubCopy(lang: SeoLang): Copy {
  return lang === "fr"
    ? pack(
        "Niveaux scolaires",
        "Du primaire au supérieur : trouvez un professeur particulier adapté au niveau de l'élève, avec un accompagnement par cycle et par matière.",
        `Niveaux scolaires — soutien scolaire`,
      )
    : pack(
        "المستويات الدراسية",
        "من الابتدائي والإعدادي إلى الجذع المشترك والباكالوريا ثم الإجازة والماستر: اعثر على أستاذ خصوصي مناسب لمستوى التلميذ.",
        `المستويات الدراسية — الدعم المدرسي`,
      );
}

export function levelCopy(lang: SeoLang, level: SeoLevel): Copy {
  const l = label.level(level, lang);
  return lang === "fr"
    ? pack(
        `Soutien scolaire ${l}`,
        `Professeurs particuliers spécialisés dans le niveau ${l} : méthodes adaptées, préparation aux contrôles et aux examens, suivi régulier des progrès.`,
        `Soutien scolaire ${l}`,
        `Trouvez un professeur particulier pour le niveau ${l} au Maroc sur Profinder : matières couvertes, villes, tarifs horaires et disponibilités des enseignants.`,
      )
    : pack(
        `الدعم المدرسي ${l}`,
        `أساتذة خصوصيون متخصصون في مستوى ${l}: طرق ملائمة، التحضير للفروض والامتحانات ومتابعة منتظمة للتقدم.`,
        `الدعم المدرسي ${l}`,
        `ابحث عن أستاذ خصوصي لمستوى ${l} في المغرب عبر Profinder: المواد المتاحة، المدن، الأسعار بالساعة وتوفر الأساتذة.`,
      );
}

export function subjectCopy(lang: SeoLang, subject: SeoSubject): Copy {
  const s = label.subject(subject, lang);
  return lang === "fr"
    ? pack(
        `Cours de ${s}`,
        `Professeurs de ${s} au Maroc : tous niveaux, cours à domicile ou en ligne, tarifs transparents et avis vérifiés d'élèves.`,
        `Cours de ${s}`,
        `Trouvez un professeur de ${s.toLowerCase()} au Maroc sur Profinder. Consultez les profils par ville, les niveaux enseignés, les disponibilités et les tarifs.`,
      )
    : pack(
        `دروس ${s}`,
        `${subject.arTeacher} في المغرب: جميع المستويات، دروس الدعم في المنزل أو عن بُعد، أسعار واضحة وآراء موثوقة.`,
        `دروس ${s}`,
        `ابحث عن ${subject.arTeacher} في المغرب عبر Profinder. اكتشف الأساتذة حسب المدينة والمستوى وطريقة التدريس والسعر بالساعة.`,
      );
}

export function cityCopy(lang: SeoLang, city: SeoCity): Copy {
  const c = label.city(city, lang);
  return lang === "fr"
    ? pack(
        `Cours particuliers à ${c}`,
        `Soutien scolaire à ${c} : professeurs vérifiés par matière et par niveau, cours à domicile ou en ligne, réponse à votre demande en moins de 24 h.`,
        `Cours particuliers à ${c}`,
        `Trouvez un professeur particulier à ${c} sur Profinder. Consultez les profils par matière, les niveaux enseignés, les disponibilités et les tarifs horaires.`,
      )
    : pack(
        `دروس خصوصية ${city.arIn}`,
        `الدعم المدرسي ${city.arBi}: أساتذة موثوقون حسب المادة والمستوى، دروس في المنزل أو عن بُعد، ورد على طلبك في أقل من 24 ساعة.`,
        `دروس خصوصية ${city.arIn}`,
        `ابحث عن أستاذ خصوصي ${city.arIn} عبر Profinder. اكتشف الأساتذة المتاحين حسب المادة والمستوى وطريقة التدريس والسعر.`,
      );
}

export function homeCopy(lang: SeoLang): Copy {
  return lang === "fr"
    ? {
        ...pack(
          "Trouver un professeur particulier au Maroc",
          "ProFinder met en relation élèves et professeurs particuliers vérifiés partout au Maroc : choisissez une matière, un niveau et une ville, puis recevez des propositions.",
          "Professeurs particuliers au Maroc",
        ),
        title: `${BRAND} — Trouvez un professeur particulier au Maroc`,
      }
    : {
        ...pack(
          "ابحث عن أستاذ خصوصي في المغرب",
          "ProFinder يربط التلاميذ بأساتذة خصوصيين موثوقين في كل المغرب: اختر المادة والمستوى والمدينة، ثم استقبل العروض.",
          "أساتذة خصوصيون في المغرب",
        ),
        title: `${BRAND} — ابحث عن أستاذ خصوصي في المغرب`,
      };
}
