CREATE OR REPLACE FUNCTION public.grant_launch_offer_on_verified()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  used integer;
  seat integer;
BEGIN
  -- Offre réservée aux professeurs dont la vérification est validée en administration.
  IF NEW.verification_status <> 'verified' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.verification_status = 'verified' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.launch_offer_grants WHERE professional_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Maximum 300 places.
  SELECT count(*)::int INTO used FROM public.launch_offer_grants;
  IF used >= 300 THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(max(seat_number), 0) + 1 INTO seat FROM public.launch_offer_grants;

  -- Durée de l'offre : 12 mois.
  INSERT INTO public.launch_offer_grants (professional_id, seat_number, granted_at, expires_at)
  VALUES (NEW.id, seat, now(), now() + interval '12 months')
  ON CONFLICT DO NOTHING;

  NEW.plan_code := 'pro';
  NEW.is_verified := true;
  RETURN NEW;
END;
$function$;