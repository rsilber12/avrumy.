import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { usePageVisit, trackEmailClick } from "@/hooks/useAnalytics";

const Contact = () => {
  usePageVisit("/contact");

  const handleEmailClick = () => {
    trackEmailClick();
  };

  return (
    <div className="min-h-screen bg-background px-6 py-12 flex flex-col">
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
          <span className="text-sm">← Back</span>
        </Link>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto text-center">
        <motion.h1 
          className="text-4xl md:text-5xl lg:text-6xl font-light tracking-normal mb-12"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          Get in Touch
        </motion.h1>

        <motion.div 
          className="space-y-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-muted-foreground text-lg md:text-xl font-light leading-relaxed">
            We'd love to hear about your project.
            <br />
            Let's create something beautiful together.
          </p>

          <motion.a 
            href="mailto:mail@avrumy.com" 
            onClick={handleEmailClick}
            className="inline-block text-foreground text-xl md:text-2xl font-light tracking-wide hover:text-muted-foreground transition-colors duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            mail@avrumy.com
          </motion.a>
        </motion.div>

        {/* Location */}
        <motion.div 
          className="mt-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-muted-foreground text-sm mb-2">Based in</p>
          <p className="text-foreground text-lg font-light">
            New York City
          </p>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer 
        className="text-center text-muted-foreground text-sm mt-auto pt-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        © {new Date().getFullYear()} Avrumy, LLC
      </motion.footer>
    </div>
  );
};

export default Contact;
