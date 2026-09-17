import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Indique si l'utilisateur connecté possède une fiche professeur.
 * Un compte professeur ne peut ni publier une demande, ni contacter un confrère.
 */
export function useIsProfessional() {
  const { user, loading } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsPro(false);
      setChecking(loading);
      return;
    }
    let cancelled = false;
    setChecking(true);
    void supabase
      .from("professionals")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setIsPro(!!data);
        setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  return { isProfessional: isPro, checking };
}
