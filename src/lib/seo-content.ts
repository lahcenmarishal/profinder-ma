/**
 * Contenu SEO dérivé de données réelles : informations locales et FAQ.
 * Rien n'est généré si la donnée n'existe pas (pas de remplissage artificiel).
 */
import { LEVELS } from "@/lib/catalog";
import { isFlexible, type ProfessionalRow } from "@/lib/marketplace";
import type { SeoFilter, SeoLang } from "@/lib/seo-taxonomy";

export type InfoItem = { title: string; text: string };

const CYCLE_AR: Record<string, string> = {
  Primaire: "الابتدائي",
  "Collège": "الإعدادي",
  "Lycée": "الثانوي التأهيلي",
  "Supérieur": "التعليم العالي",
};

const cycleOf = (levelId: string) => LEVELS.find((l) => l.id === levelId)?.cycle ?? null;

/** Informations locales réelles : modes de cours, disponibilités, niveaux, tarifs. */
export function localInfo(lang: SeoLang, pros: ProfessionalRow[], filter: SeoFilter): InfoItem[] {
  if (pros.length === 0) return [];
  const fr = lang === "fr";
  const cityFr = filter.city ? ` à ${filter.city.fr}` : " au Maroc";
  const cityAr = filter.city ? ` ${filter.city.arIn}` : " في المغرب";
  const items: InfoItem[] = [];

  const home = pros.filter((p) => p.mode_home).length;
  const online = pros.filter((p) => p.mode_online).length;
  const studio = pros.filter((p) => p.mode_studio).length;
  const modes: string[] = [];
  if (home) modes.push(fr ? `${home} à domicile` : `${home} في منزل التلميذ`);
  if (studio) modes.push(fr ? `${studio} chez le professeur` : `${studio} عند الأستاذ`);
  if (online) modes.push(fr ? `${online} en ligne` : `${online} عن بُعد`);
  if (modes.length > 0) {
    items.push({
      title: fr ? "Modes de cours" : "طرق التدريس",
      text: fr
        ? `Sur les ${pros.length} professeurs référencés${cityFr} : ${modes.join(", ")}. Vous choisissez le mode au moment de la demande.`
        : `من بين ${pros.length} أستاذ مسجل${cityAr}: ${modes.join("، ")}. تختار الطريقة عند إرسال طلبك.`,
    });
  }

  const rates = pros.map((p) => p.hourly_rate).filter((r) => r > 0);
  if (rates.length > 0) {
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    items.push({
      title: fr ? "Tarifs constatés" : "الأسعار المعتمدة",
      text: fr
        ? `Les tarifs horaires annoncés vont de ${min} à ${max} DH/h${cityFr}. Chaque professeur fixe librement son tarif ; il est affiché sur son profil.`
        : `تتراوح الأسعار المعلنة بين ${min} و${max} درهم للساعة${cityAr}. كل أستاذ يحدد سعره بنفسه وهو معروض في ملفه.`,
    });
  }

  const cycles = Array.from(
    new Set(pros.flatMap((p) => p.professional_levels.map((l) => cycleOf(l.level_id))).filter(Boolean) as string[]),
  );
  if (cycles.length > 0) {
    items.push({
      title: fr ? "Niveaux couverts" : "المستويات المتاحة",
      text: fr
        ? `Niveaux réellement enseignés${cityFr} : ${cycles.join(", ")}.`
        : `المستويات المدرَّسة فعلياً${cityAr}: ${cycles.map((c) => CYCLE_AR[c] ?? c).join("، ")}.`,
    });
  }

  const flexible = pros.filter((p) => isFlexible(p.professional_availability)).length;
  const withSlots = pros.filter(
    (p) => p.professional_availability.length > 0 && !isFlexible(p.professional_availability),
  ).length;
  if (flexible + withSlots > 0) {
    items.push({
      title: fr ? "Disponibilités" : "التوفر",
      text: fr
        ? `${flexible} professeur${flexible > 1 ? "s ont" : " a"} des horaires flexibles et ${withSlots} indique${withSlots > 1 ? "nt" : ""} des créneaux précis (soir et week-end principalement).`
        : `${flexible} أستاذ بأوقات مرنة و${withSlots} يحددون حصصاً في أوقات معينة (المساء ونهاية الأسبوع أساساً).`,
    });
  }

  const verified = pros.filter((p) => p.is_verified).length;
  if (verified > 0) {
    items.push({
      title: fr ? "Profils vérifiés" : "ملفات موثوقة",
      text: fr
        ? `${verified} professeur${verified > 1 ? "s" : ""} sur ${pros.length} ${verified > 1 ? "ont" : "a"} passé la vérification d'identité et de diplômes de Profinder.`
        : `${verified} من أصل ${pros.length} أستاذ اجتازوا التحقق من الهوية والشهادات عبر Profinder.`,
    });
  }
  return items;
}

