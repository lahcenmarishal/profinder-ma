import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Cache de session partagé par toute l'application.
 *
 * Sans ce cache, chaque page protégée relançait un appel réseau
 * (`auth.getUser()`) et chaque écran remontait un abonnement séparé : la
 * navigation entre les espaces repassait par un état « chargement » puis par la
 * page de connexion avant d'atteindre la destination. Ici la session est lue
 * une seule fois, puis maintenue à jour par un unique abonnement.
 */

type Listener = (session: Session | null, event: AuthChangeEvent | null) => void;

let cached: Session | null = null;
let resolved = false;
let pending: Promise<Session | null> | null = null;
let subscribed = false;
const listeners = new Set<Listener>();

function subscribe() {
  if (subscribed || typeof window === "undefined") return;
  subscribed = true;
  supabase.auth.onAuthStateChange((event, session) => {
    cached = session;
    resolved = true;
    pending = null;
    for (const listener of listeners) listener(session, event);
  });
}

/** Session déjà connue (synchrone), ou `undefined` si elle n'a pas encore été lue. */
export function knownSession(): Session | null | undefined {
  return resolved ? cached : undefined;
}

/** Session courante : instantanée si déjà connue, sinon une seule lecture partagée. */
export function ensureSession(): Promise<Session | null> {
  subscribe();
  if (resolved) return Promise.resolve(cached);
  pending ??= supabase.auth.getSession().then(({ data }) => {
    cached = data.session;
    resolved = true;
    pending = null;
    return cached;
  });
  return pending;
}

export function onSessionChange(listener: Listener): () => void {
  subscribe();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const adminCache = new Map<string, Promise<boolean>>();

/** Statut administrateur mis en cache par utilisateur (un seul appel par session). */
export function isAdminUser(userId: string): Promise<boolean> {
  const hit = adminCache.get(userId);
  if (hit) return hit;
  const query = (async () => {
    try {
      const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      return data === true;
    } catch {
      return false;
    }
  })();
  adminCache.set(userId, query);
  return query;
}


export function resetAuthCaches() {
  adminCache.clear();
}
