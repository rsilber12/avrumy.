-- Analytics table for page visits
CREATE TABLE public.page_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL,
  country TEXT,
  city TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email clicks tracking
CREATE TABLE public.email_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_clicks ENABLE ROW LEVEL SECURITY;

-- Public insert (for tracking)
CREATE POLICY "Anyone can insert page visits" 
ON public.page_visits FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert email clicks" 
ON public.email_clicks FOR INSERT WITH CHECK (true);

-- Only authenticated can read (for admin)
CREATE POLICY "Authenticated users can view page visits" 
ON public.page_visits FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view email clicks" 
ON public.email_clicks FOR SELECT TO authenticated USING (true);