/** FAQ utile : questions réellement posées, réponses fondées sur le fonctionnement du site. */
export function seoFaq(lang: SeoLang, filter: SeoFilter, count: number): Array<{ q: string; a: string }> {
  const fr = lang === "fr";
  const subjFr = filter.subject ? filter.subject.fr.toLowerCase() : "soutien scolaire";
  const subjAr = filter.subject ? filter.subject.ar : "الدعم المدرسي";
  const cityFr = filter.city ? ` à ${filter.city.fr}` : " au Maroc";
  const cityAr = filter.city ? ` ${filter.city.arIn}` : " في المغرب";

  if (fr) {
    return [
      {
        q: `Comment trouver un professeur de ${subjFr}${cityFr} ?`,
        a: `Consultez les profils listés sur cette page, comparez les tarifs, les niveaux et les avis, puis envoyez une demande au professeur choisi. Vous pouvez aussi publier votre demande gratuitement : les professeurs disponibles vous répondent, généralement sous 24 h.`,
      },
      {
        q: "Quels niveaux sont disponibles ?",
        a: "Du primaire au supérieur : primaire, collège, lycée (tronc commun, 1ère et 2ème année Bac) ainsi que licence et master. Chaque profil indique précisément les niveaux qu'il accepte.",
      },
      {
        q: "Peut-on suivre les cours en ligne ?",
        a: "Oui, si le professeur propose ce mode. Chaque fiche précise si les cours se font à domicile, chez le professeur ou en ligne ; vous indiquez votre préférence dans la demande.",
      },
      {
        q: "Comment contacter un professeur ?",
        a: "Depuis sa fiche, utilisez le bouton de demande : le professeur reçoit votre message avec la matière, le niveau et vos disponibilités. L'échange et la mise en relation sont gratuits pour l'élève.",
      },
      {
        q: "Combien coûte un cours particulier ?",
        a: count > 0
          ? "Les tarifs sont affichés à l'heure sur chaque profil et varient selon la matière, le niveau et l'expérience du professeur. Aucun frais n'est ajouté par Profinder côté élève."
          : "Les tarifs sont fixés librement par chaque professeur et affichés à l'heure sur son profil. Publiez votre demande pour recevoir des propositions chiffrées.",
      },
    ];
  }
  return [
    {
      q: `كيف أجد ${filter.subject ? filter.subject.arTeacher : "أستاذاً خصوصياً"}${cityAr}؟`,
      a: `تصفح الملفات المعروضة في هذه الصفحة، قارن الأسعار والمستويات والآراء، ثم أرسل طلبك إلى الأستاذ المناسب. يمكنك أيضاً نشر طلبك مجاناً ليتجاوب معك الأساتذة المتاحون عادة خلال 24 ساعة.`,
    },
    {
      q: "ما هي المستويات المتاحة؟",
      a: "من الابتدائي إلى التعليم العالي: الابتدائي، الإعدادي، الثانوي التأهيلي (الجذع المشترك، الأولى والثانية باكالوريا)، إضافة إلى الإجازة والماستر. كل ملف يوضح المستويات التي يقبلها الأستاذ.",
    },
    {
      q: "هل يمكن متابعة الدروس عن بُعد؟",
      a: "نعم إذا كان الأستاذ يوفر هذه الصيغة. كل ملف يبين إن كانت الدروس في المنزل أو عند الأستاذ أو عن بُعد، وتختار أنت الصيغة المناسبة عند إرسال الطلب.",
    },
    {
      q: "كيف أتواصل مع الأستاذ؟",
      a: "من صفحة الأستاذ، استعمل زر الطلب: يصله طلبك مع المادة والمستوى وأوقات توفرك. التواصل والربط مجانيان بالنسبة للتلميذ.",
    },
    {
      q: `كم يكلف درس ${subjAr}؟`,
      a: "السعر بالساعة معروض في كل ملف ويختلف حسب المادة والمستوى وخبرة الأستاذ. Profinder لا يضيف أي عمولة على التلميذ.",
    },
  ];
}
