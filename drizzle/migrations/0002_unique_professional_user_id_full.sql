DROP INDEX IF EXISTS public.professionals_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS professionals_user_id_uniq ON public.professionals (user_id);