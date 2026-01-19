-- Create websites table
CREATE TABLE public.websites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  custom_thumbnail_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;

-- Create policies for public viewing
CREATE POLICY "Anyone can view websites" 
ON public.websites 
FOR SELECT 
USING (true);

-- Create policies for authenticated management
CREATE POLICY "Anyone can insert websites" 
ON public.websites 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update websites" 
ON public.websites 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete websites" 
ON public.websites 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_websites_updated_at
BEFORE UPDATE ON public.websites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();