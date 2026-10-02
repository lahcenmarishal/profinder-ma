import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ensureSession, isAdminUser } from "@/lib/auth-store";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site";
import { GoogleIcon } from "@/components/google-sign-in";
import { signInWithGoogle } from "@/lib/google-oauth";
import {
  consumeOAuthPending,
  ensureOAuthAccount,
  markOAuthPending,
  oauthReturnInProgress,
  resolvePostAuthTarget,
} from "@/lib/oauth-flow";
import { clearPendingRole } from "@/lib/pending-role";
import { tryPublishPendingDraft } from "@/lib/request-draft";
import { resumeClientFlow } from "@/lib/student-need";
import { sendPasswordResetEmail, signUpWithEmail } from "@/lib/email.functions";

type Role = "client" | "pro";

export const PENDING_ROLE_KEY = "profinder.pending_role";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search['mode'] === "signup" ? ("signup" as const) : ("signin" as const),
    role: search['role'] === "pro" ? ("pro" as Role) : ("client" as Role),
  }),
  head: () => ({
    meta: [
      { title: "Connexion & inscription — ProFinder" },
      {
        name: "description",
        content:
          "Créez votre compte ProFinder en tant que parent, élève ou professeur particulier et accédez aux demandes de cours.",
      },
      { property: "og:title", content: "Connexion & inscription — ProFinder" },
      {
        property: "og:description",
        content: "Rejoignez la marketplace de cours particuliers au Maroc.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  // Retour Google ou session déjà active : cette page n'est qu'un passage,
  // on affiche donc un écran de transition plutôt que le formulaire.
  const [redirecting, setRedirecting] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Retour Google interrompu (fenêtre fermée, accès refusé) : on ne laisse
    // jamais l'écran de transition tourner indéfiniment, on rend le formulaire.
    const abortPendingOAuth = (message?: string) => {
      consumeOAuthPending();
      clearPendingRole();
      if (cancelled) return;
      setRedirecting(false);
      if (message) toast.error(message);
    };

    const providerError = (() => {
      try {
        const params = new URLSearchParams(
          window.location.search + "&" + window.location.hash.replace(/^#/, ""),
        );
        return params.get("error_description") ?? params.get("error");
      } catch {
        return null;
      }
    })();

    if (providerError) {
      abortPendingOAuth("Connexion Google annulée. Vous pouvez réessayer.");
      return () => {
        cancelled = true;
      };
    }

    const url = window.location.search + window.location.hash;
    const hasProviderResponse = /(?:[?&#])(code|access_token)=/.test(url);

    if (oauthReturnInProgress()) {
      // Un marqueur seul peut rester après un retour manuel depuis Google. On
      // ne masque donc le formulaire que si Google a réellement répondu ou si
      // une session authentifiée est confirmée.
      if (hasProviderResponse) setRedirecting(true);

      const verifyReturn = async () => {
        const { data, error } = await supabase.auth.getUser();
        if (cancelled) return;
        if (data.user && !error) {
          if (timer) clearTimeout(timer);
          setRedirecting(true);
          return;
        }
        abortPendingOAuth(
          hasProviderResponse
            ? "La connexion Google n'a pas abouti. Veuillez réessayer."
            : undefined,
        );
      };

      void verifyReturn();
      // Limite ferme : même si la vérification réseau ne répond pas, la page
      // de connexion redevient utilisable et le marqueur obsolète est supprimé.
      timer = setTimeout(() => {
        abortPendingOAuth("La connexion Google n'a pas abouti. Veuillez réessayer.");
      }, 8000);
      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
    }

    void ensureSession().then((session) => {
      if (!cancelled && session?.user) setRedirecting(true);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const [mode, setMode] = useState<"signin" | "signup">(search.mode);
  const role: Role = search.role;
  const isPro = role === "pro";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const goClientHome = async (userId: string) => {
    const requestId = await tryPublishPendingDraft(userId);
    if (requestId) {
      toast.success("🎉 Votre demande a été publiée !");
      navigate({ to: "/demandes/$id", params: { id: requestId } });
      return;
    }
    const next = await resumeClientFlow(userId);
    if (next.kind === "request") {
      toast.success("🎉 Votre demande a été envoyée au professeur.");
      navigate({ to: "/demandes/$id", params: { id: next.id } });
      return;
    }
    if (next.kind === "need") {
      navigate({ to: "/mon-besoin" });
      return;
    }
    navigate({ to: "/demandes" });
  };

  const rememberRole = () => {
    try {
      localStorage.setItem(PENDING_ROLE_KEY, role);
    } catch {
      /* stockage indisponible */
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup") {
      if (!accepted) {
        toast.error("Vous devez accepter les conditions d'utilisation.");
        return;
      }
      if (password !== confirm) {
        toast.error("Les deux mots de passe ne correspondent pas.");
        return;
      }
      if (isPro && (!firstName.trim() || !lastName.trim() || !phone.trim())) {
        toast.error("Prénom, nom et téléphone sont obligatoires.");
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const result = await signUpWithEmail({
          data: {
            email,
            password,
            role,
            firstName,
            lastName,
            phone,
            origin: window.location.origin,
          },
        });
        if (!result.ok) {
          toast.error(
            result.reason === "already_registered"
              ? "Cette adresse email est déjà utilisée. Connectez-vous."
              : result.reason === "weak_password"
                ? "Mot de passe invalide : 8 caractères minimum."
                : result.reason === "send_failed"
                  ? "Compte créé, mais l'email de confirmation n'a pas pu être envoyé. Réessayez dans quelques minutes."
                  : (result.message?.trim() || "Création du compte impossible. Veuillez réessayer."),
          );
          return;
        }
        rememberRole();
        navigate({ to: "/verifier-email", search: { email } });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user && await isAdminUser(data.user.id)) navigate({ to: "/admin" });
        else if (isPro) navigate({ to: "/pro" });
        else if (data.user) await goClientHome(data.user.id);
        else navigate({ to: "/demandes" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    if (!email) {
      toast.error("Saisissez votre adresse email pour recevoir un lien.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail({ data: { email, origin: window.location.origin } });
      toast.success("Si un compte existe, un lien de réinitialisation vient d'être envoyé.");
    } catch {
      toast.error("Envoi impossible pour le moment. Veuillez réessayer.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const isExplicitSignup = mode === "signup";
    if (isExplicitSignup) {
      rememberRole();
      markOAuthPending(role);
    } else {
      consumeOAuthPending();
      clearPendingRole();
    }
    const result = await signInWithGoogle(isExplicitSignup ? role : undefined);
    if (result.error) {
      consumeOAuthPending();
      toast.error("Connexion Google impossible. Veuillez réessayer.");
      return;
    }
    if (result.redirected) return;
    // Session déjà établie (popup) : on route sans attendre le retour de page.
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      navigate({ to: "/demandes" });
      return;
    }
    consumeOAuthPending();
    if (await isAdminUser(user.id)) {
      navigate({ to: "/admin" });
      return;
    }
    const { role: accountRole, isNewAccount } = await ensureOAuthAccount(
      user,
      role,
      isExplicitSignup,
    );
    // Nouveau visiteur : il choisit son parcours avant de continuer.
    if (isNewAccount) {
      navigate({ to: "/choix-role" });
      return;
    }
    const target = await resolvePostAuthTarget(user.id, accountRole);
    if (target.kind === "admin") navigate({ to: "/admin" });
    else if (target.kind === "pro") navigate({ to: "/pro" });
    else if (target.kind === "pro-onboarding") navigate({ to: "/pro/inscription" });
    else if (target.kind === "request") {
      if (target.published) toast.success("🎉 Votre demande a été publiée !");
      navigate({ to: "/demandes/$id", params: { id: target.id } });
    } else if (target.kind === "need") navigate({ to: "/mon-besoin" });
    else navigate({ to: "/demandes" });
  };

  const field =
    "w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20";
  const labelCls =
    "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

  if (redirecting) {
    return (
      <div className="min-h-screen bg-background font-sans text-foreground">
        <SiteHeader />
        <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
          <span className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            Connexion en cours, ouverture de votre espace…
          </p>
          <button
            type="button"
            onClick={() => {
              consumeOAuthPending();
              clearPendingRole();
              setRedirecting(false);
            }}
            className="text-sm font-semibold text-primary underline underline-offset-2"
          >
            Ça prend trop de temps ? Revenir à la connexion
          </button>
        </main>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight">
          {mode === "signin"
            ? "Connexion"
            : isPro
              ? "Créer mon compte professeur"
              : "Créer un compte"}
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Connectez-vous pour accéder à votre espace."
            : isPro
              ? "Étape 1 sur 5 — votre compte. Vous compléterez ensuite votre profil professionnel."
              : "Compte élève / parent : publiez vos demandes et recevez des propositions."}
        </p>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-panel"
        >
          {mode === "signup" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className={labelCls} htmlFor="firstName">
                    Prénom
                  </label>
                  <input
                    id="firstName"
                    className={field}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    maxLength={80}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelCls} htmlFor="lastName">
                    Nom
                  </label>
                  <input
                    id="lastName"
                    className={field}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    maxLength={80}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className={labelCls} htmlFor="phone">
                  Numéro de téléphone
                </label>
                <input
                  id="phone"
                  type="tel"
                  className={field}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={30}
                  placeholder="06 12 34 56 78"
                  required={isPro}
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className={labelCls} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              required
            />
          </div>
          <div className="space-y-1">
            <label className={labelCls} htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              className={field}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">8 caractères minimum</p>
          </div>


          {mode === "signin" && (
            <button
              type="button"
              onClick={forgotPassword}
              disabled={busy}
              className="text-left text-sm font-semibold text-primary disabled:opacity-60"
            >
              Mot de passe oublié ?
            </button>
          )}

          {mode === "signup" && (
            <>
              <div className="space-y-1">
                <label className={labelCls} htmlFor="confirm">
                  Confirmation du mot de passe
                </label>
                <input
                  id="confirm"
                  type="password"
                  className={field}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border"
                  required
                />
                <span className="text-muted-foreground">
                  J'accepte les{" "}
                  <Link to="/conditions" target="_blank" className="font-medium text-primary underline underline-offset-2">
                    conditions d'utilisation
                  </Link>{" "}
                  <Link to="/confidentialite" target="_blank" className="font-medium text-primary underline underline-offset-2">
                    et la politique de confidentialité
                  </Link>
                  .
                </span>
              </label>
            </>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-60"
          >
            {mode === "signin" ? "Se connecter" : "Créer mon compte"}
          </button>
          <button
            type="button"
            onClick={google}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold hover:bg-muted"
          >
            <GoogleIcon className="size-4" />
            Continuer avec Google
          </button>
          <button
            type="button"
            className="w-full text-sm text-muted-foreground hover:text-primary"
            onClick={() => {
              if (mode === "signup") {
                setMode("signin");
              }
            }}
          >
            {mode === "signin" ? (
              <Link to="/inscription" className="font-semibold text-primary">
                Pas encore de compte ? Inscrivez-vous
              </Link>
            ) : (
              "Déjà inscrit ? Connectez-vous"
            )}
          </button>
        </form>

        {mode === "signup" && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/inscription" className="font-semibold text-primary">
              Changer de type de compte
            </Link>
          </p>
        )}
      </main>
    </div>
  );
}
