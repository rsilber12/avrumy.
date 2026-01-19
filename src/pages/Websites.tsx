import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { usePageVisit } from "@/hooks/useAnalytics";
import ScrollReveal from "@/components/ScrollReveal";
import GlowingCard from "@/components/GlowingCard";

const Websites = () => {
  usePageVisit("/websites");

  const { data: websites, isLoading } = useQuery({
    queryKey: ['websites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('websites')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      {/* Back Navigation */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-300 mb-16 group"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </Link>
      </motion.div>

      {/* Title */}
      <div className="max-w-6xl mx-auto mb-16">
        <motion.h1 
          className="text-4xl md:text-5xl lg:text-6xl font-light tracking-normal text-center"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          Websites
        </motion.h1>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-6xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map((item) => (
              <div key={item}>
                <div className="aspect-video bg-secondary rounded-xl animate-pulse" />
                <div className="h-4 bg-secondary rounded mt-4 w-3/4 animate-pulse" />
              </div>
            ))}
          </div>
        ) : websites && websites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {websites.map((website, index) => (
              <ScrollReveal
                key={website.id}
                delay={index * 0.1}
                scale
                direction={index % 2 === 0 ? "left" : "right"}
              >
                <GlowingCard className="rounded-xl">
                  <a
                    href={website.url.startsWith('http') ? website.url : `https://${website.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block"
                  >
                    <motion.div 
                      className="aspect-video bg-muted rounded-xl overflow-hidden mb-4"
                      whileTap={{ scale: 0.98 }}
                    >
                      <motion.img
                        src={website.custom_thumbnail_url || website.thumbnail_url || '/placeholder.svg'}
                        alt={website.title}
                        className="w-full h-full object-cover"
                        whileHover={{ scale: 1.08 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </motion.div>
                    <p className="text-foreground text-sm font-light tracking-wide group-hover:text-muted-foreground transition-colors duration-300">
                      {website.title}
                    </p>
                  </a>
                </GlowingCard>
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            No websites yet
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-muted-foreground text-sm mt-20">
        © {new Date().getFullYear()} Avrumy, LLC
      </footer>
    </div>
  );
};

export default Websites;
