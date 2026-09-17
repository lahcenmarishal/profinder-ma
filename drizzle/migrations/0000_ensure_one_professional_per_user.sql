CREATE UNIQUE INDEX IF NOT EXISTS professionals_user_id_unique_idx
ON public.professionals (user_id)
WHERE user_id IS NOT NULL;