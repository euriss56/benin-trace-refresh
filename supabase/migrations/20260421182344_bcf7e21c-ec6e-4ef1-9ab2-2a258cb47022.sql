-- Roles enum with all 5 roles
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'dealer', 'technicien', 'enqueteur');

-- user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'dealer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  marche TEXT DEFAULT 'Autre',
  type_activite TEXT DEFAULT 'revente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- stolen_phones
CREATE TABLE public.stolen_phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  imei TEXT NOT NULL CHECK (length(imei) = 15 AND imei ~ '^\d{15}$'),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT,
  theft_date DATE NOT NULL,
  city TEXT NOT NULL,
  description TEXT,
  photo_urls TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected','stolen')),
  case_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stolen_phones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can search stolen phones" ON public.stolen_phones FOR SELECT USING (true);
CREATE POLICY "Insert own declarations" ON public.stolen_phones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update declarations" ON public.stolen_phones FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- imei_checks
CREATE TABLE public.imei_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  imei TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('safe','suspect','stolen')),
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.imei_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own checks" ON public.imei_checks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert checks" ON public.imei_checks FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Admins view all checks" ON public.imei_checks FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- police_reports
CREATE TABLE public.police_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_id UUID NOT NULL REFERENCES public.stolen_phones(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  report_status TEXT NOT NULL DEFAULT 'signalé',
  police_reference TEXT,
  notes TEXT,
  notified_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.police_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own reports" ON public.police_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all reports" ON public.police_reports FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Enqueteurs view all reports" ON public.police_reports FOR SELECT USING (public.has_role(auth.uid(), 'enqueteur'));
CREATE POLICY "Admins update reports" ON public.police_reports FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated create reports" ON public.police_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_police_reports_updated_at BEFORE UPDATE ON public.police_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- police_contacts
CREATE TABLE public.police_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  commissioner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.police_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view contacts" ON public.police_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert contacts" ON public.police_contacts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update contacts" ON public.police_contacts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete contacts" ON public.police_contacts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_police_contacts_updated_at BEFORE UPDATE ON public.police_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ml_training_logs
CREATE TABLE public.ml_training_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  model_name TEXT NOT NULL DEFAULT 'imei-risk-model',
  accuracy DOUBLE PRECISION,
  loss DOUBLE PRECISION,
  epochs INTEGER NOT NULL DEFAULT 0,
  training_samples INTEGER NOT NULL DEFAULT 0,
  duration_seconds DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'started',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ml_training_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view training logs" ON public.ml_training_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert training logs" ON public.ml_training_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, phone, marche, type_activite)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'marche', 'Autre'),
    COALESCE(NEW.raw_user_meta_data->>'type_activite', 'revente')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'dealer'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- generate_case_number helper
CREATE OR REPLACE FUNCTION public.generate_case_number()
RETURNS TEXT LANGUAGE plpgsql SET search_path = public AS $$
DECLARE case_num TEXT;
BEGIN
  case_num := 'TP-BJ-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN case_num;
END;
$$;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('phone-photos', 'phone-photos', true);

CREATE POLICY "Auth upload phone photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'phone-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone view phone photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'phone-photos');
CREATE POLICY "Delete own phone photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'phone-photos' AND auth.uid()::text = (storage.foldername(name))[1]);