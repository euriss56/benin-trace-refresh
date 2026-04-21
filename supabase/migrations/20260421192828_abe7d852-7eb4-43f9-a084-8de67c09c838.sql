-- Enrichir imei_checks pour analytics : latence ML + zone géographique
ALTER TABLE public.imei_checks
  ADD COLUMN IF NOT EXISTS latency_ms integer,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'fallback';

-- Index pour agrégations rapides
CREATE INDEX IF NOT EXISTS idx_imei_checks_checked_at ON public.imei_checks (checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_imei_checks_result ON public.imei_checks (result);
CREATE INDEX IF NOT EXISTS idx_imei_checks_city ON public.imei_checks (city) WHERE city IS NOT NULL;