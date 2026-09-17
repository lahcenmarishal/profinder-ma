import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ensureSession, isAdminUser, knownSession, onSessionChange } from "@/lib/auth-store";

export function useAuth() {
  // La session déjà connue évite un état « chargement » à chaque changement de page.
  const initial = knownSession();
  const [session, setSession] = useState<Session | null>(initial ?? null);
  const [loading, setLoading] = useState(initial === undefined);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onSessionChange((next, event) => {
      if (cancelled) return;
      setSession(next);
      setLoading(false);
      // Garantit une fiche profil (nom, téléphone) pour l'affichage dans la messagerie.
      if (event === "SIGNED_IN" && next?.user) {
        const meta = next.user.user_metadata ?? {};
        const row: { id: string; full_name?: string; phone?: string } = { id: next.user.id };
        if (typeof meta["full_name"] === "string" && meta["full_name"])
          row.full_name = meta["full_name"];
        if (typeof meta["phone"] === "string" && meta["phone"]) row.phone = meta["phone"];
        supabase.from("profiles").upsert(row).then(() => undefined);
      }
    });
    void ensureSession().then((next) => {
      if (cancelled) return;
      setSession(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const user: User | null = session?.user ?? null;

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    void isAdminUser(user.id).then((value) => {
      if (!cancelled) setIsAdmin(value);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { session, user, loading, isAdmin };
}
