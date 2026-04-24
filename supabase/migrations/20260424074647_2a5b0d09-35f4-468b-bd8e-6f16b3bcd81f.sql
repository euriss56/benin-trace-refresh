-- Table des quartiers de Cotonou avec centroïdes (niveau quartier uniquement)
-- Conforme à la loi béninoise n° 2017-20 : aucune coordonnée GPS exacte
CREATE TABLE public.neighborhoods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  city text NOT NULL DEFAULT 'Cotonou',
  centroid_lat double precision NOT NULL,
  centroid_lng double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour authentifiés (utilisé par /declare et /map)
CREATE POLICY "Authenticated read neighborhoods"
  ON public.neighborhoods FOR SELECT
  TO authenticated
  USING (true);

-- Seuls les admins peuvent gérer
CREATE POLICY "Admins manage neighborhoods"
  ON public.neighborhoods FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed des principaux quartiers de Cotonou (centroïdes approximatifs, niveau quartier)
INSERT INTO public.neighborhoods (name, centroid_lat, centroid_lng) VALUES
  ('Missèbo',    6.3700, 2.4300),
  ('Dantokpa',   6.3690, 2.4280),
  ('Cadjèhoun',  6.3540, 2.3950),
  ('Vèdoko',     6.3780, 2.3850),
  ('Akpakpa',    6.3650, 2.4500),
  ('Fidjrossè',  6.3500, 2.3700),
  ('Agla',       6.3850, 2.3650),
  ('Houéyiho',   6.3720, 2.4050),
  ('Sainte-Rita',6.3620, 2.4150),
  ('Zogbo',      6.3680, 2.4000),
  ('Godomey',    6.3950, 2.3400),
  ('Cotonou-Centre', 6.3654, 2.4183);

-- Ajouter colonne neighborhood_id à stolen_phones pour la carte
ALTER TABLE public.stolen_phones
  ADD COLUMN IF NOT EXISTS neighborhood_id uuid REFERENCES public.neighborhoods(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stolen_phones_neighborhood ON public.stolen_phones(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_stolen_phones_created_at ON public.stolen_phones(created_at);