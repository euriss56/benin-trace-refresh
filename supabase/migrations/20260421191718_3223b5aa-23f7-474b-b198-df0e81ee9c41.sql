-- Bucket privé pour les modèles ML sérialisés
INSERT INTO storage.buckets (id, name, public)
VALUES ('ml-models', 'ml-models', false)
ON CONFLICT (id) DO NOTHING;

-- Admins peuvent lister/lire
CREATE POLICY "Admins can read ml-models"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ml-models' AND public.has_role(auth.uid(), 'admin'));

-- Admins peuvent uploader
CREATE POLICY "Admins can upload ml-models"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ml-models' AND public.has_role(auth.uid(), 'admin'));

-- Admins peuvent mettre à jour
CREATE POLICY "Admins can update ml-models"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ml-models' AND public.has_role(auth.uid(), 'admin'));

-- Admins peuvent supprimer
CREATE POLICY "Admins can delete ml-models"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ml-models' AND public.has_role(auth.uid(), 'admin'));