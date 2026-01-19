-- Music Artwork table (YouTube videos)
CREATE TABLE public.music_artworks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_url TEXT NOT NULL,
  youtube_video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Design Gallery Projects table
CREATE TABLE public.gallery_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  description TEXT,
  main_image_url TEXT NOT NULL,
  aspect_ratio DECIMAL(5,2) DEFAULT 1.0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Gallery Project Sub-images table
CREATE TABLE public.gallery_project_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.gallery_projects(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.music_artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_project_images ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables (gallery content is public)
CREATE POLICY "Anyone can view music artworks" 
ON public.music_artworks FOR SELECT USING (true);

CREATE POLICY "Anyone can view gallery projects" 
ON public.gallery_projects FOR SELECT USING (true);

CREATE POLICY "Anyone can view gallery project images" 
ON public.gallery_project_images FOR SELECT USING (true);

-- Public write access (no auth for admin - simple portfolio site)
CREATE POLICY "Anyone can insert music artworks" 
ON public.music_artworks FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update music artworks" 
ON public.music_artworks FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete music artworks" 
ON public.music_artworks FOR DELETE USING (true);

CREATE POLICY "Anyone can insert gallery projects" 
ON public.gallery_projects FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update gallery projects" 
ON public.gallery_projects FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete gallery projects" 
ON public.gallery_projects FOR DELETE USING (true);

CREATE POLICY "Anyone can insert gallery project images" 
ON public.gallery_project_images FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete gallery project images" 
ON public.gallery_project_images FOR DELETE USING (true);

-- Create storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true);

-- Storage policies for public access
CREATE POLICY "Anyone can view gallery images" 
ON storage.objects FOR SELECT USING (bucket_id = 'gallery');

CREATE POLICY "Anyone can upload gallery images" 
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gallery');

CREATE POLICY "Anyone can update gallery images" 
ON storage.objects FOR UPDATE USING (bucket_id = 'gallery');

CREATE POLICY "Anyone can delete gallery images" 
ON storage.objects FOR DELETE USING (bucket_id = 'gallery');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_music_artworks_updated_at
BEFORE UPDATE ON public.music_artworks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gallery_projects_updated_at
BEFORE UPDATE ON public.gallery_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();