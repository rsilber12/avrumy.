import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import ScrollReveal from "@/components/ScrollReveal";

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["gallery-project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_projects")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: subImages } = useQuery({
    queryKey: ["gallery-project-images", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_project_images")
        .select("*")
        .eq("project_id", id)
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-secondary rounded w-24 mb-16" />
            <div className="aspect-video bg-secondary rounded-xl mb-8" />
            <div className="h-8 bg-secondary rounded w-1/2 mb-4" />
            <div className="h-4 bg-secondary rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background px-6 py-12 flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-light mb-4">Project not found</h1>
          <Link to="/design-gallery" className="text-muted-foreground hover:text-foreground">
            Back to gallery
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      {/* Back Navigation */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Link 
          to="/design-gallery" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-300 mb-16"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </Link>
      </motion.div>

      <div className="max-w-4xl mx-auto">
        {/* Main Image */}
        <ScrollReveal scale>
          <motion.img
            src={project.main_image_url}
            alt={project.title || "Project"}
            className="w-full h-auto rounded-xl mb-12"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.5 }}
          />
        </ScrollReveal>

        {/* Title and Description */}
        {(project.title || project.description) && (
          <ScrollReveal delay={0.2}>
            {project.title && (
              <h1 className="text-3xl md:text-4xl font-light tracking-normal mb-6">
                {project.title}
              </h1>
            )}
            {project.description && (
              <p className="text-muted-foreground text-lg leading-relaxed mb-16">
                {project.description}
              </p>
            )}
          </ScrollReveal>
        )}

        {/* Sub Images */}
        {subImages && subImages.length > 0 && (
          <div className="space-y-8">
            {subImages.map((image, index) => (
              <ScrollReveal key={image.id} delay={index * 0.1} scale>
                <motion.img
                  src={image.image_url}
                  alt={`Project image ${index + 1}`}
                  className="w-full h-auto rounded-xl"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.5 }}
                />
              </ScrollReveal>
            ))}
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

export default ProjectDetail;
