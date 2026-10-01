/** Gabarits HTML des emails ProFinder (styles en ligne, compatibles messageries). */

const BRAND = "#12a37c";
const INK = "#1b2333";
const MUTED = "#5b6577";
const BORDER = "#e6e9ef";

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type LayoutArgs = {
  title: string;
  intro: string;
  body?: string;
  cta?: { label: string; url: string };
  footnote?: string;
  siteUrl: string;
};

export function layout({ title, intro, body, cta, footnote, siteUrl }: LayoutArgs): string {
  const logoUrl = `${siteUrl.replace(/\/$/, "")}/logo.png`;
  return `<!doctype html>
<html lang="fr">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /><title>${escape(title)}</title></head>
  <body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;color:${INK}">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px">
      <div style="text-align:center">
        <img src="${escape(logoUrl)}" alt="ProFinder" width="160" style="width:160px;height:auto;display:block;margin:0 auto" />
      </div>
      <div style="margin-top:20px;border:1px solid ${BORDER};border-radius:16px;padding:28px 24px">
        <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:bold;color:${INK}">${escape(title)}</h1>
        <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:${MUTED}">${intro}</p>
        ${body ? `<div style="margin:16px 0 0;font-size:15px;line-height:1.6;color:${MUTED}">${body}</div>` : ""}
        ${
          cta
            ? `<div style="margin-top:24px"><a href="${escape(cta.url)}" style="display:inline-block;background-color:${BRAND};color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 24px;border-radius:12px">${escape(cta.label)}</a></div>
        <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:${MUTED};word-break:break-all">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br />${escape(cta.url)}</p>`
            : ""
        }
        ${footnote ? `<p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:${MUTED}">${footnote}</p>` : ""}
      </div>
      <p style="margin:20px 0 0;text-align:center;font-size:12px;color:${MUTED}">
        ProFinder — cours particuliers au Maroc · <a href="${escape(siteUrl)}" style="color:${BRAND};text-decoration:none">profinder.ma</a>
      </p>
    </div>
  </body>
</html>`;
}

export function verificationEmail(args: { url: string; siteUrl: string; isPro: boolean }) {
  return {
    subject: "Confirmez votre adresse email — ProFinder",
    html: layout({
      siteUrl: args.siteUrl,
      title: "Confirmez votre adresse email",
      intro: "Bienvenue sur ProFinder ! Confirmez votre adresse pour activer votre compte.",
      body: args.isPro
        ? "Après confirmation, vous pourrez compléter votre profil professeur et recevoir vos premières demandes de cours."
        : "Après confirmation, vous pourrez publier votre demande et recevoir des propositions de professeurs.",
      cta: { label: "Confirmer mon email", url: args.url },
      footnote: "Ce lien est valable 24 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.",
    }),
  };
}

export function welcomeEmail(args: { siteUrl: string; isPro: boolean; name?: string | null }) {
  const hello = args.name ? `Bonjour ${escape(args.name)},` : "Bonjour,";
  return {
    subject: args.isPro
      ? "Bienvenue sur ProFinder — votre espace professeur"
      : "Bienvenue sur ProFinder",
    html: layout({
      siteUrl: args.siteUrl,
      title: "Votre compte est actif 🎉",
      intro: `${hello} votre adresse email est confirmée et votre compte ProFinder est prêt.`,
      body: args.isPro
        ? "Complétez votre profil (matières, niveaux, ville, tarif et disponibilités) pour apparaître dans les recherches et recevoir des demandes d'élèves."
        : "Décrivez votre besoin en quelques minutes : matière, niveau, ville et disponibilités. Les professeurs correspondants vous répondront directement.",
      cta: args.isPro
        ? { label: "Compléter mon profil professeur", url: `${args.siteUrl}/pro/inscription` }
        : { label: "Publier ma demande", url: `${args.siteUrl}/publier` },
    }),
  };
}

export function recoveryEmail(args: { url: string; siteUrl: string }) {
  return {
    subject: "Réinitialisation de votre mot de passe — ProFinder",
    html: layout({
      siteUrl: args.siteUrl,
      title: "Réinitialiser votre mot de passe",
      intro: "Vous avez demandé à changer le mot de passe de votre compte ProFinder.",
      cta: { label: "Choisir un nouveau mot de passe", url: args.url },
      footnote:
        "Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email : votre mot de passe reste inchangé.",
    }),
  };
}

export function onboardingReminderEmail(args: { siteUrl: string; name?: string | null }) {
  const hello = args.name ? `Bonjour ${escape(args.name)},` : "Bonjour,";
  return {
    subject: "Finalisez votre profil et profitez de 12 mois de PRO offerts — ProFinder",
    html: layout({
      siteUrl: args.siteUrl,
      title: "Votre profil professeur vous attend",
      intro: `${hello} vous avez commencé votre inscription sur ProFinder, mais votre profil n'est pas encore finalisé.`,
      body:
        "Terminez-le en quelques minutes pour l'envoyer à la vérification. Une fois votre profil vérifié, vous apparaîtrez dans les recherches des élèves et recevrez des demandes de cours près de chez vous.<br /><br /><strong>Offre de lancement :</strong> les 300 premiers professeurs vérifiés bénéficient d'<strong>1 an (12 mois) de PRO gratuit</strong>. Les places sont limitées.",
      cta: { label: "Finaliser mon profil", url: `${args.siteUrl}/pro/inscription` },
      footnote: "Vous recevez cet email car vous avez créé un compte professeur sur ProFinder.",
    }),
  };
}

export function newRequestEmail(args: { siteUrl: string; link: string; targeted: boolean }) {
  return {
    subject: args.targeted ? "Nouvelle demande directe — ProFinder" : "Nouvelle demande de cours pour vous",
    html: layout({
      siteUrl: args.siteUrl,
      title: args.targeted ? "Un élève vous a contacté" : "Une nouvelle demande correspond à votre profil",
      intro: args.targeted
        ? "Un élève vous a envoyé une demande directe de cours particuliers."
        : "Un élève recherche un professeur correspondant à vos matières et à votre ville.",
      body: "Répondez rapidement : les premiers professeurs à se manifester ont beaucoup plus de chances d'être choisis.",
      cta: { label: "Voir la demande", url: `${args.siteUrl}${args.link}` },
    }),
  };
}

export function proposalEmail(args: { siteUrl: string; link: string; proName: string }) {
  return {
    subject: "Un professeur est intéressé par votre demande",
    html: layout({
      siteUrl: args.siteUrl,
      title: "Vous avez reçu une proposition",
      intro: `${escape(args.proName)} est intéressé par votre demande de cours.`,
      body: "Consultez son profil, ses tarifs et ses disponibilités, puis échangez directement par message.",
      cta: { label: "Voir la proposition", url: `${args.siteUrl}${args.link}` },
    }),
  };
}
