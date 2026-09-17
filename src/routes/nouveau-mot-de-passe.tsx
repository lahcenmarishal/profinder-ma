import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site";

export const Route = createFileRoute("/nouveau-mot-de-passe")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — ProFinder" },
      {
        name: "description",
        content: "Choisissez un nouveau mot de passe pour votre compte ProFinder.",
      },
      { property: "og:title", content: "Nouveau mot de passe — ProFinder" },
      {
        property: "og:description",
        content: "Réinitialisez le mot de passe de votre compte ProFinder en toute sécurité.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: NewPasswordPage,
});

function NewPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  // Le lien reçu par email porte le jeton de récupération : on ouvre la session
  // correspondante avant d'autoriser le changement de mot de passe.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash") ?? url.searchParams.get("token");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (code) await supabase.auth.exchangeCodeForSession(code);
      else if (accessToken && refreshToken)
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      else if (tokenHash) await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        window.history.replaceState(null, document.title, url.pathname);
        setReady(true);
      } else {
        setInvalid(true);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Mot de passe mis à jour.");
    navigate({ to: "/demandes" });
  };

  const field = "w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm";

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-panel">
          <KeyRound className="mx-auto h-10 w-10 text-primary" aria-hidden />
          <h1 className="mt-4 text-center text-2xl font-extrabold tracking-tight">
            Nouveau mot de passe
          </h1>

          {!ready && !invalid && (
            <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Vérification du lien…
            </p>
          )}

          {invalid && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Ce lien de réinitialisation est invalide ou expiré. Demandez-en un nouveau depuis la
              page de connexion.
            </p>
          )}

          {ready && (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="pwd">
                  Nouveau mot de passe
                </label>
                <input
                  id="pwd"
                  type="password"
                  className={field}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="pwd2">
                  Confirmation
                </label>
                <input
                  id="pwd2"
                  type="password"
                  className={field}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                Enregistrer
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
