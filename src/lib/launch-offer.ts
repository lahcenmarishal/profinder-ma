import { supabase } from "@/integrations/supabase/client";

/** Nombre total de places de l'offre de lancement. */
export const LAUNCH_OFFER_SEATS = 300;

/** Durée de l'offre offerte aux professeurs vérifiés. */
export const LAUNCH_OFFER_MONTHS = 3;

export const LAUNCH_OFFER_TAGLINE =
  "Les 300 premiers professeurs vérifiés profitent de 3 mois de PRO gratuitement.";

export type LaunchGrant = {
  seat_number: number;
  granted_at: string;
  expires_at: string;
};

/** Places déjà attribuées (compteur public). */
export async function fetchLaunchSeatsUsed(): Promise<number> {
  const { data, error } = await supabase.rpc("launch_offer_seats_used");
  if (error) throw error;
  return data ?? 0;
}

/** Offre de lancement attribuée à ce professeur, si elle existe. */
export async function fetchLaunchGrant(professionalId: string): Promise<LaunchGrant | null> {
  const { data, error } = await supabase
    .from("launch_offer_grants")
    .select("seat_number, granted_at, expires_at")
    .eq("professional_id", professionalId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Jours restants avant la fin de l'offre (0 si terminée). */
export function daysLeft(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function isGrantActive(grant: LaunchGrant | null | undefined): boolean {
  return !!grant && new Date(grant.expires_at).getTime() > Date.now();
}

export function formatOfferDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
